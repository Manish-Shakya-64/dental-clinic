import { Router } from "express";
import * as patientController from "../controllers/patientController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createPatientSchema, updatePatientSchema, listPatientsSchema } from "../validators/patient.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("RECEPTIONIST", "ADMIN"), validate(listPatientsSchema), patientController.listPatients);
router.post("/", authorize("RECEPTIONIST", "ADMIN"), validate(createPatientSchema), patientController.createPatient);
router.get("/:id", authorize("RECEPTIONIST", "ADMIN", "DOCTOR", "PATIENT"), patientController.getPatient);
router.patch(
  "/:id",
  authorize("RECEPTIONIST", "ADMIN", "PATIENT"),
  validate(updatePatientSchema),
  patientController.updatePatient,
);

export default router;
