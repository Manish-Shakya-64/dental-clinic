import { Request, Response } from "express";
import { Practitioner } from "../models/Practitioner.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/apiError.js";
import { getContentTypeForFilename, getProfileImageAbsolutePath } from "../services/profileImageService.js";

/** Patient-safe doctor directory for the booking flow's "choose a dentist" step — deliberately
 *  narrower than GET /api/staff (Admin/Reception-only, and returns contact/schedule fields that
 *  aren't this audience's business). */
export const listDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await Practitioner.find({ is_active: true })
    .select("first_name middle_name last_name gender specialties profile_image")
    .sort({ first_name: 1 });
  res.json({ data: doctors });
});

/** Public counterpart to GET /profile/image — that endpoint only ever serves the caller's own
 *  photo, but the marketing site and booking flow need to show any active doctor's photo to
 *  visitors who aren't logged in at all. */
export const getDoctorImage = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Practitioner.findOne({ _id: req.params.id, is_active: true }).select("profile_image");
  if (!doctor || !doctor.profile_image) throw new NotFoundError("No profile image set");

  res.setHeader("Content-Type", getContentTypeForFilename(doctor.profile_image));
  res.sendFile(getProfileImageAbsolutePath(doctor.profile_image));
});
