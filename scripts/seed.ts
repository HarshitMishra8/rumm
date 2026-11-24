/**
 * Adds stock for every product in the catalogue.
 * Existing documents are left alone, so running it again never resets live stock.
 * Run with: npm run db:seed
 */
import mongoose from "mongoose";
import { PRODUCTS } from "../data/products";
import { connectDB } from "../lib/mongodb";
import { Inventory } from "../models/Inventory";

async function main() {
  await connectDB();
  const res = await Inventory.bulkWrite(
    PRODUCTS.map((p) => ({
      updateOne: {
        filter: { _id: p.id },
        update: { $setOnInsert: { _id: p.id, stock: p.stock } },
        upsert: true,
      },
    })),
  );
  // build the indexes declared in models/ (unique email, TTLs) if they don't exist yet
  for (const name of mongoose.modelNames()) await mongoose.model(name).syncIndexes();
  console.log(`Inventory ready: ${res.upsertedCount} added, ${PRODUCTS.length - res.upsertedCount} already there.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
