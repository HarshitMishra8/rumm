import mongoose, { Schema, type Model } from "mongoose";

export interface WishlistDoc {
  _id: string; // the user's id
  productIds: string[];
}

const wishlistSchema = new Schema<WishlistDoc>(
  {
    _id: { type: String, required: true },
    productIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Wishlist: Model<WishlistDoc> =
  (mongoose.models.Wishlist as Model<WishlistDoc>) || mongoose.model<WishlistDoc>("Wishlist", wishlistSchema);
