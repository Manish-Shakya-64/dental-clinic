import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import * as billingService from "../services/billingService.js";
import { Bill, IBill } from "../models/Bill.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError, NotFoundError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

/** Not in the spec's endpoint table — needed so the checkout screen can recover an appointment's
 *  bill after a page reload (generateBill only returns it once, at creation time). */
export const listBills = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as { appointment?: string };

  const filter: FilterQuery<IBill> = {};
  if (query.appointment) filter.appointment = query.appointment;
  if (req.user!.role === "PATIENT") filter.patient = req.user!.patientId;

  const bills = await Bill.find(filter).sort({ issued_at: -1 });
  res.json({ data: bills });
});

export const generateBill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const bill = await billingService.generateBill(id, req.user!.staffId!);

  await logAudit({ req, action: "BILL_GENERATED", resourceType: "Bill", resourceId: bill._id.toString(), status: "SUCCESS" });
  res.status(201).json({ data: bill });
});

async function assertCanAccessBill(req: Request, billId: string): Promise<void> {
  if (req.user!.role !== "PATIENT") return;

  const bill = await Bill.findById(billId);
  if (!bill) throw new NotFoundError("Bill not found");
  if (bill.patient.toString() !== req.user!.patientId) {
    throw new ForbiddenError("Patients may only access their own bills");
  }
}

export const getBillPdf = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await assertCanAccessBill(req, id);

  const { bill, treatment, patient } = await billingService.loadBillPdfContext(id);
  const pdf = await billingService.renderBillPdf(bill, treatment, patient);

  await billingService.markPrinted(id);
  await logAudit({ req, action: "BILL_PRINTED", resourceType: "Bill", resourceId: id, status: "SUCCESS" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${bill.bill_number}.pdf"`);
  res.send(pdf);
});

export const emailBill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const bill = await billingService.emailBillToPatient(id);

  await logAudit({ req, action: "BILL_EMAILED", resourceType: "Bill", resourceId: id, status: "SUCCESS" });
  res.json({ data: bill });
});
