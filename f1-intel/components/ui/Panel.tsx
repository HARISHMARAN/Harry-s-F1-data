export default function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6">
      <p className="section-title">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
