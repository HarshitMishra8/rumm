/** Saved products ("wishlist") for signed-in customers. */
import { connectDB } from "@/lib/mongodb";
import { StoreError } from "@/lib/errors";
import { productMap } from "@/lib/products";
import { Wishlist, type WishlistDoc } from "@/models/Wishlist";

const MAX_SAVED = 100;

export async function getWishlist(userId: string): Promise<string[]> {
  await connectDB();
  const doc = await Wishlist.findById(userId).lean<WishlistDoc>();
  return doc?.productIds ?? [];
}

export async function saveProduct(userId: string, productId: string): Promise<string[]> {
  await connectDB();
  if (!(await productMap()).has(productId)) throw new StoreError("That product isn't available any more.", 404);
  const current = await getWishlist(userId);
  if (!current.includes(productId) && current.length >= MAX_SAVED) {
    throw new StoreError(`You can save up to ${MAX_SAVED} items. Remove some to save more.`, 409);
  }
  // $addToSet never adds the same product twice, even if two taps race
  await Wishlist.updateOne({ _id: userId }, { $addToSet: { productIds: productId } }, { upsert: true });
  return getWishlist(userId);
}

export async function unsaveProduct(userId: string, productId: string): Promise<string[]> {
  await connectDB();
  await Wishlist.updateOne({ _id: userId }, { $pull: { productIds: productId } });
  return getWishlist(userId);
}
