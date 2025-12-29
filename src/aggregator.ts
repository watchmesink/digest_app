import { FeedState, NewsItem } from './types.js';
import {
  fetchHackerNewsTop,
  fetchShowHN,
  fetchHNBestComments,
  fetchProductHunt,
  fetchTelegramChannels,
  fetchHype,
} from './fetchers/index.js';

// In-memory cache for the feed
let feedState: FeedState = {
  items: [],
  lastUpdated: new Date(0),
  errors: [],
};

export async function refreshFeed(): Promise<FeedState> {
  console.log(`[${new Date().toISOString()}] Starting feed refresh...`);
  
  const errors: string[] = [];
  const allItems: NewsItem[] = [];
  
  // Fetch from all sources in parallel
  const [
    hnResult,
    showHnResult,
    hnCommentsResult,
    phResult,
    telegramResult,
    hypeResult,
  ] = await Promise.allSettled([
    fetchHackerNewsTop(),
    fetchShowHN(),
    fetchHNBestComments(),
    fetchProductHunt(),
    fetchTelegramChannels(),
    fetchHype(),
  ]);
  
  // Process results
  if (hnResult.status === 'fulfilled') {
    console.log(`  ✓ HackerNews: ${hnResult.value.length} items`);
    allItems.push(...hnResult.value);
  } else {
    console.error(`  ✗ HackerNews failed:`, hnResult.reason);
    errors.push(`HackerNews: ${hnResult.reason}`);
  }
  
  if (showHnResult.status === 'fulfilled') {
    console.log(`  ✓ Show HN: ${showHnResult.value.length} items`);
    allItems.push(...showHnResult.value);
  } else {
    console.error(`  ✗ Show HN failed:`, showHnResult.reason);
    errors.push(`Show HN: ${showHnResult.reason}`);
  }
  
  if (hnCommentsResult.status === 'fulfilled') {
    console.log(`  ✓ HN Comments: ${hnCommentsResult.value.length} items`);
    allItems.push(...hnCommentsResult.value);
  } else {
    console.error(`  ✗ HN Comments failed:`, hnCommentsResult.reason);
    errors.push(`HN Comments: ${hnCommentsResult.reason}`);
  }
  
  if (phResult.status === 'fulfilled') {
    console.log(`  ✓ ProductHunt: ${phResult.value.length} items`);
    allItems.push(...phResult.value);
  } else {
    console.error(`  ✗ ProductHunt failed:`, phResult.reason);
    errors.push(`ProductHunt: ${phResult.reason}`);
  }
  
  if (telegramResult.status === 'fulfilled') {
    console.log(`  ✓ Telegram: ${telegramResult.value.length} items`);
    allItems.push(...telegramResult.value);
  } else {
    console.error(`  ✗ Telegram failed:`, telegramResult.reason);
    errors.push(`Telegram: ${telegramResult.reason}`);
  }
  
  if (hypeResult.status === 'fulfilled') {
    console.log(`  ✓ Hype: ${hypeResult.value.length} items`);
    allItems.push(...hypeResult.value);
  } else {
    console.error(`  ✗ Hype failed:`, hypeResult.reason);
    errors.push(`Hype: ${hypeResult.reason}`);
  }
  
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

