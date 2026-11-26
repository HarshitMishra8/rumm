/**
 * Puts the starter catalogue (data/products.ts) and its stock into MongoDB.
 * Existing products and stock are left alone, so running it again never undoes
 * changes made in the admin panel.
 * Run with: npm run db:seed
 */
import mongoose from "mongoose";
import { PRODUCTS } from "../data/products";
import { connectDB } from "../lib/mongodb";
import { Inventory } from "../models/Inventory";
import { Product } from "../models/Product";

async function main() {
  await connectDB();

  const products = await Product.bulkWrite(
    PRODUCTS.map((p, i) => {
      const { id, stock: _stock, ...fields } = p;
      return {
        updateOne: {
          filter: { _id: id },
          update: { $setOnInsert: { _id: id, ...fields, wasPrice: p.wasPrice ?? null, badge: p.badge ?? null, active: true, sortOrder: i * 10 } },
          upsert: true,
        },
      };
    }),
  );

  const stock = await Inventory.bulkWrite(
    PRODUCTS.map((p) => ({
      updateOne: {
        filter: { _id: p.id },
        update: { $setOnInsert: { _id: p.id, stock: p.stock } },
        upsert: true,
      },
    })),
  );

  // build the indexes declared in models/ (unique email and slug, TTLs) if they don't exist yet
  for (const name of mongoose.modelNames()) await mongoose.model(name).syncIndexes();

  console.log(`Products: ${products.upsertedCount} added, ${PRODUCTS.length - products.upsertedCount} already there.`);
  console.log(`Stock:    ${stock.upsertedCount} added, ${PRODUCTS.length - stock.upsertedCount} already there.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
