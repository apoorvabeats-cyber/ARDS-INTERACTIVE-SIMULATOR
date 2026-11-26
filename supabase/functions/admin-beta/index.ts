// Edge Function: admin-beta
// Lets an ADMIN list beta users and approve / reject them. The service-role key lives ONLY here, as a server-side env var.
// Deploy (iPhone/dashboard): Supabase > Edge Functions > Deploy a new function > Via Editor > name it admin-beta > paste this file. Keep "Verify JWT" ON.
// Deploy (computer/CLI):    supabase functions deploy admin-beta
// Secrets (Edge Functions > Secrets, or CLI): ADMIN_EMAILS="you@example.com,other@example.com"  ALLOWED_ORIGINS="https://<user>.github.io"
// Secret names cannot start with SUPABASE_ (reserved).
// Injected by Supabase automatically (never set them by hand, never print them): SUPABASE_URL, and the server key from
// SUPABASE_SECRET_KEYS (new projects) or SUPABASE_SERVICE_ROLE_KEY (legacy). Only ADMIN_EMAILS and ALLOWED_ORIGINS are yours to set.
// Pinned to an exact version so a new upstream release can never change this function by surprise.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
function pickServiceKey(): string {
  // New API keys: SUPABASE_SECRET_KEYS is a JSON object of named secret keys. Legacy projects: SUPABASE_SERVICE_ROLE_KEY.
  try {
    const all = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const v = all.default ?? Object.values(all)[0];
    if (typeof v === "string" && v) return v;
  } catch { /* fall back to the legacy variable */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const SERVICE_KEY = pickServiceKey();
const ADMINS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const STATUSES = ["pending", "approved", "rejected"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!admin) return json(req, { error: "server_misconfigured" }, 500);   // no server key available: fail closed, reveal nothing

  // 1. Who is calling? Validate the JWT with Supabase Auth (never trust a client-sent email).
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "unauthenticated" }, 401);
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json(req, { error: "unauthenticated" }, 401);
  const u = who.user;

  // 2. Are they an admin? Allow-list kept in a server-side secret. Email must be verified.
  const email = (u.email ?? "").toLowerCase();
  if (!u.email_confirmed_at || !email || !ADMINS.includes(email)) return json(req, { error: "forbidden" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // 3. Actions
  if (body.action === "list") {
    const { data, error } = await admin.from("beta_access")
      .select("user_id,email,access_status,created_at").order("created_at", { ascending: false }).limit(1000);
    if (error) return json(req, { error: "db_error" }, 500);
    return json(req, { users: data, me: email });
  }
  if (body.action === "set") {
    const status = String(body.status ?? "");
    const id = String(body.user_id ?? "");
    if (!STATUSES.includes(status) || !UUID.test(id)) return json(req, { error: "bad_request" }, 400);
    const { data, error } = await admin.from("beta_access").update({ access_status: status }).eq("user_id", id)
      .select("user_id,email,access_status,created_at").maybeSingle();
    if (error) return json(req, { error: "db_error" }, 500);
    if (!data) return json(req, { error: "not_found" }, 404);
    console.log(JSON.stringify({ audit: "beta_set", by: email, target: data.email, status }));   // visible in Function logs
    return json(req, { user: data });
  }
  return json(req, { error: "unknown_action" }, 400);
});
