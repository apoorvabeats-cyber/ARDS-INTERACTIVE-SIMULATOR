# Beta login for Critical Care Universe

Visitors must sign in. Only accounts with `beta_access.access_status = 'approved'` reach the app. The existing app is untouched: `assets/startup.js` is the same file, it is just loaded after approval.

## What changed

New files
- `critical-care-universe/auth/gate.js`, `gate.css`, `logo.jpg`: login, sign up, verify email, forgot/reset password, pending, denied, and the access check.
- `critical-care-universe/auth/config.js`: where YOU paste the Supabase URL and anon key.
- `critical-care-universe/auth/vendor/supabase.js` (+ licence): Supabase JS 2.119.2, copied into the repo because the site uses no CDN.
- `critical-care-universe/admin/index.html`: admin page to list users and approve/reject.
- `supabase/functions/admin-beta/index.ts`: the Edge Function behind the admin page.
- `supabase/sql/beta-access-hardening.sql`: checks and fixes for your existing table (does not recreate it).

Edited files
- `critical-care-universe/index.html`: the one `<script defer src="./assets/startup.js">` line became the gate includes.
- `critical-care-universe/home/home.js`: Settings gets a **Sign out** button, only when signed in through the gate.

## IMPORTANT before you merge to main
Until `auth/config.js` holds your real URL and anon key, the gate shows "Beta login is not configured" and **locks everyone out, including you**. That is deliberate (it fails closed). Do steps 1 to 6 first, merge in step 7.

## Setup, step by step (works entirely on an iPhone in Safari)

### 1. Make Supabase able to email your testers (required): Brevo SMTP
Supabase's built-in email sender only delivers to members of your Supabase organization, and only about 2 emails per hour. Anyone else gets "Email address not authorized", so signups would never receive the confirmation link. Fix it with custom SMTP.

**1a. Brevo: a verified sender.** Brevo only sends from an address you have verified.
- Brevo > top-right account menu > **Senders, Domains & Dedicated IPs** > **Senders** > **Add a sender**. Enter a name (for example "Critical Care Universe") and the email address, then open the verification message Brevo sends to that address and confirm it.
- Best deliverability: use an address on a domain you own (for example `no-reply@yourdomain.com`) and authenticate the domain under the **Domains** tab by adding the SPF and DKIM records Brevo shows you at your domain registrar (can take up to 24 to 48 hours). Free-mail senders (Gmail, Yahoo) often land in spam or are rejected.
- The sender email you enter in Supabase must exactly match a verified Brevo sender.

**1b. Brevo: find your SMTP details.** Brevo > gear icon (Settings) > **SMTP & API** > **SMTP** tab. You need the **Login** shown there and your **SMTP key** (the one you generated; an API key will not work).

**1c. Supabase: turn it on.** Supabase > Authentication > Emails > **SMTP Settings** > **Enable custom SMTP**, then enter:
| Field | Value |
|---|---|
| Sender email address | your verified Brevo sender |
| Sender name | Critical Care Universe |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the **Login** shown on Brevo's SMTP tab (if none is shown, your Brevo account email) |
| Password | your Brevo **SMTP key** |
| Minimum interval per user | leave at 60 seconds |

Save changes. Type the SMTP key only into that Supabase field. **Never** put it in GitHub, in this repo, in `config.js`, or in chat.

**1d. Email limits.** With custom SMTP the default is 30 auth emails per hour. Authentication > Rate Limits lets you change it; keep it within your Brevo plan's daily sending limit.

**1e. Test.** Sign up on the live site with an email that is NOT on your Supabase team. The confirmation email should arrive (check spam). In Brevo, Transactional > Logs shows each message and whether it was delivered.

### 2. Tell Supabase where your site lives
Authentication > URL Configuration
- **Site URL**: your site folder, ending with `/`. Probably `https://apoorvabeats-cyber.github.io/ards-interactive-simulator/critical-care-universe/` (open your live site to confirm the exact address).
- **Redirect URLs**: add the same address.

Authentication > Sign In / Providers > **Email**: open it and make sure **Confirm email** is ON. Keep anonymous sign-ins OFF. Without the redirect entry, the email links will not bring people back to your site.

The address must match the live site exactly. Open your live site in Safari, go to the Critical Care Universe folder, and copy the address bar up to and including the final `/` (capital and small letters matter). If an email link ever drops people on the wrong page, add `https://apoorvabeats-cyber.github.io/**` as an extra Redirect URL (it covers only your own GitHub Pages address).

### 3. Check and harden the database
SQL Editor > paste `supabase/sql/beta-access-hardening.sql` (open it on GitHub on the `beta-login` branch, tap Raw, select all, copy).
- Run **PART 1** first (all read-only). Expected: one SELECT-only policy (`auth.uid() = user_id`), RLS true, `handle_new_user` security definer, trigger `on_auth_user_created` enabled (query 1f), and list 1e showing people with no row.
- Then run PART 2 one step at a time: 2a (backfill, only matters if 1e listed people), 2b (harmless), 2c (removes write privileges from the browser roles), 2d (only if 1g shows no existing check or enum on `access_status`).
- Do not run PART 3 unless 1d showed a problem.

### 4. Add the admin secrets
Edge Functions > Secrets > add:
- `ADMIN_EMAILS` = your email (several: separate with commas)
- `ALLOWED_ORIGINS` = `https://apoorvabeats-cyber.github.io` (no path, no trailing slash)

Secret names cannot start with `SUPABASE_`. The service-role key is already available to the function automatically; you never type it anywhere.

### 5. Deploy the admin function
Edge Functions > Deploy a new function > **Via Editor**. Name it exactly `admin-beta`. Paste the whole of `supabase/functions/admin-beta/index.ts`. Leave **Verify JWT** on. Deploy.

(Computer alternative: `supabase functions deploy admin-beta` after `supabase link`.)

### 6. Put the URL and anon key into the site
Supabase > Project Settings > API. Copy **Project URL** and the key labelled **anon / public**. Do NOT copy `service_role`.

On GitHub, open `critical-care-universe/auth/config.js` on the `beta-login` branch, tap the pencil, replace the two placeholder texts, then Commit changes directly to `beta-login`.
The gate refuses to start if it detects a service_role key.

### 7. Go live
GitHub > Pull requests > New pull request > base `main`, compare `beta-login` > Create > Merge. GitHub Pages rebuilds in 1 to 2 minutes.

### 8. First run
1. In a private tab open the site. You see the login.
2. **Create account** with your own email and confirm it from the email.
3. Open `/critical-care-universe/admin/`, sign in, and **approve your own account**. An admin must also be approved to enter the app.
4. Back on the site you enter the app.
5. Test with a second email: sign up, confirm, see "pending", approve it from the admin page, enter, then Settings > Sign out.
6. Reject a test user: they see the polite "Access not granted" screen.
7. Forgot password: request a link, open it, set a new password.
8. Sign in to `/admin/` with a non-admin account: "not an administrator", no list.

## Security notes
- The browser holds only the URL and anon key. Approving users happens in the Edge Function (service role on the server only, admin allow-list, verified login token, CORS limited to your origin). Hiding the admin page would prove nothing; the function decides.
- `beta_access` has RLS on with one policy: a user can SELECT only their own row. Nobody can insert, update or delete from the browser. 2c also revokes those privileges.
- The gate reads the status for the signed-in identity (`auth.uid()`), never from anything the user types.
- A session is re-checked every 2 minutes and when the tab regains focus. Withdrawing approval sends the user back to the gate.
- Admin rights are by email (`ADMIN_EMAILS`) and rely on "Confirm email" staying ON. Keep it on.

## What a static gate can and cannot do (important)
GitHub Pages serves static files to anyone who asks for the URL. This gate controls the **screen**, not the **files**. Someone who knows a file path (for example `/critical-care-universe/home/index.html` or the `universe/*` pages) can still request it, read the source, or use developer tools. Those deep links are NOT gated. The gate is good for beta access control, onboarding and usage tracking. It is not a way to keep source code, images or content confidential.

To protect assets that really are confidential:
1. Move them out of the public repo into **Supabase Storage in a private bucket**.
2. Add Storage policies that allow `select` only when the caller's `beta_access` row is `approved`.
3. The app asks Supabase for a short-lived signed URL after login and never ships those files in the Pages bundle.
4. For whole pages or server logic, host behind something that checks the session before sending bytes (Cloudflare Access, an edge function, or similar).

## Changelog
- Added beta login gate (sign up, email verification, login, logout, forgot/reset password, session persistence, expired-session handling) with the Critical Care Universe logo.
- Added pending and denied screens; approved users enter the existing app unchanged.
- Added admin page and `admin-beta` Edge Function (pinned supabase-js 2.119.2); added SQL checks/hardening including trigger and constraint verification.
- Home Settings: Sign out.
- README: custom-email requirement, iPhone/dashboard-only steps, admin self-approval note.
