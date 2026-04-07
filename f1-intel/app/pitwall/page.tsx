'use client';

import { useState } from 'react';
import MetricCard from '../../components/dashboard/MetricCard';
import PlaceholderChart from '../../components/charts/PlaceholderChart';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Panel from '../../components/ui/Panel';

export default function PitwallPage() {
  const [sessionId, setSessionId] = useState('latest');
  const [driver, setDriver] = useState('VER');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telemetry?session=${sessionId}&driver=${driver}`);
      const data = await res.json();
      setPayload(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel title="Telemetry Pit Board">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-slate-300">Session</label>
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="latest or session id"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Driver</label>
            <input
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="VER"
            />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={loadTelemetry} disabled={loading}>
              {loading ? 'Loading...' : 'Load Telemetry'}
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Lap Delta" value={payload?.metrics ? String((payload.metrics as any).lapDelta ?? '—') : '—'} />
        <MetricCard label="Tyre Degradation" value={payload?.metrics ? String((payload.metrics as any).tyreDeg ?? '—') : '—'} />
        <MetricCard label="Gap To Leader" value={payload?.metrics ? String((payload.metrics as any).gapToLeader ?? '—') : '—'} />
        <MetricCard label="Pace Consistency" value={payload?.metrics ? String((payload.metrics as any).paceConsistency ?? '—') : '—'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderChart title="Sector Comparison" />
        <PlaceholderChart title="Stint Timeline" />
        <PlaceholderChart title="Gap Graph" />
        <PlaceholderChart title="Tyre Degradation" />
      </div>

      <Panel title="Raw Payload">
        <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-200">
          {payload ? JSON.stringify(payload, null, 2) : 'Load telemetry to view payload.'}
        </pre>
      </Panel>
    </div>
  );
}
