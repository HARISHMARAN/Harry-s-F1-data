export default function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel">
      <div className="panel-header">
        <p className="panel-title">{title}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
