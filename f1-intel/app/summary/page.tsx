'use client';

import { useState } from 'react';
import Panel from '../../components/ui/Panel';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function SummaryPage() {
  const [raceId, setRaceId] = useState('latest');
  const [summary, setSummary] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId }),
      });
      const data = await res.json();
      setTitle(data.title ?? 'Race Summary');
      setSummary(data.summary ?? 'No summary returned.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel title="AI Race Summarizer">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-slate-300">Race ID</label>
            <input
              value={raceId}
              onChange={(event) => setRaceId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={generateSummary} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <Panel title={title ?? 'Summary Output'}>
        <p className="text-sm text-slate-200 whitespace-pre-line">{summary ?? 'Generate a report to view summary.'}</p>
      </Panel>
    </div>
  );
}
