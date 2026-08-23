import { Schema, model, Document, Types } from "mongoose";

export type AuditStatus = "SUCCESS" | "FAILURE";

export interface IAuditActor {
  userId?: Types.ObjectId;
  role: string;
  displayName: string;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  timestamp: Date;
  actor: IAuditActor;
  action: string;
  resourceType: string;
  resourceId?: Types.ObjectId | null;
  status: AuditStatus;
  ip_address?: string;
  user_agent?: string;
  /** Field names changed, counts, reasons — never decrypted values. */
  metadata?: Record<string, unknown>;
}

const auditActorSchema = new Schema<IAuditActor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, required: true },
    displayName: { type: String, required: true },
  },
  { _id: false },
);

const auditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, required: true, default: Date.now },
  actor: { type: auditActorSchema, required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: Schema.Types.ObjectId, default: null },
  status: { type: String, enum: ["SUCCESS", "FAILURE"], required: true },
  ip_address: { type: String },
  user_agent: { type: String },
  metadata: { type: Schema.Types.Mixed },
});

auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ "actor.userId": 1, timestamp: 1 });

const APPEND_ONLY_ERROR = "AuditLog is append-only: updates and deletes are not permitted";

auditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"],
  { document: false, query: true },
  function (next) {
    next(new Error(APPEND_ONLY_ERROR));
  },
);

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
