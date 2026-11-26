// Edge Function: delete-account
// Lets a signed-in user permanently delete THEIR OWN Critical Care Universe account.
// The service-role key lives ONLY here, as a server-side env var injected by Supabase. It is never sent to a browser.
//
// What it does, in order:
//   1. Reads the caller from the verified access token (Supabase Auth getUser). A user id or email in the request is never used.
//   2. Refuses protected (administrator) accounts. Administrators are listed in the ADMIN_EMAILS secret (same secret as admin-beta).
//   3. Re-checks the password on the server (signInWithPassword) and requires it to belong to the same user as the token.
//   4. Hard-deletes the Auth user with the Admin API. public.beta_access has ON DELETE CASCADE to auth.users, so its row goes with it.
//   5. Verifies the outcome (user gone, beta_access row gone) and never reports success unless both are true.
//
// Deploy (iPhone/dashboard): Supabase > Edge Functions > Deploy a new function > Via Editor > name it delete-account > paste this file.
//   Then Settings > turn "Verify JWT with legacy secret" OFF and Save (this function checks the token itself, exactly like admin-beta).
// Deploy (computer/CLI):    supabase functions deploy delete-account --no-verify-jwt
// Secrets it uses (Edge Functions > Secrets): ADMIN_EMAILS, ALLOWED_ORIGINS (both already exist for admin-beta; nothing new to add).
// Injected by Supabase automatically (never set by hand, never print): SUPABASE_URL, the server key (SUPABASE_SECRET_KEYS or
//   SUPABASE_SERVICE_ROLE_KEY) and the public key (SUPABASE_PUBLISHABLE_KEYS or SUPABASE_ANON_KEY).
// Pinned to an exact version so a new upstream release can never change this function by surprise.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
function pickKey(namedJson: string, legacy: string): string {
  try {
    const all = JSON.parse(Deno.env.get(namedJson) ?? "{}");
    const v = all.default ?? Object.values(all)[0];
    if (typeof v === "string" && v) return v;
  } catch { /* fall back to the legacy variable */ }
  return Deno.env.get(legacy) ?? "";
}
const SERVICE_KEY = pickKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const PUBLIC_KEY = pickKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const ADMINS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const MAX_PW = 256;

const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") ?? "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (o && ORIGINS.includes(o)) h["Access-Control-Allow-Origin"] = o;   // fail closed: unknown origins get no CORS header
  return h;
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
// Audit lines carry NO email, user id or password: only the event, the outcome and the time.
function audit(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ audit: event, at: new Date().toISOString(), ...extra }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!admin || ADMINS.length === 0) return json(req, { error: "server_misconfigured" }, 500);   // fail closed: cannot protect admins => do nothing

  // 1. Who is calling? Validate the token with Supabase Auth. Identity comes from here and nowhere else.
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "unauthenticated" }, 401);
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json(req, { error: "unauthenticated" }, 401);
  const u = who.user;
  const email = (u.email ?? "").toLowerCase();
  if (!email || !u.email_confirmed_at) return json(req, { error: "forbidden" }, 403);

  // 2. Strict body: only {action:"delete", password, confirm:"DELETE"}. Any other field (user_id, email, id ...) is refused, never used.
  let body: Record<string, unknown> = {};
  try { const b = await req.json(); if (b && typeof b === "object" && !Array.isArray(b)) body = b as Record<string, unknown>; } catch { /* empty */ }
  const allowed = new Set(["action", "password", "confirm"]);
  if (Object.keys(body).some((k) => !allowed.has(k))) return json(req, { error: "bad_request" }, 400);
  if (body.action !== "delete" || body.confirm !== "DELETE") return json(req, { error: "bad_request" }, 400);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > MAX_PW) return json(req, { error: "bad_request" }, 400);

  // 3. Protected accounts cannot self-delete (administrators are removed by hand in the dashboard).
  if (ADMINS.includes(email)) { audit("account_delete_refused", { reason: "protected" }); return json(req, { error: "admin_protected" }, 403); }

  // 4. Re-authenticate on the server. The password goes only to Supabase Auth, is never logged, and must match THIS token's user.
  const pub = SUPABASE_URL && (PUBLIC_KEY || req.headers.get("apikey")) ? createClient(SUPABASE_URL, PUBLIC_KEY || (req.headers.get("apikey") as string), { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  if (!pub) return json(req, { error: "server_misconfigured" }, 500);
  const { data: re, error: reErr } = await pub.auth.signInWithPassword({ email, password });
  if (reErr || !re?.user || re.user.id !== u.id) {
    const rate = reErr && (reErr.status === 429 || /rate limit|too many/i.test(reErr.message ?? ""));
    audit("account_delete_refused", { reason: rate ? "rate_limited" : "reauth_failed" });
    return rate ? json(req, { error: "rate_limited" }, 429) : json(req, { error: "reauth_failed" }, 403);
  }

  // 5. Delete the Auth user (hard delete). beta_access goes with it through ON DELETE CASCADE.
  const { error: delErr } = await admin.auth.admin.deleteUser(u.id, false);
  if (delErr) {
    // A user that is already gone counts as deleted (idempotent); anything else is a real failure and nothing is reported as deleted.
    const gone = delErr.status === 404 || /not.?found/i.test(delErr.message ?? "") || (delErr as { code?: string }).code === "user_not_found";
    if (!gone) { audit("account_delete_failed", { stage: "auth_delete" }); return json(req, { error: "delete_failed" }, 500); }
  }

  // 6. Verify the outcome. Never report success unless the Auth user and the beta_access row are both gone.
  const chk = await admin.auth.admin.getUserById(u.id);
  const authGone = !!chk.error && (chk.error.status === 404 || /not.?found/i.test(chk.error.message ?? "") || (chk.error as { code?: string }).code === "user_not_found");
  if (!authGone) { audit("account_delete_failed", { stage: "verify_auth" }); return json(req, { error: "delete_failed" }, 500); }

  let row = await admin.from("beta_access").select("user_id").eq("user_id", u.id).maybeSingle();
  if (!row.error && row.data) {
    // Cascade should have removed it. If it did not, remove it directly (the Auth account is already gone, so this only tidies).
    await admin.from("beta_access").delete().eq("user_id", u.id);
    row = await admin.from("beta_access").select("user_id").eq("user_id", u.id).maybeSingle();
  }
  if (row.error || row.data) {
    audit("account_delete_partial", { stage: "beta_access" });
    return json(req, { error: "partial", auth_deleted: true }, 500);   // login removed, one record could not be confirmed removed
  }

  audit("account_deleted");
  return json(req, { ok: true, deleted: true });
});
