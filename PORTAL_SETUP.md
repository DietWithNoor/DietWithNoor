# Diet With Noor — Client Portal Setup

The client portal is a Next.js 14 App Router app living under `app/app/*` (URL prefix `/app`) in this
same repo, alongside the existing static marketing site (`index.html`, `assets/`) which continues to
serve at `/`. Nothing under `index.html`/`assets/` was touched.

## 1. Supabase project

A Supabase project already exists: **jifqlmzthnzqwfqraaru**
(`https://jifqlmzthnzqwfqraaru.supabase.co`). If you ever need to create a new one instead: go to
https://supabase.com/dashboard, "New Project", pick a region, and note the project URL and API keys
from **Settings > API**.

## 2. Run the SQL migrations

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/migrations/0001_init.sql` — creates all tables (`users`, `profiles`, `weight_logs`,
   `water_logs`, `sleep_logs`, `mood_logs`, `activity_logs`, `achievements`, `streaks`,
   `admin_activity`, `announcements`), the `user_number` sequence starting at 77001, and triggers
   that auto-provision a `users`/`profiles` row when someone signs up via Supabase Auth.
2. `supabase/migrations/0002_rls.sql` — enables Row Level Security and adds policies so users only
   see their own rows, while `role='admin'` users can see everything. `admin_activity` and
   `announcements` are admin-only.

You can also run these with the Supabase CLI: `supabase db push` (after `supabase link`).

## 3. Create the admin user

Sign up normally through `/app/signup` with the admin's real email/password (or use the placeholder
`dietwithnooradmin@example.com` / `pakistanA1` while testing), then promote that account in the SQL
editor:

```sql
update public.users set role = 'admin' where email = 'dietwithnooradmin@example.com';
```

Admins get access to `/app/admin`, `/app/admin/users`, `/app/admin/users/[id]`, and
`/app/admin/export`; regular users are redirected away from `/app/admin/*` by `middleware.ts`.

## 4. Environment variables

Copy `.env.local.example` to `.env.local` for local dev (already done in this workspace with the
known values below — `.env.local` is gitignored and was never committed).

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jifqlmzthnzqwfqraaru.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_DHdKNwFKLB6ssEAFi-wpGg_mrj399hy` (Settings > API Keys > Publishable keys) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Not pulled — sensitive.** Get it yourself from Settings > API Keys > Secret keys > reveal `sb_secret_...`, used only server-side by `app/api/admin/export/route.ts` |

In **Vercel** (project `diet-with-noor`): Settings > Environment Variables, add all three above for
Production (and Preview/Development if desired). The `NEXT_PUBLIC_*` ones must also be set for local
`npm run dev`.

## 4b. Email confirmation link (must work from any browser/device)

Supabase's default "Confirm signup" email template links to `{{ .ConfirmationURL }}`, which uses PKCE
(`?code=...`). PKCE requires a verifier cookie set by the *same browser* that started signup — opening
the link in a different browser, or an email app's in-app browser (Gmail, Outlook), fails with
"PKCE code verifier not found in storage".

Fix: in **Authentication > Email Templates > Confirm signup**, replace the confirmation link with the
OTP-style token, which has no such requirement:

```
{{ .SiteURL }}/app/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

`app/app/auth/callback/route.ts` already handles `token_hash` (preferred) and falls back to the old
`code` param for any link already in flight under the previous template. No further code changes are
needed once the template is updated — `resendConfirmation()` reuses the same template automatically.

## 5. Deploy

This repo already has `.vercel/project.json` linked to the `diet-with-noor` Vercel project.
`vercel.json` at the repo root routes `/` and `/assets/*` to the static files and everything else
(including `/app/*` and Next's own `/_next/*` assets) to the Next.js build. Pushing to `main` will
redeploy both the static site and the portal together — just `git push` when ready (this session
intentionally did not push; the work is committed locally only).

## Notes

- Weight/wellness monetization gate: `/app/progress` only shows the 30-day chart + last 10 entries
  for regular users; unlimited history and CSV export are reserved for `/app/admin/export` (admin-only).
- Gamification (`lib/gamification.ts`) unlocks achievements client-side after weight/water logging
  calls; the weekly wellness score formula lives in `lib/utils.ts` (`computeWellnessScore`).
- `lib/supabase/server.ts` exports both a cookie-scoped `createClient()` (RLS-respecting) and a
  `createAdminClient()` (service-role, server-only) used exclusively by the export API route.
