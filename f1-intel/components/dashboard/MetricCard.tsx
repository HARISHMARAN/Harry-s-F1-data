export default function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <p className="section-title">{label}</p>
      <p className="metric-value mt-2">{value}</p>
    </div>
  );
}
