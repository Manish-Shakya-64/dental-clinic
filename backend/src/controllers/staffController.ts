import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import bcrypt from "bcrypt";
import { User, IUser } from "../models/User.js";
import { StaffMember } from "../models/StaffMember.js";
import { Practitioner } from "../models/Practitioner.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/apiError.js";
import { blindIndex } from "../utils/blindIndex.js";
import { logAudit } from "../middleware/auditLogger.js";

const SALT_ROUNDS = 12;

/** Unified list for the Admin staff-management screen — Doctor and Receptionist/Admin accounts live
 *  in separate collections (Practitioner / StaffMember), joined here through the User that links them
 *  so the frontend gets one flat row per account, keyed by the User id that PATCH/DELETE expect.
 *  `search` matches against first/last name — those live on the joined Practitioner/StaffMember
 *  documents (plaintext, unlike Patient names), so it's resolved as a first pass before the
 *  paginated User query. */
export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as {
    role?: "DOCTOR" | "RECEPTIONIST" | "ADMIN";
    is_active?: boolean;
    search?: string;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<IUser> = { role: { $in: ["DOCTOR", "RECEPTIONIST", "ADMIN"] } };
  if (query.role) filter.role = query.role;
  if (query.is_active !== undefined) filter.is_active = query.is_active;

  if (query.search?.trim()) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [matchingPractitioners, matchingStaff] = await Promise.all([
      Practitioner.find({ $or: [{ first_name: regex }, { last_name: regex }] }).select("_id"),
      StaffMember.find({ $or: [{ first_name: regex }, { last_name: regex }] }).select("_id"),
    ]);
    filter.$or = [
      { practitioner: { $in: matchingPractitioners.map((p) => p._id) } },
      { staff: { $in: matchingStaff.map((s) => s._id) } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate("practitioner")
      .populate("staff")
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    User.countDocuments(filter),
  ]);

  type PopulatedPractitioner = {
    _id: { toString(): string };
    first_name: string;
    middle_name?: string;
    last_name?: string;
    gender: string;
    phone?: string;
    specialties: string[];
    working_hours: unknown;
    profile_image?: string | null;
  };
  type PopulatedStaff = {
    first_name: string;
    middle_name?: string;
    last_name?: string;
    gender: string;
    phone?: string;
    profile_image?: string | null;
  };

  const rows = users.map((user) => {
    const isDoctor = user.role === "DOCTOR";
    const practitioner = isDoctor ? (user.practitioner as unknown as PopulatedPractitioner) : null;
    const staff = !isDoctor ? (user.staff as unknown as PopulatedStaff) : null;
    const person = practitioner ?? staff;

    return {
      id: user._id.toString(),
      /** The Practitioner document id — distinct from `id` (the User id) — needed wherever a
       *  doctor is referenced as a Practitioner (e.g. creating a Slot). Undefined for non-doctors. */
      practitionerId: practitioner ? practitioner._id.toString() : undefined,
      role: user.role,
      first_name: person?.first_name ?? "",
      middle_name: person?.middle_name,
      last_name: person?.last_name,
      gender: person?.gender,
      email: user.email,
      phone: person?.phone ?? "",
      profile_image: person?.profile_image,
      specialties: practitioner?.specialties,
      working_hours: practitioner?.working_hours,
      is_active: user.is_active,
    };
  });

  res.json({
    data: rows,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

/** Creates a Doctor (Practitioner) or Receptionist/Admin (StaffMember) account, plus the linked
 *  User login. §5 keeps Practitioner and StaffMember as separate models, so this branches on role. */
export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const { first_name, middle_name, last_name, gender, email, password, phone, role, specialties, working_hours } = req.body;

  const existing = await User.findOne({ email_hash: blindIndex(email) });
  if (existing) throw new ConflictError("An account with this email already exists");

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  if (role === "DOCTOR") {
    const practitioner = await Practitioner.create({
      first_name,
      middle_name,
      last_name,
      gender,
      phone,
      specialties: specialties ?? [],
      working_hours: working_hours ?? {},
    });
    const user = await User.create({ email, password_hash, role: "DOCTOR", practitioner: practitioner._id });

    await logAudit({ req, action: "STAFF_CREATED", resourceType: "Practitioner", resourceId: practitioner._id.toString(), status: "SUCCESS" });
    res.status(201).json({ data: { id: user._id.toString(), role, practitioner } });
    return;
  }

  const staff = await StaffMember.create({ first_name, middle_name, last_name, gender, email, phone, role });
  const user = await User.create({ email, password_hash, role, staff: staff._id });

  await logAudit({ req, action: "STAFF_CREATED", resourceType: "StaffMember", resourceId: staff._id.toString(), status: "SUCCESS" });
  res.status(201).json({ data: { id: user._id.toString(), role, staff } });
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { first_name, middle_name, last_name, gender, email, phone, specialties, working_hours, is_active } = req.body;

  const user = await User.findById(id);
  if (!user || (user.role !== "DOCTOR" && user.role !== "RECEPTIONIST" && user.role !== "ADMIN")) {
    throw new NotFoundError("Staff account not found");
  }

  if (is_active !== undefined) user.is_active = is_active;

  if (user.role === "DOCTOR") {
    const practitioner = await Practitioner.findById(user.practitioner);
    if (!practitioner) throw new NotFoundError("Practitioner record not found");
    if (first_name !== undefined) practitioner.first_name = first_name;
    if (middle_name !== undefined) practitioner.middle_name = middle_name;
    if (last_name !== undefined) practitioner.last_name = last_name;
    if (gender !== undefined) practitioner.gender = gender;
    if (phone !== undefined) practitioner.phone = phone;
    if (specialties !== undefined) practitioner.specialties = specialties;
    if (working_hours !== undefined) practitioner.working_hours = working_hours;
    if (is_active !== undefined) practitioner.is_active = is_active;
    await practitioner.save();

    const wasActivated = is_active === true;
    const wasDeactivated = is_active === false;
    await user.save();
    await logAudit({ req, action: "STAFF_UPDATED", resourceType: "Practitioner", resourceId: practitioner._id.toString(), status: "SUCCESS" });
    if (wasActivated) await logAudit({ req, action: "STAFF_ACTIVATED", resourceType: "Practitioner", resourceId: practitioner._id.toString(), status: "SUCCESS" });
    if (wasDeactivated) await logAudit({ req, action: "STAFF_DEACTIVATED", resourceType: "Practitioner", resourceId: practitioner._id.toString(), status: "SUCCESS" });

    res.json({ data: { id: user._id.toString(), role: user.role, practitioner } });
    return;
  }

  const staff = await StaffMember.findById(user.staff);
  if (!staff) throw new NotFoundError("Staff record not found");
  if (first_name !== undefined) staff.first_name = first_name;
  if (middle_name !== undefined) staff.middle_name = middle_name;
  if (last_name !== undefined) staff.last_name = last_name;
  if (gender !== undefined) staff.gender = gender;
  if (email !== undefined) staff.email = email;
  if (phone !== undefined) staff.phone = phone;
  if (is_active !== undefined) staff.is_active = is_active;
  await staff.save();
  await user.save();

  await logAudit({ req, action: "STAFF_UPDATED", resourceType: "StaffMember", resourceId: staff._id.toString(), status: "SUCCESS" });
  if (is_active === true) await logAudit({ req, action: "STAFF_ACTIVATED", resourceType: "StaffMember", resourceId: staff._id.toString(), status: "SUCCESS" });
  if (is_active === false) await logAudit({ req, action: "STAFF_DEACTIVATED", resourceType: "StaffMember", resourceId: staff._id.toString(), status: "SUCCESS" });

  res.json({ data: { id: user._id.toString(), role: user.role, staff } });
});

export const removeStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new NotFoundError("Staff account not found");
  if (user.role !== "DOCTOR" && user.role !== "RECEPTIONIST" && user.role !== "ADMIN") {
    throw new ValidationError("Not a staff account");
  }

  const resourceType = user.role === "DOCTOR" ? "Practitioner" : "StaffMember";
  const resourceId = (user.role === "DOCTOR" ? user.practitioner : user.staff)?.toString();

  if (user.role === "DOCTOR") {
    await Practitioner.findByIdAndDelete(user.practitioner);
  } else {
    await StaffMember.findByIdAndDelete(user.staff);
  }
  await User.findByIdAndDelete(id);

  await logAudit({ req, action: "STAFF_REMOVED", resourceType, resourceId, status: "SUCCESS" });
  res.status(204).send();
});
