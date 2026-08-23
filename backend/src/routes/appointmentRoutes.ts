import { Router } from "express";
import * as appointmentController from "../controllers/appointmentController.js";
import * as billController from "../controllers/billController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  createAppointmentSchema,
  patchAppointmentSchema,
  listAppointmentsSchema,
  addNoteSchema,
  addMedicineSchema,
} from "../validators/appointment.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(listAppointmentsSchema), appointmentController.listAppointments);
router.get("/:id", appointmentController.getAppointment);
router.post(
  "/",
  authorize("PATIENT", "RECEPTIONIST", "ADMIN"),
  validate(createAppointmentSchema),
  appointmentController.createAppointment,
);
router.patch("/:id", validate(patchAppointmentSchema), appointmentController.patchAppointment);
router.post("/:id/notes", authorize("DOCTOR"), validate(addNoteSchema), appointmentController.addNote);
router.post("/:id/medicines", authorize("DOCTOR"), validate(addMedicineSchema), appointmentController.addMedicine);
router.post("/:id/bill", authorize("RECEPTIONIST", "ADMIN"), billController.generateBill);
router.post("/:id/checkout", authorize("RECEPTIONIST", "ADMIN"), appointmentController.checkoutAppointment);

export default router;
