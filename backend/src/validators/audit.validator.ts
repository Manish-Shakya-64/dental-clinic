import { z } from "zod";
import { objectId } from "./common.js";

export const listAuditLogsSchema = z.object({
  query: z.object({
    resourceType: z.string().optional(),
    resourceId: objectId.optional(),
    actorUserId: objectId.optional(),
    action: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
});
