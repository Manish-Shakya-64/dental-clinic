import { z } from "zod";

export const contactSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
    message: z.string().min(1).max(4000),
  }),
});
