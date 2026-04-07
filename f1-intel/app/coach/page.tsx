'use client';

import { useState } from 'react';
import Panel from '../../components/ui/Panel';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function CoachPage() {
  const [driver, setDriver] = useState('VER');
  const [lap, setLap] = useState('25');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCoaching = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver, lap: Number(lap) }),
      });
      const data = await res.json();
      setFeedback(data.feedback ?? 'No feedback returned.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel title="AI Driver Coach">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-slate-300">Driver</label>
            <input
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Lap</label>
            <input
              value={lap}
              onChange={(event) => setLap(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={requestCoaching} disabled={loading}>
              {loading ? 'Analyzing...' : 'Generate Coaching'}
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <Panel title="Coaching Feedback">
        <p className="text-sm text-slate-200">{feedback ?? 'Request feedback to see AI coaching.'}</p>
      </Panel>
    </div>
  );
}
