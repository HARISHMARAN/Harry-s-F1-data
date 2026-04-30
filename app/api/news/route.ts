import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

const FEEDS = [
  { source: 'BBC Sport F1', url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml' },
  { source: 'The Guardian F1', url: 'https://www.theguardian.com/sport/formulaone/rss' },
  { source: 'RACER F1', url: 'https://racer.com/f1/feed/' },
] as const;

const FEED_TIMEOUT_MS = 4_000;

const CONFIRMED_CALENDAR_ITEMS: NewsItem[] = [
  {
    id: 'confirmed-turkiye-2027',
    title: "Formula 1 confirms Turkish Grand Prix return from 2027",
    summary: "Istanbul Park is confirmed to return to the F1 calendar from 2027 under a five-year agreement through 2031.",
    url: 'https://www.formula1.com/en/latest/article/formula-1-returns-to-turkeys-istanbul-park-from-2027-as-part-of-new-five-year-agreement.1I7OZGeDPoC6Vysv3iqadY',
    source: 'Formula 1',
    publishedAt: '2026-04-24T12:00:00Z',
    category: 'Calendar',
    status: 'confirmed',
  },
  {
    id: 'confirmed-portugal-2027',
    title: "Formula 1 confirms Portugal return for 2027 and 2028",
    summary: "The Portuguese Grand Prix is confirmed to return at Portimao for 2027 and 2028 under a two-year agreement.",
    url: 'https://www.formula1.com/en/latest/article/formula-1-to-return-to-portugal-in-2027-and-2028.6kRRgAnvEoGiOkJMkzp1Cr/',
    source: 'Formula 1',
    publishedAt: '2025-12-16T12:00:00Z',
    category: 'Calendar',
    status: 'confirmed',
  },
];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string) {
  return decodeEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstMatch(block: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]).trim();
  }
  return '';
}

function classify(title: string, summary: string): NewsItem['category'] {
  const text = `${title} ${summary}`.toLowerCase();
  if (/calendar|grand prix|contract|return|portugal|turk|istanbul|portimao|venue|circuit/.test(text)) return 'Calendar';
  if (/team|red bull|ferrari|mclaren|mercedes|williams|audi|cadillac|alpine|haas|aston martin/.test(text)) return 'Teams';
  if (/driver|verstappen|hamilton|leclerc|russell|norris|piastri|antonelli|sainz|alonso/.test(text)) return 'Drivers';
  if (/miami|practice|qualifying|sprint|race|grand prix/.test(text)) return 'Race Weekend';
  if (/engine|power unit|upgrade|technical|regulation|aero|floor/.test(text)) return 'Technical';
  return 'General';
}

function imageFromItem(block: string) {
  return firstMatch(block, [
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<media:content[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+)"/i,
  ]) || null;
}

function parseFeed(xml: string, source: string): NewsItem[] {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);

  return blocks.map((block) => {
    const title = stripHtml(firstMatch(block, [/<title>([\s\S]*?)<\/title>/i]));
    const rawSummary = firstMatch(block, [/<description>([\s\S]*?)<\/description>/i, /<content:encoded>([\s\S]*?)<\/content:encoded>/i]);
    const summary = stripHtml(rawSummary).slice(0, 260);
    const url = firstMatch(block, [/<link>([\s\S]*?)<\/link>/i, /<guid[^>]*>([\s\S]*?)<\/guid>/i]);
    const pubDate = firstMatch(block, [/<pubDate>([\s\S]*?)<\/pubDate>/i, /<dc:date>([\s\S]*?)<\/dc:date>/i]);
    const publishedAt = Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : new Date().toISOString();

    return {
      id: `${source}-${url || title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120),
      title,
      summary,
      url,
      source,
      publishedAt,
      category: classify(title, summary),
      status: 'reported' as const,
      imageUrl: imageFromItem(block),
    };
  }).filter((item) => item.title && item.url);
}

async function fetchFeed(feed: typeof FEEDS[number]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(feed.url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'HarryF1Dashboard/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseFeed(xml, feed.source);
  } finally {
    clearTimeout(timeoutId);
  }
}

function dedupe(items: NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  const feedResults = await Promise.all(FEEDS.map((feed) => fetchFeed(feed).catch(() => [])));
  const dynamicItems = feedResults.flat();
  const latestFeedItems = dedupe(dynamicItems)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 22);
  const items = [...CONFIRMED_CALENDAR_ITEMS, ...latestFeedItems]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    sources: FEEDS.map((feed) => feed.source),
    items,
  });
}
