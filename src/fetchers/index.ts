import { HackerNewsFetcher, ShowHNFetcher } from './hackernews.js';
import { HNCommentsFetcher } from './hn-comments.js';
import { ProductHuntFetcher } from './producthunt.js';
import { TelegramFetcher } from './telegram.js';
import { HypeFetcher } from './hype.js';
import { SubstackFetcher } from './substack.js';
import { Fetcher } from './base.js';

export { fetchHackerNewsTop, fetchShowHN } from './hackernews.js';
export { fetchHNBestComments } from './hn-comments.js';
export { fetchProductHunt } from './producthunt.js';
export { fetchTelegramChannels, getTelegramChannels, setTelegramChannels } from './telegram.js';
export { fetchHype } from './hype.js';
export { fetchSubstack, getSubstackFeeds } from './substack.js';
export * from './base.js';

export const fetchers: Fetcher[] = [
  new HackerNewsFetcher(),
  new ShowHNFetcher(),
  new HNCommentsFetcher(),
  new ProductHuntFetcher(),
  new TelegramFetcher(),
  new HypeFetcher(),
  new SubstackFetcher(),
];
