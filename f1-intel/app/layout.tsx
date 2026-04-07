import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'F1 Intelligence Platform',
  description: 'Serverless F1 analytics and AI platform powered by OpenF1 and Jolpica.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-pitwall-900">
          <header className="border-b border-white/10">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
              <div>
                <p className="section-title">F1 Intelligence Platform</p>
                <h1 className="text-2xl font-semibold">Pitwall AI Suite</h1>
              </div>
              <nav className="flex gap-4 text-sm text-slate-300">
                <a href="/pitwall" className="hover:text-white">Pitwall</a>
                <a href="/coach" className="hover:text-white">Coach</a>
                <a href="/summary" className="hover:text-white">Summary</a>
                <a href="/predictor" className="hover:text-white">Predictor</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
