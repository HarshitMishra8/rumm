import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ReviewDoc {
  _id: Types.ObjectId;
  productId: string;
  userId: string;
  name: string; // shown as "Asha K."
  rating: number; // 1–5
  title: string;
  body: string;
  /** hidden by an admin; not shown and not counted */
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDoc>(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    body: { type: String, required: true },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// one review per customer per product; writing again edits it
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const Review: Model<ReviewDoc> = (mongoose.models.Review as Model<ReviewDoc>) || mongoose.model<ReviewDoc>("Review", reviewSchema);
