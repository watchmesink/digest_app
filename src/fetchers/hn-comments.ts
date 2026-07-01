import axios from 'axios';
import { NewsItem } from '../types.js';
import { subHours } from 'date-fns';
import { Fetcher, cleanHtml, truncate } from './base.js';

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

export class HNCommentsFetcher implements Fetcher {
  source = 'hn-comments' as const;
  label = 'HN Comment';

  async fetch(): Promise<NewsItem[]> {
    const cutoff = subHours(new Date(), 24);
    const cutoffTimestamp = Math.floor(cutoff.getTime() / 1000);

    try {
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

      const comments = data.hits
        .filter(hit => hit.comment_text && hit.comment_text.length > 100)
        .map(hit => {
          const textLength = hit.comment_text.length;
          const score = Math.min(textLength / 50, 10) + (hit.points || 0);
          return { ...hit, calculatedScore: score };
        })
        .sort((a, b) => b.calculatedScore - a.calculatedScore)
        .slice(0, 10);

      return comments.map(comment => ({
        id: `hn-comment-${comment.objectID}`,
        title: `Re: ${comment.story_title || 'HN Discussion'}`,
        summary: truncate(cleanHtml(comment.comment_text)),
        url: `https://news.ycombinator.com/item?id=${comment.objectID}`,
        source: this.source,
        sourceLabel: this.label,
        postedAt: new Date(comment.created_at),
        meta: {
          author: comment.author,
          parentStory: comment.story_title,
          upvotes: comment.points || undefined,
        },
      }));
    } catch (error) {
      console.error('Error fetching HN comments:', error);
      return [];
    }
  }
}

export const fetchHNBestComments = () => new HNCommentsFetcher().fetch();

