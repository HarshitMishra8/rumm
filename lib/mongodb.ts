import mongoose from "mongoose";

/**
 * One MongoDB connection for the whole app. Next.js reloads modules on every
 * change in development and may reuse warm functions in production, so the
 * connection is cached on globalThis instead of opening a new one per request.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (g.__mongoose ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and add your Atlas connection string.");
    cache.promise = mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10_000 });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // let the next request try again
    throw err;
  }
  return cache.conn;
}
