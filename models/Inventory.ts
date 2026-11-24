import mongoose, { Schema, type Model } from "mongoose";

export interface InventoryDoc {
  _id: string; // product id, e.g. "p-fold"
  stock: number;
}

const inventorySchema = new Schema<InventoryDoc>(
  {
    _id: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
  },
  { collection: "inventory", timestamps: true },
);

export const Inventory: Model<InventoryDoc> =
  (mongoose.models.Inventory as Model<InventoryDoc>) || mongoose.model<InventoryDoc>("Inventory", inventorySchema);
