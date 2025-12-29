import axios from 'axios';
import { NewsItem } from '../types.js';
import { subHours, fromUnixTime } from 'date-fns';

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

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return undefined;
  }
}

function extractSummary(text?: string, title?: string): string {
  if (text) {
    // Remove HTML tags and get first ~280 chars
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 280) {
      return clean.slice(0, 277) + '...';
    }
    return clean;
  }
  return title || '';
}

export async function fetchHackerNewsTop(): Promise<NewsItem[]> {
  const cutoff = subHours(new Date(), 24);
  
  // Fetch top stories
  const { data: topIds } = await axios.get<number[]>(`${HN_API}/topstories.json`);
  
  // Fetch stories in parallel (limit to first 50 to find 10 from last 24h)
  const stories = await Promise.all(
    topIds.slice(0, 50).map(id => fetchStory(id))
  );
  
  const validStories = stories
    .filter((s): s is HNStory => s !== null && s.type === 'story')
    .filter(s => fromUnixTime(s.time) >= cutoff)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return validStories.map(story => ({
    id: `hn-${story.id}`,
    title: story.title,
    summary: extractSummary(story.text, story.title),
    url: story.url,
    source: 'hackernews' as const,
    sourceLabel: 'Hacker News',
    postedAt: fromUnixTime(story.time),
    meta: {
      upvotes: story.score,
      comments: story.descendants || 0,
      author: story.by,
      domain: extractDomain(story.url),
    },
  }));
}

export async function fetchShowHN(): Promise<NewsItem[]> {
  const cutoff = subHours(new Date(), 24);
  
  // Fetch Show HN stories
  const { data: showIds } = await axios.get<number[]>(`${HN_API}/showstories.json`);
  
  const stories = await Promise.all(
    showIds.slice(0, 50).map(id => fetchStory(id))
  );
  
  const validStories = stories
    .filter((s): s is HNStory => s !== null && s.type === 'story')
    .filter(s => fromUnixTime(s.time) >= cutoff)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return validStories.map(story => ({
    id: `showhn-${story.id}`,
    title: story.title,
    summary: extractSummary(story.text, story.title),
    url: story.url,
    source: 'showhn' as const,
    sourceLabel: 'Show HN',
    postedAt: fromUnixTime(story.time),
    meta: {
      upvotes: story.score,
      comments: story.descendants || 0,
      author: story.by,
      domain: extractDomain(story.url),
    },
  }));
}

