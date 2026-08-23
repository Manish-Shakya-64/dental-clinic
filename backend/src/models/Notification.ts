import { Schema, model, Document, Types } from "mongoose";

export type NotificationChannel = "SMS" | "EMAIL";
export type NotificationType =
  | "BOOKING_CONFIRMATION"
  | "RESCHEDULED"
  | "CANCELLED"
  | "REMINDER_48H"
  | "RECALL"
  | "PASSWORD_RESET";
export type NotificationResponse = "CONFIRMED" | "CANCELLED" | "NONE";

export interface INotification extends Document {
  _id: Types.ObjectId;
  appointment: Types.ObjectId;
  channel: NotificationChannel;
  type: NotificationType;
  sent_at?: Date;
  response: NotificationResponse;
}

const notificationSchema = new Schema<INotification>({
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  channel: { type: String, enum: ["SMS", "EMAIL"], required: true },
  type: {
    type: String,
    enum: ["BOOKING_CONFIRMATION", "RESCHEDULED", "CANCELLED", "REMINDER_48H", "RECALL", "PASSWORD_RESET"],
    required: true,
  },
  sent_at: { type: Date },
  response: { type: String, enum: ["CONFIRMED", "CANCELLED", "NONE"], default: "NONE" },
});

notificationSchema.index({ appointment: 1, type: 1 });

export const Notification = model<INotification>("Notification", notificationSchema);
