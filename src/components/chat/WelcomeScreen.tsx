import { getChatApiBase, getChatMode } from '../../services/chatConfig';

const SUGGESTIONS = [
  'Who has the most F1 World Championships?',
  "Who is Lewis Hamilton's teammate?",
  'When did Lando Norris get his first win?',
  'How many races has Kimi Antonelli won?',
];

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

export default function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  const apiBase = getChatApiBase();
  const chatMode = getChatMode();
  const isOffline = chatMode !== 'online';

  return (
    <div className="chat-welcome">
      <div className="chat-welcome-hero">
        <div className="chat-welcome-mark">
          <div />
          <span>F1</span>
          <div />
        </div>
        <h1>Formula 1 AI Chatbot</h1>
        <p>
          Ask me anything about Formula 1.
          {isOffline ? ' Offline mode is active.' : ''}
        </p>
      </div>

      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="chat-suggestion-btn"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
