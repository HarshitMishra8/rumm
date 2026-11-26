import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { Address, DeliveryOption, OrderLine, PaymentOption, PaymentStatus } from "@/lib/types";

export interface OrderDoc {
  _id: string; // e.g. "RM-2026-482913"
  userId: Types.ObjectId | null;
  email: string;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  assembly: number;
  total: number;
  address: Address;
  deliveryOption: DeliveryOption;
  payment: PaymentOption;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paidAt?: Date | null;
  /** online orders remember their bag so it can be emptied once payment lands */
  cartId?: string | null;
  status: "placed" | "packed" | "shipped" | "delivered" | "cancelled";
  deliverBy: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<OrderLine>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    colorway: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    pin: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, required: true },
    lines: { type: [lineSchema], required: true },
    subtotal: { type: Number, required: true },
    delivery: { type: Number, required: true },
    assembly: { type: Number, required: true },
    total: { type: Number, required: true },
    address: { type: addressSchema, required: true },
    deliveryOption: { type: String, enum: ["standard", "assembly"], required: true },
    payment: { type: String, enum: ["cod", "upi-on-delivery", "online"], required: true },
    paymentStatus: { type: String, enum: ["not_required", "pending", "paid", "failed"], default: "not_required", index: true },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    cartId: { type: String, default: null },
    status: { type: String, enum: ["placed", "packed", "shipped", "delivered", "cancelled"], default: "placed" },
    deliverBy: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Order: Model<OrderDoc> = (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", orderSchema);
