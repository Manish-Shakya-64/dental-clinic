import { Router } from "express";
import * as contactController from "../controllers/contactController.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { contactSchema } from "../validators/contact.validator.js";

const router = Router();

router.post("/", authLimiter, validate(contactSchema), contactController.submitContact);

export default router;
