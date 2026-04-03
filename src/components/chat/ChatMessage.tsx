import type { Message } from '../../types/chat';

const TOOL_LABELS: Record<string, string> = {
  f1_knowledge: 'Searching knowledge base',
  sql_query: 'Querying race database',
  local_knowledge: 'Local knowledge',
};

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="chat-row chat-row-user">
        <div className="chat-bubble chat-bubble-user">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-row">
      <div className="chat-avatar">
        <span>F1</span>
      </div>
      <div className="chat-response">
        <div className={`chat-bubble chat-bubble-assistant ${message.error ? 'chat-bubble-error' : ''}`}>
          {message.content.split('\n').map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
          {message.streaming && <span className="chat-cursor" />}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="chat-tools">
            {message.toolCalls.map((tool, i) => (
              <span key={`${tool}-${i}`} className="chat-tool-chip">
                <span className="chat-tool-dot" />
                {TOOL_LABELS[tool] ?? tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
