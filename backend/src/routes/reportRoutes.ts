import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { dashboardQuerySchema } from "../validators/report.validator.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", validate(dashboardQuerySchema), reportController.getDashboard);

export default router;
