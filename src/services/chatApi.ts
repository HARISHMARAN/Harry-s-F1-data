const CHAT_API_URL = import.meta.env.VITE_FORMULA_CHAT_API_URL as string | undefined;

export async function getOnlineChatbotResponse(message: string): Promise<string> {
  if (!CHAT_API_URL) {
    throw new Error('Online chat API is not configured.');
  }

  const response = await fetch(`${CHAT_API_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history: [] }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const data = await response.json();
  return (
    data.answer ??
    data.message ??
    data.response ??
    'No response returned from the chat API.'
  );
}
