import { Request, Response } from "express";
import { Patient, IPatient } from "../models/Patient.js";
import { StaffMember, IStaffMember } from "../models/StaffMember.js";
import { Practitioner, IPractitioner } from "../models/Practitioner.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";
import {
  saveProfileImage,
  deleteProfileImageFile,
  getProfileImageAbsolutePath,
  getContentTypeForFilename,
} from "../services/profileImageService.js";

type OwnProfile = IPatient | IPractitioner | IStaffMember;

/** Resolves the Patient/Practitioner/StaffMember record belonging to the authenticated caller —
 *  the same three-way branch getProfile/updateProfile already used, now shared with the image
 *  endpoints too. */
async function loadOwnProfile(req: Request): Promise<{ profile: OwnProfile; resourceType: string }> {
  const { role, patientId, staffId, practitionerId } = req.user!;

  if (role === "PATIENT") {
    const profile = await Patient.findById(patientId);
    if (!profile) throw new NotFoundError("Profile not found");
    return { profile, resourceType: "Patient" };
  }

  if (role === "DOCTOR") {
    const profile = await Practitioner.findById(practitionerId);
    if (!profile) throw new NotFoundError("Profile not found");
    return { profile, resourceType: "Practitioner" };
  }

  const profile = await StaffMember.findById(staffId);
  if (!profile) throw new NotFoundError("Profile not found");
  return { profile, resourceType: "StaffMember" };
}

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { profile } = await loadOwnProfile(req);
  res.json({ data: { role: req.user!.role, profile } });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const { first_name, middle_name, last_name, gender, email, phone, address, specialties, working_hours } = req.body;
  const { profile, resourceType } = await loadOwnProfile(req);

  if (role === "PATIENT") {
    const patient = profile as IPatient;
    if (first_name !== undefined) patient.first_name = first_name;
    if (middle_name !== undefined) patient.middle_name = middle_name;
    if (last_name !== undefined) patient.last_name = last_name;
    if (gender !== undefined) patient.gender = gender;
    if (email !== undefined) patient.email = email;
    if (phone !== undefined) patient.phone = phone;
    if (address !== undefined) patient.address = address;
  } else if (role === "DOCTOR") {
    const practitioner = profile as IPractitioner;
    if (first_name !== undefined) practitioner.first_name = first_name;
    if (middle_name !== undefined) practitioner.middle_name = middle_name;
    if (last_name !== undefined) practitioner.last_name = last_name;
    if (gender !== undefined) practitioner.gender = gender;
    if (email !== undefined) practitioner.email = email;
    if (phone !== undefined) practitioner.phone = phone;
    if (specialties !== undefined) practitioner.specialties = specialties;
    if (working_hours !== undefined) practitioner.working_hours = working_hours;
  } else {
    const staff = profile as IStaffMember;
    if (first_name !== undefined) staff.first_name = first_name;
    if (middle_name !== undefined) staff.middle_name = middle_name;
    if (last_name !== undefined) staff.last_name = last_name;
    if (gender !== undefined) staff.gender = gender;
    if (email !== undefined) staff.email = email;
    if (phone !== undefined) staff.phone = phone;
  }

  await profile.save();
  await logAudit({ req, action: "PROFILE_UPDATED", resourceType, resourceId: profile._id.toString(), status: "SUCCESS" });

  res.json({ data: { role, profile } });
});

export const uploadProfileImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ValidationError("No image file provided (expected multipart field \"image\")");
  }

  const { profile, resourceType } = await loadOwnProfile(req);

  const previousFilename = profile.profile_image;
  const filename = await saveProfileImage(req.file.buffer, req.file.mimetype);
  profile.profile_image = filename;
  await profile.save();

  if (previousFilename) {
    await deleteProfileImageFile(previousFilename);
  }

  await logAudit({
    req,
    action: "PROFILE_IMAGE_UPLOADED",
    resourceType,
    resourceId: profile._id.toString(),
    status: "SUCCESS",
  });

  res.status(201).json({ data: { role: req.user!.role, profile } });
});

export const deleteProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const { profile, resourceType } = await loadOwnProfile(req);

  if (!profile.profile_image) {
    throw new NotFoundError("No profile image to delete");
  }

  await deleteProfileImageFile(profile.profile_image);
  profile.profile_image = null;
  await profile.save();

  await logAudit({
    req,
    action: "PROFILE_IMAGE_DELETED",
    resourceType,
    resourceId: profile._id.toString(),
    status: "SUCCESS",
  });

  res.status(204).send();
});

export const getProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const { profile } = await loadOwnProfile(req);

  if (!profile.profile_image) {
    throw new NotFoundError("No profile image set");
  }

  res.setHeader("Content-Type", getContentTypeForFilename(profile.profile_image));
  res.sendFile(getProfileImageAbsolutePath(profile.profile_image));
});
