import { Router } from "express";
import * as waitlistController from "../controllers/waitlistController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { joinWaitlistSchema, offerSlotSchema } from "../validators/waitlist.validator.js";
import { authLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// Public, token-authenticated: the patient following the link in their offer email may not be
// signed in. Rate-limited like the other token endpoints so the tokens can't be brute-forced.
router.get("/offers/:token", authLimiter, waitlistController.viewOffer);
router.post("/offers/:token/accept", authLimiter, waitlistController.acceptOffer);
router.post("/offers/:token/decline", authLimiter, waitlistController.declineOffer);

router.use(authenticate);

router.post("/", authorize("PATIENT", "RECEPTIONIST", "ADMIN"), validate(joinWaitlistSchema), waitlistController.joinWaitlist);
router.get("/", authorize("RECEPTIONIST", "ADMIN"), waitlistController.listWaitlist);
router.post("/:id/offer", authorize("RECEPTIONIST", "ADMIN"), validate(offerSlotSchema), waitlistController.offerSlot);
router.post("/:id/send-offer", authorize("RECEPTIONIST", "ADMIN"), validate(offerSlotSchema), waitlistController.sendOffer);
router.delete("/:id", authorize("RECEPTIONIST", "ADMIN"), waitlistController.removeEntry);

export default router;
