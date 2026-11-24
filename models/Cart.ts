import mongoose, { Schema, type Model } from "mongoose";

export interface CartLineDoc {
  productId: string;
  colorwayId: string;
  qty: number;
}

export interface CartDoc {
  _id: string; // the cart id from the rumm_cart cookie, so guests have bags too
  lines: CartLineDoc[];
  __v: number;
  updatedAt: Date;
}

const lineSchema = new Schema<CartLineDoc>(
  {
    productId: { type: String, required: true },
    colorwayId: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDoc>(
  {
    _id: { type: String, required: true },
    lines: { type: [lineSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

// bags nobody has touched for 90 days are removed automatically
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 90 * 86400 });

export const Cart: Model<CartDoc> = (mongoose.models.Cart as Model<CartDoc>) || mongoose.model<CartDoc>("Cart", cartSchema);
