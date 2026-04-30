# Vercel Security Deploy Checklist

Target hosting: Vercel production deployment.

Expected public URL: use the Vercel production domain assigned to the project,
for example `harry7-data.vercel.app`, or attach a custom domain in Vercel.
Vercel default project domains use `vercel.app`; `vercel.com` is the Vercel
website, not the normal app-hosting domain.

## What Is Enforced In This Repo

- Google sign-in is required in production when Supabase env vars are present.
- Production is locked if Supabase env vars are missing.
- Browser source maps are disabled for production builds.
- Next `X-Powered-By` is disabled.
- All routes receive security headers from `next.config.mjs`:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
  - `X-DNS-Prefetch-Control`
  - `X-Robots-Tag`
- Search indexing is blocked through metadata and `/robots.txt`.

## Vercel Environment Variables

Set these in `Project Settings > Environment Variables` for Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-SUPABASE-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Only use Supabase's public anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Never put service-role keys in a `NEXT_PUBLIC_` variable.

## Supabase Auth

Follow `docs/SUPABASE_GOOGLE_AUTH.md`:

1. Run the `user_profiles` migration.
2. Enable the Google provider.
3. Add the Vercel production URL to Supabase Auth URL settings.
4. Add the Supabase callback URL to Google Cloud OAuth.

The app stores only the authenticated user's `email`, `full_name`, user id, and
`last_seen_at` in `public.user_profiles`.

## Vercel Dashboard Settings

Use these dashboard settings before sharing the link:

- Production branch: `main`.
- Framework preset: Next.js.
- Build command: `npm run build`.
- Deployment protection:
  - For a public friend-share link, keep production public and rely on the app's
    Google/Supabase sign-in gate.
  - If the whole site must be private before even loading the app, enable Vercel
    Deployment Protection. Production-domain protection depends on the Vercel
    plan and dashboard settings.
- Disable or restrict preview deployment sharing if previews should not be used
  by friends.

## What Friends Can And Cannot Access

Friends can access the built application after Google sign-in. They cannot browse
the repository source files, `.git`, server bundle internals, or local files from
the deployed URL. Vercel serves the built Next application, not the working
directory.

Do not add secrets to client files, public env vars, `public/`, or committed
docs. Anything committed to GitHub or exposed through `NEXT_PUBLIC_` should be
treated as public.
