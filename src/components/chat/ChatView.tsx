import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';
import './chat.css';

export default function ChatView() {
  const { messages, isLoading, activeToolCall, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'degraded' | 'down'>('checking');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/health', { signal: controller.signal });
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
    timer = setInterval(checkHealth, 20000);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <section className="chat-shell glass-panel">
      <ChatHeader onClear={clearMessages} hasMessages={messages.length > 0} status={apiStatus} />

      <main className="chat-body">
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
