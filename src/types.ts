export type SourceType = 
  | 'hackernews' 
  | 'showhn' 
  | 'producthunt' 
  | 'telegram' 
  | 'hype' 
  | 'hn-comments';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url?: string;
  source: SourceType;
  sourceLabel: string;
  postedAt: Date;
  meta: {
    upvotes?: number;
    comments?: number;
    author?: string;
    channel?: string;
    domain?: string;
    parentStory?: string;
  };
}

export interface FeedState {
  items: NewsItem[];
  lastUpdated: Date;
  errors: string[];
}

