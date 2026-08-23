import { Router } from "express";
import authRoutes from "./authRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
import patientRoutes from "./patientRoutes.js";
import staffRoutes from "./staffRoutes.js";
import roomRoutes from "./roomRoutes.js";
import slotRoutes from "./slotRoutes.js";
import treatmentRoutes from "./treatmentRoutes.js";
import waitlistRoutes from "./waitlistRoutes.js";
import billRoutes from "./billRoutes.js";
import reportRoutes from "./reportRoutes.js";
import profileRoutes from "./profileRoutes.js";
import auditRoutes from "./auditRoutes.js";
import contactRoutes from "./contactRoutes.js";
import * as appointmentController from "../controllers/appointmentController.js";
import * as doctorController from "../controllers/doctorController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

// Not in the spec's endpoint table, but a conventional unauthenticated liveness check.
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/patients", patientRoutes);
router.use("/staff", staffRoutes);
router.use("/rooms", roomRoutes);
router.use("/slots", slotRoutes);
router.use("/treatments", treatmentRoutes);
router.use("/waitlist", waitlistRoutes);
router.use("/bills", billRoutes);
router.use("/reports", reportRoutes);
router.use("/profile", profileRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/contact", contactRoutes);

// Public — the marketing site's "Our Dentists" section lists the practice's dentists, same as any
// real clinic website. Only name/specialties/photo are exposed (see doctorController).
router.get("/doctors", doctorController.listDoctors);
router.get("/doctors/:id/image", doctorController.getDoctorImage);
router.get("/doctors/:id/calendar", authenticate, authorize("DOCTOR", "ADMIN"), appointmentController.getDoctorCalendar);

export default router;
