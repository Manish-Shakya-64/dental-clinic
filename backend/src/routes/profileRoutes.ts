import { Router } from "express";
import * as profileController from "../controllers/profileController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { uploadProfileImage } from "../middleware/upload.js";
import { updateProfileSchema } from "../validators/profile.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", profileController.getProfile);
router.patch("/", validate(updateProfileSchema), profileController.updateProfile);

router.get("/image", profileController.getProfileImage);
router.post("/image", uploadProfileImage, profileController.uploadProfileImage);
router.delete("/image", profileController.deleteProfileImage);

export default router;
