# Beta login for Critical Care Universe

Visitors must sign in. Only accounts with `beta_access.access_status = 'approved'` reach the app. The existing app is untouched: `assets/startup.js` is the same file, it is just loaded after approval.

## What changed

New files
- `critical-care-universe/auth/gate.js`, `gate.css`: login, sign up, verify email, forgot/reset password, pending, denied, and the access check.
- `critical-care-universe/auth/config.js`: where YOU paste the Supabase URL and anon key.
- `critical-care-universe/auth/vendor/supabase.js` (+ licence): Supabase JS 2.119.2, copied into the repo because the site uses no CDN.
- `critical-care-universe/admin/index.html`: admin page to list users and approve/reject.
- `supabase/functions/admin-beta/index.ts`: the Edge Function behind the admin page.
- `supabase/sql/beta-access-hardening.sql`: checks and fixes for your existing table (does not recreate it).

Edited files
- `critical-care-universe/index.html`: the one `<script defer src="./assets/startup.js">` line became the gate includes (`gate.css`, `config.js`, `supabase.js`, `gate.js`).
- `critical-care-universe/home/home.js`: Settings gets a **Sign out** button, only when signed in through the gate.

## One-time setup (about 15 minutes)

### 1. Supabase Auth settings
Dashboard > Authentication > URL Configuration
- **Site URL**: `https://<your-github-user>.github.io/<repo>/critical-care-universe/`
- **Redirect URLs**: add the same URL (and `http://localhost:8765/critical-care-universe/` for local testing). Without this, the email links will not return to your site.

Authentication > Providers > Email: keep **Confirm email** ON. Keep anonymous sign-ins OFF. Optionally set a minimum password length of 8 under Authentication > Policies.

### 2. Run the SQL checks
SQL Editor > paste `supabase/sql/beta-access-hardening.sql`. Run PART 1 first and read the results (one SELECT-only policy, RLS on, `handle_new_user` is security definer). Then run PART 2. PART 3 is only for the case PART 1 shows a problem.

### 3. Put the URL and anon key in the site
Dashboard > Project Settings > API. Copy **Project URL** and the key labelled **anon / public** into `critical-care-universe/auth/config.js`:
```js
supabaseUrl: "https://abcdefghijkl.supabase.co",
supabaseAnonKey: "eyJ...",
```
The anon key is designed to be public. **Never** paste the `service_role` key anywhere in this repo. If `config.js` contains one, the gate refuses to start and tells you to rotate it.

### 4. Deploy the admin Edge Function
Install the Supabase CLI, then in the repo root:
```
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ADMIN_EMAILS="you@example.com" ALLOWED_ORIGINS="https://<your-github-user>.github.io"
supabase functions deploy admin-beta
```
- `ADMIN_EMAILS`: comma-separated admins. The function checks the caller's verified token against this list on the server.
- `ALLOWED_ORIGINS`: your Pages origin (scheme + host, no path). Other origins get no CORS header.
- The service-role key is injected into the function by Supabase. You never type it anywhere.
- Create the admin's own account by signing up normally on the site, then open `/critical-care-universe/admin/`.

### 5. Deploy the site (GitHub Pages)
```
git checkout main
git merge beta-login
git push origin main
```
Pages rebuilds in about a minute. Open the site in a private window: you should see the login screen.

## How to test
1. Open the site. The login appears; the app does not.
2. **Create account** with a real inbox. You see "Check your email". Trying to sign in before confirming is refused.
3. Open the email link on the same device. You land on "Your request is pending". The app is still locked.
4. Open `/admin/`, sign in as an admin, press **Approve** on that user.
5. Back on the pending screen press **Check status now** (it also checks every 15 s). The legal screens and the app start.
6. Close the tab, reopen: you are still signed in and re-checked. Settings > **Sign out** returns to the login.
7. Reject another test user: they see the polite "Access not granted" screen.
8. Forgot password: request a link, open it, set a new password.
9. Non-admin test: sign in to `/admin/` with a normal account. You get "not an administrator" and no list.

## Security notes
- The browser holds only the URL and anon key. Approving users happens in the Edge Function (service role server-side only, admin allow-list, verified JWT, CORS limited to your origin). Hiding the admin page would prove nothing; the function decides.
- `beta_access` has RLS on with one policy: a user can SELECT their own row. No client can insert, update or delete. PART 2 of the SQL also revokes those privileges.
- The gate reads the status for the signed-in identity (`auth.uid()`), never from anything the user types.
- A session is re-checked every 2 minutes and when the tab regains focus. Withdrawing approval sends the user back to the gate.

## What a static gate can and cannot do (important)
GitHub Pages serves static files to anyone who asks for the URL. This gate controls the **screen**, not the **files**. Someone who knows a file path (for example `/critical-care-universe/home/index.html` or the `universe/*` pages) can still request it directly, read the source, or use developer tools. Deep links to those pages are NOT gated. The gate is a good fit for access control on a beta, onboarding and usage tracking. It is not a way to keep source code, images or content confidential.

To protect assets that really are confidential:
1. Move them out of the public repo into **Supabase Storage in a private bucket** (or another private store).
2. Add Storage RLS policies that allow `select` only when the caller's `beta_access` row is `approved`.
3. The app then asks Supabase for a short-lived signed URL (or a small Edge Function streams the file) after login, and never ships the files in the Pages bundle.
4. For whole pages or server logic, host behind something that can check the session before sending bytes (Cloudflare Access, Netlify/Vercel edge middleware, or an Edge Function that returns the HTML).

## Changelog
- Added beta login gate (sign up, email verification, login, logout, forgot/reset password, session persistence, expired-session handling).
- Added pending and denied screens; approved users enter the existing app unchanged.
- Added admin page and `admin-beta` Edge Function; added SQL checks/hardening.
- Home Settings: Sign out.
