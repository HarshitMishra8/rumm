/**
 * Database helpers shared across the app. Data lives in MongoDB, accessed
 * through Mongoose models in models/.
 */
import { PRODUCTS } from "@/data/products";
import { connectDB } from "@/lib/mongodb";
import { Inventory, type InventoryDoc } from "@/models/Inventory";

export { StoreError } from "@/lib/errors";

/** Stock for every product. Products without an inventory document fall back to the catalogue's seed stock. */
export async function getStockMap(): Promise<Record<string, number>> {
  await connectDB();
  const rows = await Inventory.find().lean<InventoryDoc[]>();
  const map: Record<string, number> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock]));
  for (const r of rows) map[r._id] = r.stock;
  return map;
}
