import { z } from "zod";
import { nameFieldsSchema, genderSchema } from "./common.js";

export const registerSchema = z.object({
  body: z.object({
    ...nameFieldsSchema,
    gender: genderSchema,
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(7),
    dob: z.coerce.date(),
    address: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});
