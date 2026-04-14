import type { ReactElement } from 'react';
import { Terminal, Gauge, MessageSquare, LineChart, Code, BarChart3 } from 'lucide-react';

interface AddonLibraryProps {
  onOpenReplay: () => void;
  onOpenChat: () => void;
  onOpenPredictions: () => void;
}

interface AddonDefinition {
  id: string;
  name: string;
  author: string;
  description: string;
  icon: ReactElement;
  stack: string[];
  cmd: string;
  embedded?: boolean;
  action?: 'REPLAY' | 'CHAT' | 'PREDICTIONS';
  actionLabel?: string;
}

const ADDONS: AddonDefinition[] = [
  {
    id: 'f1-race-replay',
    name: 'F1 Race Replay',
    author: "Harry's Pitwall",
    description: 'A browser-native race replay embedded directly into localhost using OpenF1 session, lap, race-control, and position data.',
    icon: <Gauge size={24} color="var(--accent-f1)" />,
    stack: ['React', 'TypeScript', 'OpenF1', 'SVG'],
    embedded: true,
    cmd: 'Built into the dashboard. Open the Race Replay tab to use it.'
  },
  {
    id: 'formula-chat',
    name: 'Formula Chat',
    author: 'IAmTomShaw',
    description: 'A Formula 1-themed chatbot that knows everything about your favourite motorsport series.',
    icon: <MessageSquare size={24} color="var(--accent-blue)" />,
    stack: ['Python', 'OpenAI', 'RAG'],
    embedded: true,
    action: 'CHAT',
    actionLabel: 'Open Chat In Dashboard',
    cmd: 'Built into the dashboard. Open the Chatbot tab to use it.'
  },
  {
    id: 'racing-lap-trace-python',
    name: 'Lap Trace Visualizer',
    author: 'IAmTomShaw',
    description: 'Generates telemetry trace overlays specifically tailored for deep racing lap analysis.',
    icon: <LineChart size={24} color="var(--success)" />,
    stack: ['Python', 'Matplotlib'],
    cmd: 'cd addons/racing-lap-trace-python && pip install -r requirements.txt && python3 trace.py'
  },
  {
    id: '2026-f1-predictions',
    name: '2026 F1 Predictions',
    author: 'mar-antaya',
    description: 'A script-based prediction pack for the 2026 season with race order and pace analysis outputs.',
    icon: <BarChart3 size={24} color="var(--accent-success)" />,
    stack: ['Python', 'XGBoost', 'FastF1', 'pandas'],
    embedded: true,
    action: 'PREDICTIONS',
    actionLabel: 'Open Predictions In Dashboard',
    cmd: 'cd addons/2026_f1_predictions && pip install -r requirements.txt && python3 prediction1.py'
  },
  {
    id: 'f1-rag-ai',
    name: 'F1 RAG Database',
    author: 'IAmTomShaw',
    description: 'Retrieval-Augmented Generation (RAG) agent written in TypeScript for answering complex historical formula dataset queries.',
    icon: <Code size={24} color="#f0db4f" />,
    stack: ['TypeScript', 'LangChain', 'Node.js'],
    cmd: 'cd addons/f1-rag-ai && npm install && npm run start'
  }
];

export default function AddonLibrary({ onOpenReplay, onOpenChat, onOpenPredictions }: AddonLibraryProps) {
  return (
    <div style={{ animation: 'fade-in 0.4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #ffffff, #8c8c94)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MONOREPO ADD-ONS
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          The replay now runs first-class inside the dashboard, while the remaining tools still live under <code>addons/</code> for terminal-driven workflows.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {ADDONS.map((addon) => (
          <div key={addon.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '4px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                {addon.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem', fontWeight: 700 }}>{addon.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  By {addon.author}
                </span>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', flexGrow: 1 }}>
              {addon.description}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {addon.stack.map(tag => (
                <span key={tag} style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: '20px', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {addon.embedded && addon.action === 'REPLAY' ? (
              <button
                type="button"
                className="replay-button"
                onClick={onOpenReplay}
                style={{ alignSelf: 'flex-start' }}
              >
                {addon.actionLabel ?? 'Open Replay In Dashboard'}
              </button>
            ) : null}

            {addon.embedded && addon.action === 'CHAT' ? (
              <button
                type="button"
                className="replay-button"
                onClick={onOpenChat}
                style={{ alignSelf: 'flex-start' }}
              >
                {addon.actionLabel ?? 'Open Chat In Dashboard'}
              </button>
            ) : null}

            {addon.embedded && addon.action === 'PREDICTIONS' ? (
              <button
                type="button"
                className="replay-button"
                onClick={onOpenPredictions}
                style={{ alignSelf: 'flex-start' }}
              >
                {addon.actionLabel ?? 'Open Predictions In Dashboard'}
              </button>
            ) : null}

            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-light)', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Terminal size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {addon.embedded ? 'ACCESS MODE' : 'LAUNCH COMMAND'}
                </span>
              </div>
              <code style={{ fontSize: '0.8rem', color: 'var(--accent-success)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {addon.cmd}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
