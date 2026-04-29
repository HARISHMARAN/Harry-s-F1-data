import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';
import './chat.css';
import { getChatApiBase, getChatMode } from '../../services/chatConfig';

export default function ChatView() {
  const { messages, isLoading, activeToolCall, lastError, sendMessage, clearMessages, clearError } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'degraded' | 'down'>('checking');
  const apiBase = getChatApiBase();
  const chatMode = getChatMode();
  const isOffline = chatMode !== 'online';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(() => clearError(), 5000);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const checkHealth = async () => {
      if (isOffline) {
        if (isMounted) setApiStatus('down');
        return;
      }
      try {
        const timeoutMs = 4000;
        const healthResponse = fetch(`${apiBase}/health`);
        const timeoutResponse = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error(`Health timeout after ${timeoutMs}ms`)), timeoutMs)
        );
        const res = await Promise.race([healthResponse, timeoutResponse]);

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
  }, [isOffline, apiBase]);

  return (
    <section className="chat-shell glass-panel">
      <ChatHeader
        onClear={clearMessages}
        hasMessages={messages.length > 0}
        status={isOffline ? 'offline' : apiStatus}
      />

      <main className="chat-body">
        {lastError && (
          <div className="chat-toast">
            <span className="chat-toast-dot" />
            {lastError}
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
