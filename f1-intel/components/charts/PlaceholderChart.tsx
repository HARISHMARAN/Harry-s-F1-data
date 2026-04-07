export default function PlaceholderChart({ title }: { title: string }) {
  return (
    <div className="surface-card p-6">
      <p className="section-title">{title}</p>
      <div className="mt-4 h-40 rounded-xl border border-dashed border-white/20 bg-white/5" />
    </div>
  );
}
