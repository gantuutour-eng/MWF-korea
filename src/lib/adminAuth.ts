import type { UserRow } from "./db";
import { loadCurrentUser } from "./auth";

/**
 * Returns the current user if they have the `admin` role, otherwise null.
 * Use in admin pages (redirect on null) and admin API endpoints (401/403 on null).
 *
 * To grant admin: register normally via /profile/register, then run
 *   wrangler d1 execute mwa-korea-db --remote --command \
 *     "UPDATE users SET role='admin' WHERE email='YOU@EXAMPLE.COM'"
 */
export async function loadAdmin(
  db: D1Database,
  kv: KVNamespace,
  cookieHeader: string | null,
): Promise<UserRow | null> {
  const me = await loadCurrentUser(db, kv, cookieHeader);
  if (!me) return null;
  if (me.role !== "admin") return null;
  return me;
}
