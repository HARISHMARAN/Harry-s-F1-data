import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSend(value);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="chat-input-wrap">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isLoading}
          placeholder="Ask anything about Formula One…"
          rows={1}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="chat-send-btn"
          aria-label="Send message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
      <p className="chat-hint">
        Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
