import { Router } from "express";
import * as roomController from "../controllers/roomController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createRoomSchema, updateRoomSchema } from "../validators/room.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", roomController.listRooms);
router.post("/", authorize("ADMIN"), validate(createRoomSchema), roomController.createRoom);
router.patch("/:id", authorize("ADMIN"), validate(updateRoomSchema), roomController.updateRoom);
router.delete("/:id", authorize("ADMIN"), roomController.deleteRoom);

export default router;
