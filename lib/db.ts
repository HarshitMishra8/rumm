/**
 * Database helpers shared across the app. Data lives in MongoDB, accessed
 * through Mongoose models in models/.
 */
import { connectDB } from "@/lib/mongodb";
import { Inventory, type InventoryDoc } from "@/models/Inventory";

export { StoreError } from "@/lib/errors";

/** Stock for every product that has an inventory document. */
export async function getStockMap(): Promise<Record<string, number>> {
  await connectDB();
  const rows = await Inventory.find().lean<InventoryDoc[]>();
  return Object.fromEntries(rows.map((r) => [r._id, r.stock]));
}
