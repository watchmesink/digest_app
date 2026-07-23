import axios from 'axios';
import * as cheerio from 'cheerio';
import { subHours } from 'date-fns';
import { NewsItem } from '../types.js';
import { Fetcher, cleanHtml, truncate, extractDomain } from './base.js';

const DEFAULT_SUBSTACK_FEEDS = ['https://www.lennysnewsletter.com/feed'];

function normalizeFeedUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    const needsFeed = !url.pathname.endsWith('/feed') && !url.pathname.includes('/feed/');
    const pathname = needsFeed
      ? `${url.pathname.replace(/\/$/, '')}/feed`
      : url.pathname;
    url.pathname = pathname;
    return url.toString();
  } catch {
    return null;
  }
}

export function getSubstackFeeds(): string[] {
  const raw = process.env.SUBSTACK_FEEDS || '';
  if (!raw.trim()) return DEFAULT_SUBSTACK_FEEDS;
  const feeds = raw
    .split(/[\n,]+/)
    .map(normalizeFeedUrl)
    .filter((url): url is string => Boolean(url));
  return feeds.length > 0 ? feeds : DEFAULT_SUBSTACK_FEEDS;
}

function parseAuthor($el: cheerio.Cheerio<any>): string | undefined {
  const dcCreator = $el.find('dc\\:creator').text().trim();
  if (dcCreator) return dcCreator;
  const author = $el.find('author').text().trim();
  return author || undefined;
}

function parseDescription($el: cheerio.Cheerio<any>): string {
  const content = $el.find('content\\:encoded').text().trim();
  if (content) return content;
  return $el.find('description').text().trim();
}

async function fetchSubstackFeed(feedUrl: string, cutoff: Date): Promise<NewsItem[]> {
  const { data: rss } = await axios.get(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DigestBot/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(rss, { xml: true });
  const items: NewsItem[] = [];

  $('item').each((index, el) => {
    const $el = $(el);
    const title = $el.find('title').text().trim();
    const link = $el.find('link').text().trim();
    const pubDate = $el.find('pubDate').text().trim();
    const guid = $el.find('guid').text().trim();
    const postedAt = pubDate ? new Date(pubDate) : null;

    if (!title || !postedAt || Number.isNaN(postedAt.getTime())) return;
    if (postedAt < cutoff) return;

    const description = parseDescription($el);
    const author = parseAuthor($el);
    const summary = truncate(cleanHtml(description || title));

    items.push({
      id: `substack-${guid || link || `${index}-${postedAt.getTime()}`}`,
      title,
      summary: summary || title,
      url: link || feedUrl.replace(/\/feed\/?$/, '/'),
      source: 'substack',
      sourceLabel: 'Substack',
      postedAt,
      meta: {
        author,
        domain: extractDomain(link || feedUrl),
      },
    });
  });

  return items;
}

export class SubstackFetcher implements Fetcher {
  source = 'substack' as const;
  label = 'Substack';

  async fetch(): Promise<NewsItem[]> {
    const cutoff = subHours(new Date(), 24);
    const feeds = getSubstackFeeds();
    if (feeds.length === 0) return [];

    try {
      const results = await Promise.allSettled(
        feeds.map(feed => fetchSubstackFeed(feed, cutoff))
      );

      const items = results.flatMap(result =>
        result.status === 'fulfilled' ? result.value : []
      );

      return items
        .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching Substack:', error);
      return [];
    }
  }
}

export const fetchSubstack = () => new SubstackFetcher().fetch();
