import { Router } from "express";
import * as treatmentController from "../controllers/treatmentController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createTreatmentSchema, updateTreatmentSchema } from "../validators/treatment.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", treatmentController.listTreatments);
router.post("/", authorize("ADMIN"), validate(createTreatmentSchema), treatmentController.createTreatment);
router.patch("/:id", authorize("ADMIN"), validate(updateTreatmentSchema), treatmentController.updateTreatment);

export default router;
