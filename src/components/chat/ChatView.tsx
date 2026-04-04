import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';
import './chat.css';

export default function ChatView() {
  const { messages, isLoading, activeToolCall, lastError, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'degraded' | 'down'>('checking');
  const [toast, setToast] = useState<string | null>(null);
  const apiBase =
    import.meta.env.VITE_FORMULA_CHAT_API_URL ??
    import.meta.env.VITE_CHAT_API_BASE ??
    '';
  const rawChatMode = (import.meta.env.VITE_CHAT_MODE ?? '').toLowerCase();
  const chatMode = rawChatMode || (apiBase ? 'online' : 'offline');
  const isOffline = chatMode !== 'online';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!lastError) return;
    setToast(lastError);
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [lastError]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const checkHealth = async () => {
      if (isOffline) {
        if (isMounted) setApiStatus('down');
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${apiBase}/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          if (isMounted) setApiStatus('down');
          return;
        }

        const data = (await res.json()) as { status?: string };
        if (!isMounted) return;
        if (data.status === 'ok') {
          setApiStatus('ok');
        } else if (data.status === 'degraded') {
          setApiStatus('degraded');
        } else {
          setApiStatus('down');
        }
      } catch {
        if (isMounted) setApiStatus('down');
      }
    };

    checkHealth();
    if (!isOffline) {
      timer = setInterval(checkHealth, 20000);
    }

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [isOffline]);

  return (
    <section className="chat-shell glass-panel">
      <ChatHeader
        onClear={clearMessages}
        hasMessages={messages.length > 0}
        status={isOffline ? 'offline' : apiStatus}
      />

      <main className="chat-body">
        {toast && (
          <div className="chat-toast">
            <span className="chat-toast-dot" />
            {toast}
          </div>
        )}
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={sendMessage} />
        ) : (
          <div className="chat-thread">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator toolName={activeToolCall} />}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </section>
  );
}
