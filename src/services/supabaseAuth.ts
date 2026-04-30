import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let browserClient: SupabaseClient | null = null;

export type MinimalUserProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

export function isSupabaseAuthConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function shouldBypassAuthGate() {
  return !isSupabaseAuthConfigured() && process.env.NODE_ENV !== 'production';
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseAuthConfigured()) return null;
  if (typeof window === 'undefined') return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function buildMinimalUserProfile(user: Pick<User, 'id' | 'email' | 'user_metadata'>): MinimalUserProfile | null {
  const email = user.email?.trim();
  if (!email) return null;

  const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
  const fullName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;

  return {
    id: user.id,
    email,
    full_name: fullName,
  };
}

export async function upsertMinimalUserProfile(client: SupabaseClient, user: User) {
  const profile = buildMinimalUserProfile(user);
  if (!profile) return;

  await client
    .from('user_profiles')
    .upsert(
      {
        ...profile,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .throwOnError();
}
