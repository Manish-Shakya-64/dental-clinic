import { z } from "zod";
import { objectId } from "./common.js";

export const listBillsSchema = z.object({
  query: z.object({
    appointment: objectId.optional(),
  }),
});
