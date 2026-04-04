import { useState, useCallback, useRef } from 'react';
import type { Message } from '../types/chat';
import { getChatbotResponse } from '../services/chatLogic';
import { getOnlineChatbotResponse } from '../services/chatApi';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
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

    try {
      const onlineEnabled = Boolean(import.meta.env.VITE_FORMULA_CHAT_API_URL);
      setActiveToolCall(onlineEnabled ? 'online_chat' : 'f1_knowledge');
      const fullResponse = onlineEnabled
        ? await getOnlineChatbotResponse(trimmed).catch(() => getChatbotResponse(trimmed))
        : await getChatbotResponse(trimmed);
      setActiveToolCall(null);
      
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          streaming: true,
          toolCalls: ['f1_knowledge'],
        },
      ]);
      
      // Simulate streaming response
      const words = fullResponse.split(' ');
      let currentString = '';
      
      for (let i = 0; i < words.length; i++) {
        currentString += (i === 0 ? '' : ' ') + words[i];
        
        await new Promise(resolve => setTimeout(resolve, 30));
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: currentString }
              : m
          )
        );
      }
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );

    } catch {
      setActiveToolCall(null);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: 'Something went wrong while checking the F1 archives. Please try again.',
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationId.current = null;
    setActiveToolCall(null);
  }, []);

  return { messages, isLoading, activeToolCall, sendMessage, clearMessages };
}
