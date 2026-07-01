import type { SourceType } from '../types.js';

export const PORT = Number(process.env.PORT) || 3000;

export const FEED_REFRESH_CRON = '*/30 * * * *'; // Every 30 minutes

export const HIDDEN_SOURCES: SourceType[] = ['hype', 'hn-comments'];

export const USER_AGENT = 'Mozilla/5.0 (compatible; DigestBot/1.0)';
export const HTTP_TIMEOUT_MS = 10000;
export const HTTP_TIMEOUT_LONG_MS = 15000;
