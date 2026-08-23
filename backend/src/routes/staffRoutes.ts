import { Router } from "express";
import * as staffController from "../controllers/staffController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createStaffSchema, updateStaffSchema, listStaffSchema } from "../validators/staff.validator.js";

const router = Router();

router.use(authenticate);

// Read-only: reception also needs the doctor roster for booking/calendar/waitlist screens.
router.get("/", authorize("ADMIN", "RECEPTIONIST"), validate(listStaffSchema), staffController.listStaff);
router.post("/", authorize("ADMIN"), validate(createStaffSchema), staffController.createStaff);
router.patch("/:id", authorize("ADMIN"), validate(updateStaffSchema), staffController.updateStaff);
router.delete("/:id", authorize("ADMIN"), staffController.removeStaff);

export default router;
