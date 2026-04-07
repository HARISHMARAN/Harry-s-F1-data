export default function PlaceholderChart({ title }: { title: string }) {
  return (
    <div className="glass-panel">
      <div className="panel-header">
        <p className="panel-title">{title}</p>
      </div>
      <div className="p-6">
        <div className="mt-2 h-40 rounded-xl border border-dashed border-white/10 bg-white/5" />
      </div>
    </div>
  );
}
