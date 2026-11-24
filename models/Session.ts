import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface SessionDoc {
  _id: string; // the session token
  userId: Types.ObjectId;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionDoc>({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // TTL index: MongoDB deletes the session by itself once expiresAt has passed
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const Session: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) || mongoose.model<SessionDoc>("Session", sessionSchema);
