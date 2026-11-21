import crypto from "node:crypto";
import { StoreError, read, tx } from "@/lib/db";
import type { Session, User } from "@/lib/types";

const SESSION_DAYS = 30;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export type PublicUser = Pick<User, "id" | "email" | "name">;
const toPublic = (u: User): PublicUser => ({ id: u.id, email: u.email, name: u.name });

export async function registerUser(input: { email: string; name: string; password: string }) {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim();
  const password = input.password ?? "";
  if (!EMAIL_RE.test(email)) throw new StoreError("Enter an email address like name@example.com.");
  if (name.length < 2) throw new StoreError("Enter your name.");
  if (password.length < 8) throw new StoreError("Use at least 8 characters for your password.");
  return tx((db) => {
    if (db.users.some((u) => u.email === email)) {
      throw new StoreError("An account with this email already exists. Sign in instead.", 409);
    }
    const user: User = {
      id: `u_${crypto.randomBytes(8).toString("hex")}`,
      email,
      name,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return toPublic(user);
  });
}

export async function verifyUser(emailRaw: string, password: string): Promise<PublicUser> {
  const email = (emailRaw ?? "").trim().toLowerCase();
  const user = await read((db) => db.users.find((u) => u.email === email));
  if (!user || !checkPassword(password ?? "", user.passwordHash)) {
    throw new StoreError("That email and password don't match an account.", 401);
  }
  return toPublic(user);
}

export function createSession(userId: string) {
  return tx((db) => {
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    const session: Session = {
      token: crypto.randomBytes(32).toString("hex"),
      userId,
      expiresAt: new Date(now + SESSION_DAYS * 864e5).toISOString(),
    };
    db.sessions.push(session);
    return session;
  });
}

export function userForSession(token: string | undefined): Promise<PublicUser | null> {
  if (!token) return Promise.resolve(null);
  return read((db) => {
    const s = db.sessions.find((x) => x.token === token);
    if (!s || new Date(s.expiresAt).getTime() < Date.now()) return null;
    const u = db.users.find((x) => x.id === s.userId);
    return u ? toPublic(u) : null;
  });
}

export function deleteSession(token: string | undefined) {
  if (!token) return Promise.resolve();
  return tx((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  });
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86400;

