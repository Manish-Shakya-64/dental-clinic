import { z } from "zod";

export const createRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    equipment_tags: z.array(z.string()).optional(),
    status: z.enum(["AVAILABLE", "SANITIZING", "OCCUPIED"]).optional(),
  }),
});

export const updateRoomSchema = z.object({
  body: z
    .object({
      name: z.string().min(1),
      equipment_tags: z.array(z.string()),
      status: z.enum(["AVAILABLE", "SANITIZING", "OCCUPIED"]),
    })
    .partial(),
});
