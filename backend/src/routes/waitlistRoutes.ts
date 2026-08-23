import { Router } from "express";
import * as waitlistController from "../controllers/waitlistController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { joinWaitlistSchema, offerSlotSchema } from "../validators/waitlist.validator.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize("PATIENT", "RECEPTIONIST", "ADMIN"), validate(joinWaitlistSchema), waitlistController.joinWaitlist);
router.get("/", authorize("RECEPTIONIST", "ADMIN"), waitlistController.listWaitlist);
router.post("/:id/offer", authorize("RECEPTIONIST", "ADMIN"), validate(offerSlotSchema), waitlistController.offerSlot);
router.delete("/:id", authorize("RECEPTIONIST", "ADMIN"), waitlistController.removeEntry);

export default router;
