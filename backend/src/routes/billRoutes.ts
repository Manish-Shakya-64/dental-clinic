import { Router } from "express";
import * as billController from "../controllers/billController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { listBillsSchema } from "../validators/bill.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("RECEPTIONIST", "ADMIN", "PATIENT"), validate(listBillsSchema), billController.listBills);
router.get("/:id/pdf", authorize("RECEPTIONIST", "ADMIN", "PATIENT"), billController.getBillPdf);
router.post("/:id/email", authorize("RECEPTIONIST", "ADMIN"), billController.emailBill);

export default router;
