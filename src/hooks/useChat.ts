import { useCallback, useRef, useState } from 'react';
import type { Message, Role, StreamChunk } from '../types/chat';

const API_BASE = import.meta.env.VITE_CHAT_API_BASE ?? '';
const CHAT_MODE = (import.meta.env.VITE_CHAT_MODE ?? 'offline').toLowerCase();

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getFriendlyError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch') {
      return 'Chat API is not reachable. Start the Formula Chat API on http://localhost:8000.';
    }
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

function localChatReply(input: string) {
  const text = input.trim().toLowerCase();

  if (!text) {
    return "Try asking a Formula 1 question, or type 'help' for examples.";
  }

  if (text.includes('help') || text.includes('what can you do')) {
    return [
      'Offline mode is active. I can answer general F1 questions without live data.',
      'Try: "What do yellow flags mean?"',
      'Try: "How does qualifying work?"',
      'Try: "Explain DRS."',
      'For live results and detailed stats, enable online mode.',
    ].join('\n');
  }

  if (text.includes('yellow flag')) {
    return 'Yellow flags mean danger ahead. Drivers must slow down and no overtaking is allowed in that zone.';
  }

  if (text.includes('red flag')) {
    return 'Red flag means the session is stopped due to unsafe conditions. Cars return to the pit lane and await instructions.';
  }

  if (text.includes('drs')) {
    return 'DRS (Drag Reduction System) allows a driver to open the rear wing flap in designated zones when within 1.0s of the car ahead, reducing drag and increasing top speed.';
  }

  if (text.includes('qualifying')) {
    return 'Qualifying is usually split into Q1, Q2, and Q3. The slowest drivers are eliminated each round, and the fastest in Q3 takes pole position.';
  }

  if (text.includes('pit stop')) {
    return 'Pit stops are for tyre changes and repairs. Strategy often balances tyre life, pace, and track position.';
  }

  if (text.includes('championship') && text.includes('most')) {
    return 'Michael Schumacher and Lewis Hamilton share the record for most F1 World Championships with 7 each.';
  }

  return [
    'Offline mode: I can answer general F1 concepts, rules, and strategy.',
    'For live stats and detailed historical data, enable online mode.',
    "Try asking: 'What is DRS?' or 'Explain yellow flags.'",
  ].join('\n');
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmed = content.trim();

    if (CHAT_MODE !== 'online') {
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: localChatReply(trimmed),
        timestamp: new Date(),
        toolCalls: ['local_knowledge'],
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setActiveToolCall(null);
    setLastError(null);

    const assistantId = generateId();
    let streamingStarted = false;
    const pendingToolCalls: string[] = [];

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role as Role,
        content: m.content,
      }));

      const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history,
          conversation_id: conversationId.current ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response stream available.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (chunk.type === 'delta') {
            if (!streamingStarted) {
              streamingStarted = true;
              setIsLoading(false);
              setActiveToolCall(null);
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: chunk.content,
                  timestamp: new Date(),
                  streaming: true,
                  toolCalls: pendingToolCalls.length ? pendingToolCalls : [],
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk.content }
                    : m
                )
              );
            }
          } else if (chunk.type === 'tool_call') {
            const toolName = chunk.tool_name ?? 'tool';
            setActiveToolCall(toolName);
            if (streamingStarted) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolName] }
                    : m
                )
              );
            } else {
              pendingToolCalls.push(toolName);
            }
          } else if (chunk.type === 'done') {
            if (chunk.conversation_id) {
              conversationId.current = chunk.conversation_id;
            }
            setActiveToolCall(null);
            setIsLoading(false);

            if (!streamingStarted) {
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: chunk.content || 'No response returned.',
                  timestamp: new Date(),
                  streaming: false,
                  toolCalls: pendingToolCalls.length ? pendingToolCalls : [],
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: chunk.content && chunk.content.length > m.content.length ? chunk.content : m.content,
                        streaming: false,
                      }
                    : m
                )
              );
            }
          } else if (chunk.type === 'error') {
            setActiveToolCall(null);
            setLastError(chunk.content);
            setIsLoading(false);
            if (streamingStarted) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: chunk.content, streaming: false, error: true }
                    : m
                )
              );
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: chunk.content,
                  timestamp: new Date(),
                  error: true,
                },
              ]);
            }
          }
        }
      }
    } catch (err) {
      setActiveToolCall(null);
      setIsLoading(false);
      const errorContent = getFriendlyError(err);
      setLastError(errorContent);

      if (streamingStarted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errorContent, streaming: false, error: true }
              : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: errorContent,
            timestamp: new Date(),
            error: true,
          },
        ]);
      }
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationId.current = null;
    setActiveToolCall(null);
    setLastError(null);
  }, []);

  return { messages, isLoading, activeToolCall, lastError, sendMessage, clearMessages };
}
