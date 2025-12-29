import axios from 'axios';
import { NewsItem } from '../types.js';
import { subHours, fromUnixTime } from 'date-fns';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  type: string;
  by?: string;
  time: number;
  text?: string;
  parent?: number;
  kids?: number[];
  score?: number;
  title?: string;
  url?: string;
}

interface HNAlgoliaResult {
  hits: Array<{
    objectID: string;
    author: string;
    comment_text: string;
    created_at: string;
    created_at_i: number;
    points: number | null;
    story_id: number;
    story_title: string;
    story_url: string;
    parent_id: number;
    num_comments?: number;
  }>;
}

// Use Algolia HN Search API for better comment discovery
// Logic inspired by hn-best-comments: find comments with high engagement
// relative to when they were posted
export async function fetchHNBestComments(): Promise<NewsItem[]> {
  const cutoff = subHours(new Date(), 24);
  const cutoffTimestamp = Math.floor(cutoff.getTime() / 1000);
  
  try {
    // Fetch recent comments using Algolia API
    // Sort by points to find best comments
    const { data } = await axios.get<HNAlgoliaResult>(
      `https://hn.algolia.com/api/v1/search_by_date`,
      {
        params: {
          tags: 'comment',
          numericFilters: `created_at_i>${cutoffTimestamp}`,
          hitsPerPage: 100,
        },
      }
    );
    
    // Filter and sort by engagement (approximated by reply count and length)
    // Since Algolia doesn't give us upvotes directly, we use a heuristic:
    // - Comments on popular stories are more likely to be good
    // - Longer, substantive comments tend to be better
    const comments = data.hits
      .filter(hit => hit.comment_text && hit.comment_text.length > 100)
      .map(hit => {
        // Score based on text quality and engagement potential
        const textLength = hit.comment_text.length;
        const score = Math.min(textLength / 50, 10) + (hit.points || 0);
        return { ...hit, calculatedScore: score };
      })
      .sort((a, b) => b.calculatedScore - a.calculatedScore)
      .slice(0, 10);
    
    return comments.map(comment => {
      // Clean up comment text
      const cleanText = comment.comment_text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const summary = cleanText.length > 280 
        ? cleanText.slice(0, 277) + '...'
        : cleanText;
      
      return {
        id: `hn-comment-${comment.objectID}`,
        title: `Re: ${comment.story_title || 'HN Discussion'}`,
        summary,
        url: `https://news.ycombinator.com/item?id=${comment.objectID}`,
        source: 'hn-comments' as const,
        sourceLabel: 'HN Comment',
        postedAt: new Date(comment.created_at),
        meta: {
          author: comment.author,
          parentStory: comment.story_title,
          upvotes: comment.points || undefined,
        },
      };
    });
  } catch (error) {
    console.error('Error fetching HN comments:', error);
    return [];
  }
}

