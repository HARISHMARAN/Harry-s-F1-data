'use client';

import { useState } from 'react';
import Panel from '../../components/ui/Panel';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function PredictorPage() {
  const [raceId, setRaceId] = useState('next');
  const [predictions, setPredictions] = useState<Array<{ driver: string; position: number; confidence: number }> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId }),
      });
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel title="Race Result Predictor">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-slate-300">Race</label>
            <input
              value={raceId}
              onChange={(event) => setRaceId(event.target.value)}
              className="race-input mt-2"
            />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={loadPrediction} disabled={loading}>
              {loading ? 'Predicting...' : 'Generate Predictions'}
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <Panel title="Predicted Grid">
        {!predictions?.length && <p className="text-sm text-slate-300">Run a prediction to see results.</p>}
        <div className="grid gap-3">
          {predictions?.map((row) => (
            <div key={row.driver} className="flex items-center justify-between rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <span className="text-sm font-semibold">P{row.position} — {row.driver}</span>
              <span className="text-xs text-slate-300">Confidence {Math.round(row.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
