const modules = [
  {
    title: 'Telemetry Pitwall',
    description: 'Stint analysis, tyre degradation, lap deltas, and gap tracking in one board.',
    href: '/pitwall',
  },
  {
    title: 'AI Driver Coach',
    description: 'Post-lap coaching insights from sector deltas and speed traces.',
    href: '/coach',
  },
  {
    title: 'Race Summarizer',
    description: 'Generate race reports on-demand with strategy highlights.',
    href: '/summary',
  },
  {
    title: 'Race Predictor',
    description: 'Pre-race prediction grid with confidence scoring.',
    href: '/predictor',
  },
];

export default function HomePage() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      {modules.map((module) => (
        <a key={module.title} href={module.href} className="surface-card p-6 transition hover:-translate-y-1">
          <p className="section-title">Module</p>
          <h2 className="mt-3 text-xl font-semibold text-white">{module.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{module.description}</p>
        </a>
      ))}
    </section>
  );
}
