import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { Appointment, IAppointment, AppointmentStatus } from "../models/Appointment.js";
import * as bookingService from "../services/bookingService.js";
import * as billingService from "../services/billingService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, practitionerId, roomId, treatmentId, startTime, slotId } = req.body;

  let effectivePatientId = patientId as string | undefined;
  if (req.user!.role === "PATIENT") {
    effectivePatientId = req.user!.patientId;
  }
  if (!effectivePatientId) {
    throw new ValidationError("patientId is required");
  }

  const appointment = await bookingService.createBooking({
    patientId: effectivePatientId,
    practitionerId,
    roomId,
    treatmentId,
    startTime,
    slotId,
  });

  await logAudit({
    req,
    action: "APPOINTMENT_CREATED",
    resourceType: "Appointment",
    resourceId: appointment._id.toString(),
    status: "SUCCESS",
  });

  res.status(201).json({ data: appointment });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as {
    code?: string;
    patient?: string;
    practitioner?: string;
    status?: string;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<IAppointment> = {};
  if (query.code) filter.appointment_code = query.code;
  if (query.status) filter.status = query.status as AppointmentStatus;
  if (query.from || query.to) {
    filter.start_time = {};
    if (query.from) filter.start_time.$gte = query.from;
    if (query.to) filter.start_time.$lte = query.to;
  }

  if (req.user!.role === "PATIENT") {
    filter.patient = req.user!.patientId;
  } else if (req.user!.role === "DOCTOR") {
    filter.practitioner = req.user!.practitionerId;
    if (query.patient) filter.patient = query.patient;
  } else {
    if (query.patient) filter.patient = query.patient;
    if (query.practitioner) filter.practitioner = query.practitioner;
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate("patient")
      .populate("practitioner")
      .populate("room")
      .populate("reason")
      .sort({ start_time: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    data: appointments,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");

  const role = req.user!.role;
  if (role === "PATIENT" && appointment.patient.toString() !== req.user!.patientId) {
    throw new ForbiddenError("Patients may only view their own appointments");
  }
  if (role === "DOCTOR" && appointment.practitioner.toString() !== req.user!.practitionerId) {
    throw new ForbiddenError("Doctors may only view their own appointments");
  }

  await appointment.populate(["patient", "practitioner", "room", "reason"]);
  res.json({ data: appointment });
});

export const getDoctorCalendar = asyncHandler(async (req: Request, res: Response) => {
  const practitionerId = req.params.id;

  if (req.user!.role === "DOCTOR" && req.user!.practitionerId !== practitionerId) {
    throw new ForbiddenError("Doctors may only view their own calendar");
  }

  const appointments = await Appointment.find({ practitioner: practitionerId })
    .populate("patient")
    .populate("room")
    .populate("reason")
    .sort({ start_time: 1 });

  res.json({ data: appointments });
});

async function assertDoctorOwnsAppointment(req: Request, appointment: IAppointment): Promise<void> {
  if (req.user!.role === "DOCTOR" && appointment.practitioner.toString() !== req.user!.practitionerId) {
    throw new ForbiddenError("Doctors may only act on their own appointments");
  }
}

async function assertPatientOwnsAppointment(req: Request, appointment: IAppointment): Promise<void> {
  if (req.user!.role === "PATIENT" && appointment.patient.toString() !== req.user!.patientId) {
    throw new ForbiddenError("Patients may only act on their own appointments");
  }
}

export const patchAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.user!.role;

  switch (req.body.action) {
    case "reschedule": {
      if (role === "DOCTOR") throw new ForbiddenError("Doctors cannot reschedule appointments");
      const existing = await Appointment.findById(id);
      if (!existing) throw new ValidationError("Appointment not found");
      await assertPatientOwnsAppointment(req, existing);

      const appointment = await bookingService.rescheduleAppointment(id, req.body);
      await logAudit({ req, action: "RESCHEDULED", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
      res.json({ data: appointment });
      return;
    }
    case "cancel": {
      if (role === "DOCTOR") throw new ForbiddenError("Doctors cannot cancel appointments");
      const existing = await Appointment.findById(id);
      if (!existing) throw new ValidationError("Appointment not found");
      await assertPatientOwnsAppointment(req, existing);

      const { appointment, waitlistMatches } = await bookingService.cancelAppointment(id);
      await logAudit({ req, action: "CANCELLED", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
      res.json({ data: { appointment, waitlistMatches } });
      return;
    }
    case "check-in": {
      if (role !== "RECEPTIONIST" && role !== "ADMIN") {
        throw new ForbiddenError("Only reception staff can check patients in");
      }
      const appointment = await bookingService.checkIn(id, req.user!.staffId!);
      await logAudit({ req, action: "APPOINTMENT_CHECKED_IN", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
      res.json({ data: appointment });
      return;
    }
    case "complete": {
      if (role !== "DOCTOR") throw new ForbiddenError("Only the treating doctor can mark a visit complete");
      const existing = await Appointment.findById(id);
      if (!existing) throw new ValidationError("Appointment not found");
      await assertDoctorOwnsAppointment(req, existing);

      const appointment = await bookingService.markCompleted(id);
      await logAudit({ req, action: "APPOINTMENT_COMPLETED", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
      res.json({ data: appointment });
      return;
    }
    case "no-show": {
      if (role !== "RECEPTIONIST" && role !== "ADMIN") {
        throw new ForbiddenError("Only reception staff can mark a no-show");
      }
      const appointment = await bookingService.markNoShow(id);
      await logAudit({ req, action: "APPOINTMENT_NO_SHOW", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
      res.json({ data: appointment });
      return;
    }
  }
});

export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await Appointment.findById(id);
  if (!existing) throw new ValidationError("Appointment not found");
  await assertDoctorOwnsAppointment(req, existing);

  const appointment = await bookingService.addClinicalNote(id, req.body.noteText);
  await logAudit({ req, action: "CLINICAL_NOTE_ADDED", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
  res.status(201).json({ data: appointment });
});

export const addMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await Appointment.findById(id);
  if (!existing) throw new ValidationError("Appointment not found");
  await assertDoctorOwnsAppointment(req, existing);

  const appointment = await bookingService.addMedicine(id, req.body);
  await logAudit({ req, action: "MEDICINE_ADDED", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
  res.status(201).json({ data: appointment });
});

/** Standalone "Complete checkout" — closes out a billed visit without requiring the receptionist
 *  to also email a receipt (that's the separate POST /api/bills/:id/email action). */
export const checkoutAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const appointment = await billingService.completeCheckoutByAppointment(id);

  await logAudit({ req, action: "APPOINTMENT_CHECKED_OUT", resourceType: "Appointment", resourceId: id, status: "SUCCESS" });
  res.json({ data: appointment });
});
