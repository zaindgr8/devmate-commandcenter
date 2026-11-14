import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Optional: comma-separated list of emails allowed to use the portal.
// If unset, any user who can sign in to this Supabase project is allowed.
const allowed = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type AuthResult =
  | { ok: true; user: User; db: SupabaseClient }
  | { ok: false; status: 401 | 403 | 500; error: string };

/**
 * Checks the `Authorization: Bearer <supabase access token>` header and returns a
 * Supabase client that talks to the database AS that user (role `authenticated`),
 * so Row Level Security on `app_state` can lock out the public anon key.
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  if (!url || !anonKey) return { ok: false, status: 500, error: "Supabase not configured" };

  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Not signed in" };

  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Session expired" };

  if (allowed.length > 0 && !allowed.includes((data.user.email || "").toLowerCase())) {
    return { ok: false, status: 403, error: "This account isn't allowed to use the portal" };
  }

  return { ok: true, user: data.user, db };
}
