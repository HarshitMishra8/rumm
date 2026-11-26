/**
 * Product reviews. Only customers whose order with that product has been
 * delivered can review it, so every review comes from a real purchase.
 */
import { connectDB } from "@/lib/mongodb";
import { StoreError, isDuplicateKey } from "@/lib/errors";
import { Review, type ReviewDoc } from "@/models/Review";
import { Order as OrderModel } from "@/models/Order";
import type { PublicUser } from "@/lib/users";

export interface ReviewView {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  edited: boolean;
}

export interface RatingSummary {
  avg: number; // one decimal
  count: number;
}

const toView = (r: ReviewDoc): ReviewView => ({
  id: String(r._id),
  name: r.name,
  rating: r.rating,
  title: r.title,
  body: r.body,
  createdAt: new Date(r.createdAt).toISOString(),
  edited: new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 60_000,
});

/** "Asha Kulkarni" → "Asha K." */
export function displayName(full: string): string {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

function summarise(ratings: number[]): RatingSummary {
  const sum = ratings.reduce((a, b) => a + b, 0);
  return { avg: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}

/** Average rating for every product that has visible reviews. */
export async function ratingsByProduct(): Promise<Map<string, RatingSummary>> {
  await connectDB();
  const rows = await Review.find({ hidden: false }).lean<ReviewDoc[]>();
  const grouped = new Map<string, number[]>();
  for (const r of rows) grouped.set(r.productId, [...(grouped.get(r.productId) ?? []), r.rating]);
  return new Map([...grouped].map(([id, list]) => [id, summarise(list)]));
}

export async function reviewsFor(productId: string): Promise<{ reviews: ReviewView[]; summary: RatingSummary | null }> {
  await connectDB();
  const rows = await Review.find({ productId, hidden: false }).sort({ createdAt: -1 }).lean<ReviewDoc[]>();
  return { reviews: rows.map(toView), summary: rows.length ? summarise(rows.map((r) => r.rating)) : null };
}

/** True when the customer has a delivered order containing this product. */
export async function canReview(userId: string, productId: string): Promise<boolean> {
  await connectDB();
  const order = await OrderModel.findOne({ userId, status: "delivered", "lines.productId": productId }).lean();
  return !!order;
}

export async function myReview(userId: string, productId: string): Promise<ReviewView | null> {
  await connectDB();
  const r = await Review.findOne({ productId, userId }).lean<ReviewDoc>();
  return r ? toView(r) : null;
}

export async function saveReview(
  user: PublicUser,
  input: { productId?: unknown; rating?: unknown; title?: unknown; body?: unknown },
): Promise<ReviewView> {
  const productId = String(input.productId ?? "");
  const rating = Number(input.rating);
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new StoreError("Choose a rating from 1 to 5 stars.");
  if (title.length > 80) throw new StoreError("Keep the headline to 80 characters or fewer.");
  if (body.length < 10) throw new StoreError("Write at least a sentence about the product (10 characters or more).");
  if (body.length > 1500) throw new StoreError("Keep the review to 1,500 characters or fewer.");

  if (!(await canReview(user.id, productId))) {
    throw new StoreError("You can review this once an order with it has been delivered to you.", 403);
  }

  const existing = await Review.findOne({ productId, userId: user.id }).lean<ReviewDoc>();
  if (existing) {
    await Review.updateOne({ _id: existing._id }, { $set: { rating, title, body } });
  } else {
    try {
      await Review.create({ productId, userId: user.id, name: displayName(user.name), rating, title, body });
    } catch (err) {
      // a second tab created it at the same moment: update that one instead
      if (!isDuplicateKey(err)) throw err;
      await Review.updateOne({ productId, userId: user.id }, { $set: { rating, title, body } });
    }
  }
  return (await myReview(user.id, productId))!;
}

/* ----------------------------------------------------------------- admin */

export interface AdminReview extends ReviewView {
  productId: string;
  hidden: boolean;
}

export async function listAllReviews(limit = 200): Promise<AdminReview[]> {
  await connectDB();
  const rows = await Review.find().sort({ createdAt: -1 }).limit(limit).lean<ReviewDoc[]>();
  return rows.map((r) => ({ ...toView(r), productId: r.productId, hidden: r.hidden }));
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<void> {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new StoreError("That review doesn't exist.", 404);
  await connectDB();
  const res = await Review.updateOne({ _id: id }, { $set: { hidden } });
  if (res.matchedCount === 0) throw new StoreError("That review doesn't exist.", 404);
}
