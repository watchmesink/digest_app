import { FeedState, NewsItem } from './types.js';
import { fetchers } from './fetchers/index.js';

// In-memory cache for the feed
let feedState: FeedState = {
  items: [],
  lastUpdated: new Date(0),
  errors: [],
};

export async function refreshFeed(): Promise<FeedState> {
  const now = new Date();
  console.log(`[${now.toISOString()}] Starting feed refresh...`);
  
  const errors: string[] = [];
  const allItems: NewsItem[] = [];
  
  // Fetch from all sources in parallel
  const results = await Promise.allSettled(
    fetchers.map(f => f.fetch())
  );
  
  // Process results
  results.forEach((result, index) => {
    const fetcher = fetchers[index];
    if (result.status === 'fulfilled') {
      console.log(`  ✓ ${fetcher.label}: ${result.value.length} items`);
      allItems.push(...result.value);
    } else {
      console.error(`  ✗ ${fetcher.label} failed:`, result.reason);
      errors.push(`${fetcher.label}: ${result.reason}`);
    }
  });
  
  // Sort all items by date (newest first)
  allItems.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  
  feedState = {
    items: allItems,
    lastUpdated: new Date(),
    errors,
  };
  
  console.log(`[${new Date().toISOString()}] Feed refresh complete. Total items: ${allItems.length}`);
  
  return feedState;
}

export function getFeedState(): FeedState {
  return feedState;
}

export function setFeedState(state: FeedState): void {
  feedState = state;
}

