"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Newspaper, RefreshCw, ShieldCheck } from 'lucide-react';
import { formatUpdatedAt } from '../utils/dateFormat';

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: 'Calendar' | 'Teams' | 'Drivers' | 'Race Weekend' | 'Technical' | 'General';
  status: 'confirmed' | 'reported';
  imageUrl?: string | null;
};

type NewsResponse = {
  updatedAt: string;
  sources: string[];
  items: NewsItem[];
};

function formatDate(value: string) {
  return formatUpdatedAt(value, 'Date unavailable');
}

function categoryTone(category: NewsItem['category']) {
  if (category === 'Calendar') return 'var(--accent-f1)';
  if (category === 'Race Weekend') return 'var(--accent-cyan)';
  if (category === 'Technical') return '#f4b400';
  if (category === 'Teams') return '#8ab4ff';
  if (category === 'Drivers') return '#d8b4fe';
  return 'var(--text-secondary)';
}

function NewsCard({ item, compact = false }: { item: NewsItem; compact?: boolean }) {
  const tone = categoryTone(item.category);

  return (
    <article
      className="glass-panel"
      style={{
        padding: compact ? '0.95rem' : '1.1rem',
        display: 'grid',
        gap: '0.8rem',
        borderColor: item.status === 'confirmed' ? 'rgba(234, 51, 35, 0.35)' : 'var(--border-light)',
        background: item.status === 'confirmed' ? 'rgba(234, 51, 35, 0.07)' : 'rgba(255,255,255,0.035)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ color: tone, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900 }}>
            {item.category}
          </span>
          {item.status === 'confirmed' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-success)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 }}>
              <ShieldCheck size={13} />
              Confirmed
            </span>
          ) : null}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {formatDate(item.publishedAt)}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.45rem' }}>
        <h3 style={{ margin: 0, fontSize: compact ? '1.05rem' : '1.25rem', lineHeight: 1.18 }}>{item.title}</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.88rem' }}>{item.summary}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.source}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 800 }}
        >
          Open
          <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
}

export default function NewsView() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNews() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/news', { cache: 'no-store' });
      if (!response.ok) throw new Error(`News API returned ${response.status}`);
      setData((await response.json()) as NewsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load news');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    const intervalId = window.setInterval(loadNews, 10 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const confirmedItems = useMemo(() => data?.items.filter((item) => item.status === 'confirmed') ?? [], [data]);
  const latestItems = useMemo(() => data?.items.filter((item) => item.status !== 'confirmed') ?? [], [data]);

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.4px', fontSize: '0.75rem' }}>
            F1 News
          </p>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '1.9rem' }}>Latest Confirmed Formula 1 Updates</h2>
          <p style={{ margin: '0.6rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 820 }}>
            Confirmed calendar moves are pinned from official Formula 1 announcements. The live feed below refreshes from free public RSS sources.
          </p>
        </div>
        <button
          type="button"
          onClick={loadNews}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            borderRadius: 999,
            border: '1px solid var(--border-light)',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-primary)',
            padding: '0.7rem 1rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading latest F1 news...</div> : null}
      {error ? (
        <div style={{ padding: '0.9rem 1rem', borderRadius: 8, border: '1px solid rgba(234, 51, 35, 0.35)', background: 'rgba(234, 51, 35, 0.08)' }}>
          {error}
        </div>
      ) : null}

      {confirmedItems.length ? (
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <CalendarDays size={14} />
            <span>Confirmed Calendar Watch</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {confirmedItems.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>
        </div>
      ) : null}

      {latestItems.length ? (
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <Newspaper size={14} />
            <span>Latest Feed</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {latestItems.map((item) => <NewsCard key={item.id} item={item} compact />)}
          </div>
        </div>
      ) : null}

      {data ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Sources: {data.sources.join(', ')}. Updated {formatUpdatedAt(data.updatedAt)}.
        </p>
      ) : null}
    </section>
  );
}
