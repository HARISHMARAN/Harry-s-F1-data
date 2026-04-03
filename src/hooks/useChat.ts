import { useCallback, useRef, useState } from 'react';
import type { Message, Role, StreamChunk } from '../types/chat';

const API_BASE = import.meta.env.VITE_CHAT_API_BASE ?? '';

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

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmed = content.trim();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setActiveToolCall(null);

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
  }, []);

  return { messages, isLoading, activeToolCall, sendMessage, clearMessages };
}
