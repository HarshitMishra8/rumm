import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { StoreError, isDuplicateKey } from "@/lib/errors";
import { User, type UserDoc } from "@/models/User";
import { Session, type SessionDoc } from "@/models/Session";

const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 86400;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicUser = { id: string; email: string; name: string };
const toPublic = (u: Pick<UserDoc, "_id" | "email" | "name">): PublicUser => ({ id: String(u._id), email: u.email, name: u.name });

/* ------------------------------------------------------------- passwords */

const SCRYPT_KEYLEN = 64;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const known = Buffer.from(hash, "hex");
  return known.length === candidate.length && crypto.timingSafeEqual(known, candidate);
}

/* -------------------------------------------------------------- accounts */

export async function registerUser(input: { email: string; name: string; password: string }): Promise<PublicUser> {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim();
  const password = input.password ?? "";
  if (!EMAIL_RE.test(email)) throw new StoreError("Enter an email address like name@example.com.");
  if (name.length < 2) throw new StoreError("Enter your name.");
  if (password.length < 8) throw new StoreError("Use at least 8 characters for your password.");

  await connectDB();
  try {
    const user = await User.create({ email, name, passwordHash: hashPassword(password) });
    return toPublic(user);
  } catch (err) {
    if (isDuplicateKey(err)) throw new StoreError("An account with this email already exists. Sign in instead.", 409);
    throw err;
  }
}

export async function verifyUser(emailRaw: string, password: string): Promise<PublicUser> {
  const email = (emailRaw ?? "").trim().toLowerCase();
  await connectDB();
  const user = await User.findOne({ email }).lean<UserDoc>();
  if (!user || !checkPassword(password ?? "", user.passwordHash)) {
    throw new StoreError("That email and password don't match an account.", 401);
  }
  return toPublic(user);
}

/* -------------------------------------------------------------- sessions */

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await connectDB();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await Session.create({ _id: token, userId, expiresAt });
  return { token, expiresAt };
}

export async function userForSession(token: string | undefined): Promise<PublicUser | null> {
  if (!token) return null;
  await connectDB();
  const session = await Session.findById(token).lean<SessionDoc>();
  // the TTL index removes expired sessions within a minute or so; check anyway
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const user = await User.findById(session.userId).lean<UserDoc>();
  return user ? toPublic(user) : null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await connectDB();
  await Session.deleteOne({ _id: token });
}
