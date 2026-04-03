const TOOL_LABELS: Record<string, string> = {
  f1_knowledge: 'Searching knowledge base…',
  sql_query: 'Querying race database…',
  local_knowledge: 'Local knowledge…',
};

interface TypingIndicatorProps {
  toolName?: string | null;
}

export default function TypingIndicator({ toolName }: TypingIndicatorProps) {
  return (
    <div className="chat-row">
      <div className="chat-avatar">
        <span>F1</span>
      </div>
      <div className="chat-response">
        <div className="chat-bubble chat-bubble-assistant">
          {toolName ? (
            <span className="chat-tool-status">
              <span className="chat-tool-dot" />
              {TOOL_LABELS[toolName] ?? `${toolName}…`}
            </span>
          ) : (
            <div className="chat-typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
