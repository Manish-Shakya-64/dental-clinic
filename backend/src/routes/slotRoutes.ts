import { Router } from "express";
import * as slotController from "../controllers/slotController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createSlotSchema, updateSlotSchema, listSlotsSchema } from "../validators/slot.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(listSlotsSchema), slotController.listSlots);
router.post("/", authorize("ADMIN"), validate(createSlotSchema), slotController.createSlot);
router.patch("/:id", authorize("ADMIN"), validate(updateSlotSchema), slotController.updateSlot);
router.delete("/:id", authorize("ADMIN"), slotController.deleteSlot);

export default router;
