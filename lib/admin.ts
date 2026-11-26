import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { StoreError } from "@/lib/errors";
import type { PublicUser } from "@/lib/users";

/** Emails allowed into /admin, from ADMIN_EMAILS="a@x.com,b@y.com" in .env.local */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdmin(user: PublicUser | null): boolean {
  return !!user && adminEmails().has(user.email.toLowerCase());
}

/**
 * For admin pages. Signed-out visitors go to sign in; signed-in customers get
 * a plain 404, so the admin area doesn't advertise itself.
 */
export async function requireAdminPage(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) redirect("/account?next=/admin");
  if (!isAdmin(user)) notFound();
  return user;
}

/** For admin API routes: throws a 401 or 403 StoreError instead of rendering. */
export async function requireAdminApi(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) throw new StoreError("Sign in to continue.", 401);
  if (!isAdmin(user)) throw new StoreError("You don't have access to the admin area.", 403);
  return user;
}
