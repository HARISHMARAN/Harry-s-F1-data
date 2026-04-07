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
        <div className="app-container">
          <header className="header">
            <div className="logo-area">
              <span className="logo-text">F1 Intelligence</span>
              <div className="live-indicator">
                <span className="pulsing-dot" />
                <span className="live-text">LIVE</span>
              </div>
            </div>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/pitwall" className="hover:text-white">Pitwall</a>
              <a href="/coach" className="hover:text-white">Coach</a>
              <a href="/summary" className="hover:text-white">Summary</a>
              <a href="/predictor" className="hover:text-white">Predictor</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
