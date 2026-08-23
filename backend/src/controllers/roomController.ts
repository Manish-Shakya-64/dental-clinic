import { Request, Response } from "express";
import { Room } from "../models/Room.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

export const listRooms = asyncHandler(async (_req: Request, res: Response) => {
  const rooms = await Room.find().sort({ name: 1 });
  res.json({ data: rooms });
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await Room.create(req.body);
  await logAudit({ req, action: "ROOM_CREATED", resourceType: "Room", resourceId: room._id.toString(), status: "SUCCESS" });
  res.status(201).json({ data: room });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await Room.findById(id);
  if (!room) throw new NotFoundError("Room not found");

  Object.assign(room, req.body);
  await room.save();

  await logAudit({ req, action: "ROOM_UPDATED", resourceType: "Room", resourceId: id, status: "SUCCESS" });
  res.json({ data: room });
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await Room.findByIdAndDelete(id);
  if (!room) throw new NotFoundError("Room not found");

  await logAudit({ req, action: "ROOM_DELETED", resourceType: "Room", resourceId: id, status: "SUCCESS" });
  res.status(204).send();
});
