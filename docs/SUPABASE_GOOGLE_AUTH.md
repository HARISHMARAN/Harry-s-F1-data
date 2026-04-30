# Supabase Google Auth Setup

This dashboard uses Supabase Auth with Google OAuth before showing the app to
shared users.

The app profile table stores only:

- `full_name`
- `email`

Supabase Auth also keeps its normal internal user id/session records so the
login can work securely.

## Supabase Setup

1. Create or open a Supabase project.
2. Run the SQL migration:

```bash
supabase db push
```

Or paste `supabase/migrations/20260430054500_create_user_profiles.sql` into the
Supabase SQL editor and run it.

3. In Supabase, open `Authentication > Providers > Google`.
4. Enable Google.
5. Add your Google OAuth client id and secret.
6. Add the Vercel production URL to `Authentication > URL Configuration`:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app
```

7. Add the callback URL in Google Cloud OAuth:

```text
https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
```

## Vercel Environment Variables

Add these to the Vercel project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-SUPABASE-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Redeploy after saving the variables.

## Runtime Behavior

- Local development stays open if Supabase env vars are missing.
- Production is locked if Supabase env vars are missing.
- When Supabase env vars are present, users must sign in with Google.
- After sign-in, the app upserts `id`, `email`, `full_name`, and `last_seen_at`
  into `public.user_profiles`.
- Row level security allows each signed-in user to read and update only their
  own profile row.
