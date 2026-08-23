import { Request, Response } from "express";
import { Patient, IPatient } from "../models/Patient.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError, NotFoundError } from "../utils/apiError.js";
import { blindIndex } from "../utils/blindIndex.js";
import { logAudit } from "../middleware/auditLogger.js";
import { FilterQuery } from "mongoose";

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const { dob, ...rest } = req.body;
  const patient = await Patient.create({ ...rest, dob: (dob as Date).toISOString().slice(0, 10) });

  await logAudit({ req, action: "PATIENT_CREATED", resourceType: "Patient", resourceId: patient._id.toString(), status: "SUCCESS" });
  res.status(201).json({ data: patient });
});

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as { email?: string; phone?: string; page: number; limit: number };

  const filter: FilterQuery<IPatient> = {};
  if (query.email) filter.email_hash = blindIndex(query.email);
  if (query.phone) filter.phone_hash = blindIndex(query.phone);

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Patient.countDocuments(filter),
  ]);

  res.json({
    data: patients,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

function assertOwnPatientOrStaff(req: Request, patientId: string): void {
  if (req.user!.role === "PATIENT" && req.user!.patientId !== patientId) {
    throw new ForbiddenError("Patients may only access their own record");
  }
}

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  assertOwnPatientOrStaff(req, id);

  const patient = await Patient.findById(id);
  if (!patient) throw new NotFoundError("Patient not found");

  const isSelfView = req.user!.role === "PATIENT";
  if (!isSelfView) {
    await logAudit({ req, action: "PATIENT_VIEWED", resourceType: "Patient", resourceId: id, status: "SUCCESS" });
    if (req.user!.role === "DOCTOR") {
      await logAudit({ req, action: "MEDICAL_HISTORY_VIEWED", resourceType: "Patient", resourceId: id, status: "SUCCESS" });
    }
  }

  res.json({ data: patient });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.user!.role === "DOCTOR") {
    throw new ForbiddenError("Doctors cannot edit patient records");
  }
  assertOwnPatientOrStaff(req, id);

  const patient = await Patient.findById(id);
  if (!patient) throw new NotFoundError("Patient not found");

  Object.assign(patient, req.body);
  await patient.save();

  await logAudit({ req, action: "PATIENT_UPDATED", resourceType: "Patient", resourceId: id, status: "SUCCESS" });
  res.json({ data: patient });
});
