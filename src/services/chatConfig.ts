const DEFAULT_CHAT_API_BASE = 'https://harry-s-f1-api-s.vercel.app';

export function getChatApiBase() {
  return (
    process.env.NEXT_PUBLIC_FORMULA_CHAT_API_URL ??
    process.env.NEXT_PUBLIC_CHAT_API_BASE ??
    DEFAULT_CHAT_API_BASE
  );
}

export function getChatMode() {
  const rawChatMode = (process.env.NEXT_PUBLIC_CHAT_MODE ?? '').toLowerCase();
  if (rawChatMode) return rawChatMode;
  const apiBase = getChatApiBase();
  return apiBase ? 'online' : 'offline';
}

