import axios from 'axios';
import { NewsItem } from '../types.js';
import { subHours, fromUnixTime } from 'date-fns';
import { Fetcher, cleanHtml, truncate, extractDomain } from './base.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
  type: string;
}

async function fetchStory(id: number): Promise<HNStory | null> {
  try {
    const { data } = await axios.get<HNStory>(`${HN_API}/item/${id}.json`);
    return data;
  } catch {
    return null;
  }
}

function extractSummary(text?: string, title?: string): string {
  if (text) {
    return truncate(cleanHtml(text));
  }
  return title || '';
}

async function fetchHackerNewsItems(
  endpoint: string,
  source: 'hackernews' | 'showhn',
  label: string
): Promise<NewsItem[]> {
  const cutoff = subHours(new Date(), 24);
  const { data: ids } = await axios.get<number[]>(`${HN_API}/${endpoint}.json`);

  const stories = await Promise.all(
    ids.slice(0, 50).map(id => fetchStory(id))
  );

  const validStories = stories
    .filter((s): s is HNStory => s !== null && s.type === 'story')
    .filter(s => fromUnixTime(s.time) >= cutoff)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return validStories.map(story => ({
    id: `${source}-${story.id}`,
    title: story.title,
    summary: extractSummary(story.text, story.title),
    url: story.url,
    source,
    sourceLabel: label,
    postedAt: fromUnixTime(story.time),
    meta: {
      upvotes: story.score,
      comments: story.descendants || 0,
      author: story.by,
      domain: extractDomain(story.url),
    },
  }));
}

export class HackerNewsFetcher implements Fetcher {
  source = 'hackernews' as const;
  label = 'Hacker News';
  async fetch() {
    return fetchHackerNewsItems('topstories', this.source, this.label);
  }
}

export class ShowHNFetcher implements Fetcher {
  source = 'showhn' as const;
  label = 'Show HN';
  async fetch() {
    return fetchHackerNewsItems('showstories', this.source, this.label);
  }
}

// Keep legacy exports for now to avoid breaking things immediately
export const fetchHackerNewsTop = () => new HackerNewsFetcher().fetch();
export const fetchShowHN = () => new ShowHNFetcher().fetch();

