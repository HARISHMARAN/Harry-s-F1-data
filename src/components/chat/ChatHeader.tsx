interface ChatHeaderProps {
  onClear: () => void;
  hasMessages: boolean;
  status: 'checking' | 'ok' | 'degraded' | 'down' | 'offline';
}

export default function ChatHeader({ onClear, hasMessages, status }: ChatHeaderProps) {
  const label = status === 'offline'
    ? 'MODE: OFFLINE'
    : status === 'checking'
      ? 'API: CHECKING'
      : status === 'ok'
        ? 'API: OK'
        : status === 'degraded'
          ? 'API: DEGRADED'
          : 'API: DOWN';

  return (
    <header className="chat-header">
      <div className="chat-brand">
        <div className="chat-brand-mark">
          <span>F1</span>
        </div>
        <div className="chat-brand-divider" />
        <span className="chat-brand-label">Chatbot</span>
      </div>

      <div className="chat-status">
        <span className={`chat-status-dot chat-status-${status}`} />
        <span className="chat-status-text">{label}</span>
      </div>

      {hasMessages && (
        <button
          type="button"
          onClick={onClear}
          className="chat-reset-btn"
        >
          New chat
        </button>
      )}
    </header>
  );
}
