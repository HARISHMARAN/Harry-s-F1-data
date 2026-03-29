import React from 'react';
import { Terminal, Database, MessageSquare, LineChart, Code } from 'lucide-react';

const ADDONS = [
  {
    id: 'f1-race-replay',
    name: 'F1 Race Replay',
    author: 'IAmTomShaw',
    description: 'An interactive Formula 1 race visualisation and data analysis tool built natively with PySide6 and Arcade.',
    icon: <Database size={24} color="var(--accent-f1)" />,
    stack: ['Python', 'PySide6', 'FastF1', 'Arcade'],
    cmd: 'cd addons/f1-race-replay && pip install -r requirements.txt && python3 main.py'
  },
  {
    id: 'formula-chat',
    name: 'Formula Chat',
    author: 'IAmTomShaw',
    description: 'A Formula 1-themed chatbot that knows everything about your favourite motorsport series.',
    icon: <MessageSquare size={24} color="var(--accent-blue)" />,
    stack: ['Python', 'OpenAI'],
    cmd: 'cd addons/formula-chat && pip install -r requirements.txt && python3 chat.py'
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
    id: 'f1-rag-ai',
    name: 'F1 RAG Database',
    author: 'IAmTomShaw',
    description: 'Retrieval-Augmented Generation (RAG) agent written in TypeScript for answering complex historical formula dataset queries.',
    icon: <Code size={24} color="#f0db4f" />,
    stack: ['TypeScript', 'LangChain', 'Node.js'],
    cmd: 'cd addons/f1-rag-ai && npm install && npm run start'
  }
];

export default function AddonLibrary() {
  return (
    <div style={{ animation: 'fade-in 0.4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #ffffff, #8c8c94)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MONOREPO ADD-ONS
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          These powerful native Command Line & Desktop GUI utilities are stored statically within Harry's Pitwall inside the <code>addons/</code> directory. Copy their launch commands into your terminal to execute them natively alongside the dashboard!
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

            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-light)', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Terminal size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>LAUNCH COMMAND</span>
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
