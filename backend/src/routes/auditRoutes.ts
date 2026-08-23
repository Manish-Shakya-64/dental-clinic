import { Router } from "express";
import * as auditController from "../controllers/auditController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { listAuditLogsSchema } from "../validators/audit.validator.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", validate(listAuditLogsSchema), auditController.listAuditLogs);

export default router;
