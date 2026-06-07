/**
 * Server-side env validation. Import this at the top of any route handler
 * that requires these vars. Throws at startup (not at first request) so
 * misconfigured deploys fail immediately rather than silently returning 500s.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Add it to .env.local or your deployment environment.`
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  openaiApiKey: () => requireEnv('OPENAI_API_KEY'),
  openaiModel: () => optionalEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  supabaseUrl: () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const;
