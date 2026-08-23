# Dental Clinic Backend

Backend API for the Dental Clinic Appointment Booking & Reminder System — Node.js/TypeScript (ESM), Express, MongoDB/Mongoose, JWT auth with RBAC, field-level encryption, append-only audit logging, and background reminder/recall jobs.

Built from `claude-code-backend-spec.md`, which explicitly says: *"Where a decision isn't specified, choose the most conventional, secure option ... and note the choice in the README rather than asking."* This document is that note — see **Decisions not fully specified** below for every place this implementation had to choose.

## Setup

```bash
npm install
cp .env.example .env      # then fill in real secrets — see below
npm run dev                # tsx watch, http://localhost:4000
```

### Required environment variables

See `.env.example` for the full list with comments. The two that need generating rather than guessing:

```bash
# DATA_ENCRYPTION_KEY — 32 random bytes, base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / BLIND_INDEX_SECRET — any 32+ char random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`config/env.ts` validates all of these at startup with Zod and exits immediately if anything required is missing or malformed (including checking `DATA_ENCRYPTION_KEY` actually decodes to 32 bytes).

### Seed data

```bash
npm run seed
```

Populates synthetic dev data — 1 Admin, 2 Receptionists, 3 Doctors, 2 Rooms, 6 Treatments (AU dental pricing), 12 Patients, a spread of Slots and Appointments across past/present/future covering most of the status lifecycle. Prints login credentials to the console (refuses to run if `NODE_ENV=production`).

### Tests

```bash
npm test
```

Runs `tests/encryption.test.ts`, `tests/auth.test.ts`, `tests/booking.test.ts`, `tests/audit.test.ts` against a **real local MongoDB** using a dedicated `dental_clinic_test` database (configured via `.env.test`, already checked in with dummy secrets — safe, it's not talking to anything real). Requires a MongoDB instance reachable at the `MONGODB_URI` in `.env.test` (defaults to `mongodb://localhost:27017`).

## Decisions not fully specified by the build spec

### Response envelope: `success` flag
Every JSON response — success or error, from any route — carries a top-level `success: true|false`, in addition to the spec's `{ data: ... }` / `{ error: { message, code, fields? } }` shapes (§12.1). Implemented as one middleware (`middleware/responseWrapper.ts`) that patches `res.json` early in `app.ts`'s chain and derives `success` from the status code (`< 400` → `true`), rather than editing every controller's `res.json(...)` call individually. Binary responses (`GET /bills/:id/pdf`, `GET /profile/image`) are untouched since they never call `res.json`.

### Module system & imports
ESM throughout (`"type": "module"`, `tsconfig` `module`/`moduleResolution: "NodeNext"`). Every relative import ends in `.js`, even though the source is `.ts` — this is the NodeNext ESM convention, not a typo.

### Password hashing
`bcrypt` (native), per the spec. This environment blocks npm install-scripts by default (native builds, binary downloads); `bcrypt`'s build and `mongodb-memory-server`'s binary download were explicitly approved via `npm install-scripts approve <pkg>` (recorded in `package.json`'s `allowScripts` block) rather than substituted for pure-JS alternatives.

### Field encryption timing (`utils/fieldEncryptionPlugin.ts`)
Encrypts on **`pre('validate')`**, not `pre('save')` — Mongoose runs schema validation (including `required` checks like `email_hash`) *before* `save` hooks fire, so computing the blind-index hash and ciphertext in `pre('save')` is one step too late and fails validation on every write. `post('save')` decrypts fields back to plaintext in memory (via `$locals`, scoped per write); `post('init')` decrypts every document hydrated from a query. **`.lean()` must never be used on models carrying this plugin** — it bypasses `init` and would leak ciphertext. `blindIndex()` normalizes (trim + lowercase) internally so every call site hashes consistently.

`Patient.dob` is stored as an encrypted ISO date string (`"1990-05-14"`), not a native `Date` — encryption only applies to string fields; the API boundary coerces to/from `Date` via Zod (`z.coerce.date()`).

### Slot uniqueness & MongoDB partial-index limitation
The spec calls for a unique index on `(practitioner, room, start_time)` excluding cancelled/expired/no-show appointments. MongoDB partial-index filter expressions only support `$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, and top-level `$and` — **not** `$nin`/`$ne`/`$in`/`$or`. An index built with `{ status: { $nin: [...] } }` fails to build (silently, under Mongoose's default background index creation — this was actually broken until caught by `syncIndexes()` in the test setup). Fixed with the standard workaround: a derived `Appointment.is_blocking_slot` boolean, kept in sync by a `pre('save')` hook whenever `status` changes, with the partial filter expressed as `{ is_blocking_slot: { $eq: true } }`.

### DRAFT is a crash-safety window, not a client-visible step
`POST /appointments` inserts as `DRAFT` with `lock_token`/`lock_expires_at`, then immediately promotes to `CONFIRMED` in the same request. `lockExpiryJob` only sweeps appointments that got stuck in `DRAFT` because the process died mid-request — normal bookings never observe `DRAFT`.

### Auth token invalidation & session state
Added `User.token_version` (not in the spec's literal field list) so logout and password-reset can invalidate previously issued refresh tokens — increment on either action; the refresh JWT payload carries `tokenVersion`, checked against the current value on every `/auth/refresh` call. `authenticate.ts` also re-checks `User.is_active` (and role) from the DB on every request, since a stateless JWT alone can't reflect a mid-lifetime deactivation. Tokens are returned in the JSON response body, not cookies (no frontend built yet in this task).

### Endpoints added beyond the spec's summary table
The spec says its endpoint table is a "summary," and a few routes were needed to make the described functional requirements actually work:
- `POST /auth/register` — patient self-registration. The spec has no signup route anywhere, but §2.2/§4.1 require patients to have accounts. Staff/Doctor accounts are still Admin-only via `POST /staff`.
- `POST /patients`, `GET /patients` — Receptionist/Admin creating a walk-in patient record and searching by exact email/phone (via blind index — encrypted fields can't support partial/free-text search server-side, so there's no search-by-name).
- `GET /slots` — browsing open availability before booking (§4.1), read-only, any authenticated user.
- `GET /doctors/:id/calendar` — implemented in `appointmentController` (no dedicated doctor controller in the spec's file tree) and mounted directly in `routes/index.ts`.
- `GET /health` — unauthenticated liveness check.
- `POST /profile/image`, `GET /profile/image`, `DELETE /profile/image` — profile picture upload/view/delete (see below; requested after the initial build, not part of the original spec at all).

### Profile images
Not in the spec. `multer` (memory storage, 5MB limit, jpeg/png/webp only) parses the upload; `services/profileImageService.ts` writes it to `backend/uploads/profile-images/` under a server-generated `crypto.randomUUID()` filename — the client's original filename is never used for anything touching the filesystem, and the directory sits outside any statically-served path, so the only way to read a file back is the authenticated `GET /profile/image` route (streams the caller's own image via `res.sendFile`, resolved from their DB-stored filename, never from client input). `Patient`, `Practitioner`, and `StaffMember` all get a `profile_image` field through the same unified `/profile` endpoints that already handle `name`/`email`/`phone` per role — Receptionist/Admin accounts get one too, for consistency with how the rest of that endpoint already treats all three account types uniformly, not just Patient/Doctor.

Chosen over cloud storage (S3/etc.) because the spec doesn't mention external storage anywhere and this project has no cloud credentials configured — local disk is the "most conventional option" for a dev/academic-prototype deployment, at the cost of not surviving a redeploy on most hosting platforms. `uploads/` is gitignored. Uploading replaces (deletes) any previous image; `PROFILE_IMAGE_UPLOADED`/`PROFILE_IMAGE_DELETED` audit entries are written alongside the existing `PROFILE_UPDATED` action.

### Staff vs. Practitioner accounts
`POST /staff` branches on the requested `role`: `DOCTOR` creates a `Practitioner` + `User`; `RECEPTIONIST`/`ADMIN` creates a `StaffMember` + `User`. The spec keeps `Practitioner` and `StaffMember` as separate models (§5) but only defines one `/staff` endpoint family (§10) and groups "Doctor and Receptionist" account management together in the architecture doc — this is the reconciliation of those two facts. `DELETE /staff/:id` is a true hard delete of the account, distinct from `PATCH .../activate`/`deactivate` (a soft `is_active` toggle) — the spec lists them as separate actions with separate semantics.

### Billing & checkout lifecycle
`POST /appointments/:id/bill` snapshots the treatment price and sets `BILLED`. `POST /bills/:id/email` is treated as the checkout-completing action (matches the architecture doc's "prints it, and emails a copy ... at checkout" as one step): it emails the PDF, sets `CHECKED_OUT`, creates the `Recall`, and immediately moves to `RECALL_SCHEDULED` — satisfying the required `BILLED → CHECKED_OUT → RECALL_SCHEDULED` sequence. `GET /bills/:id/pdf` generates the PDF on demand (not persisted to disk).

### Waitlist matching
`PATCH /appointments/:id` with `{ action: "cancel" }` returns matched waitlist candidates in the response body (`data.waitlistMatches`) rather than auto-booking — "surfaced for staff to confirm," per §9, with no separately persisted match record.

### Email / SMS in development
If `SMTP_HOST` / `TWILIO_ACCOUNT_SID` are unset, `emailService`/`smsService` log the message via pino instead of throwing, so `npm run dev` and `npm run seed` work without real provider credentials.

### Test database
`mongodb-memory-server` is an installed devDependency but the actual test suite (`tests/helpers/db.ts`) connects to a real local MongoDB with a dedicated `dental_clinic_test` database instead — this sandboxed dev environment didn't have network access confirmed for the in-memory server's binary download at test-run time. Swap `tests/helpers/db.ts` for `mongodb-memory-server` if that's preferred once binaries are cached/available. Tests run with Jest `maxWorkers: 1` (serial) since all four suites share this one real database rather than isolated per-worker instances — running them in parallel causes one file's `clearTestDb()` to wipe another file's in-flight data.

## Project structure

Follows the spec's `/backend/src/{config,models,middleware,controllers,routes,services,jobs,utils}` layout exactly (§2), plus `/tests` and `/scripts/seed.ts`.
