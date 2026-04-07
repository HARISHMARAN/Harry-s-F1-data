export default function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="metric-value mt-2">{value}</p>
    </div>
  );
}
