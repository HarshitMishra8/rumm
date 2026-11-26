import mongoose, { Schema, type Model } from "mongoose";
import type { ArtKind, Colorway, Room } from "@/lib/types";

export interface ProductDoc {
  _id: string; // e.g. "p-fold"; also used by carts, orders and inventory
  slug: string;
  name: string;
  type: string;
  room: Room;
  art: ArtKind;
  price: number;
  wasPrice?: number | null;
  badge?: "New" | "Lower price" | "Last few" | null;
  blurb: string;
  description: string;
  details: string[];
  dimensions: { w: number; d: number; h: number };
  material: string;
  wood: string;
  colorways: Colorway[];
  pieces: number;
  assemblyMinutes: number;
  /** hidden products disappear from the shop and from bags, but old orders keep their snapshot */
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const colorwaySchema = new Schema<Colorway>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    hex: { type: String, required: true },
  },
  { _id: false },
);

const productSchema = new Schema<ProductDoc>(
  {
    _id: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    room: { type: String, required: true },
    art: { type: String, required: true },
    price: { type: Number, required: true, min: 1 },
    wasPrice: { type: Number, default: null },
    badge: { type: String, default: null },
    blurb: { type: String, required: true },
    description: { type: String, required: true },
    details: { type: [String], default: [] },
    dimensions: {
      w: { type: Number, required: true },
      d: { type: Number, required: true },
      h: { type: Number, required: true },
    },
    material: { type: String, required: true },
    wood: { type: String, required: true },
    colorways: { type: [colorwaySchema], required: true },
    pieces: { type: Number, required: true, min: 1 },
    assemblyMinutes: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) || mongoose.model<ProductDoc>("Product", productSchema);
