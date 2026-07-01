import type { NewsItem, SourceType } from '../types.js';

export interface Fetcher {
  source: SourceType;
  label: string;
  fetch(): Promise<NewsItem[]>;
}

export interface CreateItemParams {
  id: string;
  title: string;
  summary: string;
  url?: string;
  source: SourceType;
  sourceLabel: string;
  postedAt: Date;
  meta?: NewsItem['meta'];
}

export function createItem(params: CreateItemParams): NewsItem {
  return {
    id: params.id,
    title: params.title,
    summary: params.summary,
    url: params.url,
    source: params.source,
    sourceLabel: params.sourceLabel,
    postedAt: params.postedAt,
    meta: params.meta ?? {},
  };
}

export function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, length: number = 280): string {
  if (text.length <= length) return text;
  return text.slice(0, length - 3) + '...';
}

export function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return undefined;
  }
}
