// Edge Function: delete-account
// Lets a signed-in user permanently delete THEIR OWN Critical Care Universe account.
// The service-role key lives ONLY here, as a server-side env var injected by Supabase. It is never sent to a browser.
//
// What it does, in order:
//   0. Fails closed on configuration: the ADMIN_EMAILS secret must parse cleanly, and the server keys must be present. Otherwise it
//      refuses every request and deletes nothing (an unreadable admin list would silently remove admin protection).
//   1. Cheap checks first (method, token shape, body size and shape) so junk never reaches Supabase.
//   2. Reads the caller from the verified access token (Supabase Auth getUser). A user id or email in the request is never used.
//   3. Refuses protected (administrator) accounts. Administrators are listed in the ADMIN_EMAILS secret (same secret as admin-beta).
//   4. Re-checks the password on the server (signInWithPassword) and requires it to belong to the same user as the token.
//   5. Hard-deletes the Auth user with the Admin API. public.beta_access has ON DELETE CASCADE to auth.users, so its row goes with it.
//   6. Verifies the outcome by looking the user up again, and reports exactly one of:
//        deleted      - the Auth user is confirmed gone (and the beta_access row too)
//        not_deleted  - the delete failed and the Auth user is confirmed still there (nothing changed; safe to retry)
//        uncertain    - the delete may or may not have happened and it could not be confirmed (do NOT assume either)
//        partial      - the Auth user is confirmed gone but the beta_access row could not be confirmed removed
//
// Response shape: { ok, error?, outcome?, deleted?, auth_deleted? }. `outcome` is present only once a delete was attempted.
//
// Deploy (iPhone/dashboard): Supabase > Edge Functions > Deploy a new function > Via Editor > name it delete-account > paste this file.
//   Then Settings > turn "Verify JWT with legacy secret" OFF and Save (this function checks the token itself, exactly like admin-beta).
// Deploy (computer/CLI):    supabase functions deploy delete-account --no-verify-jwt
// Secrets it uses (Edge Functions > Secrets): ADMIN_EMAILS, ALLOWED_ORIGINS (both already exist for admin-beta; nothing new to add).
//   ADMIN_EMAILS must be plain comma-separated email addresses, for example  a@example.com,b@example.com
//   No quotes, no brackets, no semicolons, no spaces inside an address, no empty entries (no trailing comma). Anything else makes
//   this function refuse ALL deletions until the secret is fixed. That is deliberate.
// Injected by Supabase automatically (never set by hand, never print): SUPABASE_URL, the server key (SUPABASE_SECRET_KEYS or
//   SUPABASE_SERVICE_ROLE_KEY) and the public key (SUPABASE_PUBLISHABLE_KEYS or SUPABASE_ANON_KEY).
//   The public key comes ONLY from the environment. A key supplied by the caller is never used.
//
// Rate limits and abuse: this function keeps no state, so it has NO per-user or per-IP limiter of its own (an in-memory counter would
//   not survive across instances and is not reliable, so none is faked here). It relies on Supabase Auth's own limits for the two
//   calls it makes (token check and password check) and answers a 429 from Auth with "rate_limited". Every request needs a valid
//   session token for the account being deleted, so this endpoint cannot be used to guess passwords for other people's accounts.
//   Requests from Edge Functions may share Supabase egress IPs, so Auth's per-IP limits could be reached by unrelated users: that is
//   unverified. If it happens, a user sees "try again later" and nothing is deleted.
//
// Pinned to an exact version so a new upstream release can never change this function by surprise.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";

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

// Strict ADMIN_EMAILS parser. Returns the lower-cased list, or null if the value cannot be trusted.
// Null means: do not delete anything. (A blank value, a stray quote, a trailing comma or a semicolon-separated list would otherwise
// quietly produce a list that no longer matches the real administrators.)
const EMAIL = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
function parseAdmins(raw: string | undefined | null): string[] | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length > 50) return null;
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p.length > 254 || !EMAIL.test(p)) return null;
    out.push(p.toLowerCase());
  }
  return out;
}
const ADMINS = parseAdmins(Deno.env.get("ADMIN_EMAILS"));
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const MAX_PW = 256;
const MAX_BODY = 2048;
const MAX_TOKEN = 4096;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const OPTS = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, OPTS) : null;
const pub = SUPABASE_URL && PUBLIC_KEY ? createClient(SUPABASE_URL, PUBLIC_KEY, OPTS) : null;

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
// Audit lines carry NO email, user id, password or token: only the event, the outcome and the time.
function audit(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ audit: event, at: new Date().toISOString(), ...extra }));
}

type AuthErr = { status?: number; code?: string; name?: string; message?: string } | null | undefined;
// "That user does not exist" and nothing else. A bare 404 (wrong route, gateway) or a generic "not found" is NOT proof of deletion.
function userNotFound(e: AuthErr): boolean {
  if (!e) return false;
  return e.code === "user_not_found" || (e.status === 404 && /user.{0,12}not.?found/i.test(e.message ?? ""));
}
// Network failure, timeout or a 5xx from Auth: the call tells us nothing either way.
function transient(e: AuthErr): boolean {
  if (!e) return false;
  return e.name === "AuthRetryableFetchError" || !e.status || e.status >= 500;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Is this Auth user still there? "gone" only on an explicit not-found. One retry on anything unclear.
async function authPresence(id: string): Promise<"gone" | "present" | "unknown"> {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await admin!.auth.admin.getUserById(id);
      if (!r.error && r.data?.user) return "present";
      if (userNotFound(r.error)) return "gone";
    } catch { /* treat as unknown */ }
    if (i === 0) await sleep(400);
  }
  return "unknown";
}
// Is the beta_access row still there? "unknown" on any error.
async function rowPresence(id: string): Promise<"gone" | "present" | "unknown"> {
  try {
    const r = await admin!.from("beta_access").select("user_id").eq("user_id", id).maybeSingle();
    if (r.error) return "unknown";
    return r.data ? "present" : "gone";
  } catch { return "unknown"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  // 0. Fail closed. No trustworthy admin list, or no server keys => cannot protect admins or reach Auth => do nothing.
  if (!ADMINS) { audit("misconfigured", { what: "admin_emails" }); return json(req, { error: "server_misconfigured" }, 500); }
  if (!admin || !pub) { audit("misconfigured", { what: "keys" }); return json(req, { error: "server_misconfigured" }, 500); }

  // 1. Cheap, stateless checks before any network call to Supabase.
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > MAX_TOKEN || !JWT_SHAPE.test(token)) return json(req, { error: "unauthenticated" }, 401);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return json(req, { error: "too_large" }, 413);
  let text = "";
  try { text = await req.text(); } catch { return json(req, { error: "bad_request" }, 400); }
  if (text.length > MAX_BODY) return json(req, { error: "too_large" }, 413);
  // Strict body: only {action:"delete", password, confirm:"DELETE"}. Any other field (user_id, email, id ...) is refused, never used.
  let body: Record<string, unknown> | null = null;
  try { const b = JSON.parse(text); if (b && typeof b === "object" && !Array.isArray(b)) body = b as Record<string, unknown>; } catch { /* stays null */ }
  if (!body) return json(req, { error: "bad_request" }, 400);
  const allowed = new Set(["action", "password", "confirm"]);
  if (Object.keys(body).some((k) => !allowed.has(k))) return json(req, { error: "bad_request" }, 400);
  if (body.action !== "delete" || body.confirm !== "DELETE") return json(req, { error: "bad_request" }, 400);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > MAX_PW) return json(req, { error: "bad_request" }, 400);

  // 2. Who is calling? Validate the token with Supabase Auth. Identity comes from here and nowhere else.
  let who;
  try { who = await admin.auth.getUser(token); } catch { return json(req, { error: "auth_unavailable" }, 503); }
  if (who.error || !who.data?.user) {
    if (transient(who.error)) { audit("account_delete_refused", { reason: "auth_unavailable" }); return json(req, { error: "auth_unavailable" }, 503); }
    return json(req, { error: "unauthenticated" }, 401);
  }
  const u = who.data.user;
  const email = (u.email ?? "").toLowerCase();
  if (!email || !u.email_confirmed_at) return json(req, { error: "forbidden" }, 403);

  // 3. Protected accounts cannot self-delete (administrators are removed by hand in the dashboard).
  if (ADMINS.includes(email)) { audit("account_delete_refused", { reason: "protected" }); return json(req, { error: "admin_protected" }, 403); }

  // 4. Re-authenticate on the server. The password goes only to Supabase Auth, is never logged, and must match THIS token's user.
  let reErr: AuthErr = null;
  let reUser: { id?: string } | null = null;
  try { const r = await pub.auth.signInWithPassword({ email, password }); reErr = r.error; reUser = r.data?.user ?? null; }
  catch { reErr = { name: "AuthRetryableFetchError" }; }
  if (reErr || !reUser) {
    const e = reErr;
    const rate = !!e && (e.status === 429 || e.code === "over_request_rate_limit" || /rate limit|too many/i.test(e.message ?? ""));
    if (rate) { audit("account_delete_refused", { reason: "rate_limited" }); return json(req, { error: "rate_limited" }, 429); }
    const wrong = !!e && (e.code === "invalid_credentials" || /invalid login credentials/i.test(e.message ?? ""));
    if (wrong) { audit("account_delete_refused", { reason: "reauth_failed" }); return json(req, { error: "reauth_failed" }, 403); }
    // Auth down, CAPTCHA or MFA required, unconfirmed email ...: we could not check the password. That is not "wrong password".
    audit("account_delete_refused", { reason: "reauth_unavailable" });
    return json(req, { error: "reauth_unavailable" }, 503);
  }
  if (reUser.id !== u.id) { audit("account_delete_refused", { reason: "reauth_failed" }); return json(req, { error: "reauth_failed" }, 403); }

  // 5. Delete the Auth user (hard delete). beta_access goes with it through ON DELETE CASCADE.
  //    A failure or a timeout here does NOT tell us whether it happened, so we always look again before saying anything.
  let delFailed = false;
  try { const r = await admin.auth.admin.deleteUser(u.id, false); delFailed = !!r.error && !userNotFound(r.error); } catch { delFailed = true; }

  // 6. Verify. Three honest answers: gone, still there, or we cannot tell.
  const authState = await authPresence(u.id);
  if (authState === "present" && delFailed) {
    audit("account_delete_failed", { outcome: "not_deleted" });
    return json(req, { ok: false, error: "not_deleted", outcome: "not_deleted" }, 500);
  }
  if (authState !== "gone") {
    // Unknown, or "present" although the delete call reported success: contradictory or unreadable. Do not claim either result.
    audit("account_delete_uncertain", { delete_call: delFailed ? "error" : "ok", lookup: authState });
    return json(req, { ok: false, error: "uncertain", outcome: "uncertain" }, 503);
  }

  let row = await rowPresence(u.id);
  if (row === "present") {
    // Cascade should have removed it. If it did not, remove it directly (the Auth account is already gone, so this only tidies).
    try { await admin.from("beta_access").delete().eq("user_id", u.id); } catch { /* re-checked below */ }
    row = await rowPresence(u.id);
  }
  if (row !== "gone") {
    audit("account_delete_partial", { stage: "beta_access" });
    return json(req, { ok: false, error: "partial", outcome: "partial", auth_deleted: true }, 500);   // login removed, one record could not be confirmed removed
  }

  audit("account_deleted");
  return json(req, { ok: true, deleted: true, outcome: "deleted" });
});
