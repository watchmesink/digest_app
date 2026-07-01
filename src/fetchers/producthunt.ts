import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';
import { Fetcher, cleanHtml, truncate } from './base.js';

export class ProductHuntFetcher implements Fetcher {
  source = 'producthunt' as const;
  label = 'Product Hunt';

  async fetch(): Promise<NewsItem[]> {
    try {
      // Try the RSS feed first
      const { data: rssData } = await axios.get('https://www.producthunt.com/feed', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DigestBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(rssData, { xml: true });
      const items: NewsItem[] = this.parseRss($);

      if (items.length > 0) {
        return items;
      }

      // Fallback: try the frontpage RSS
      return await this.fetchProductHuntFrontpage();
    } catch (error) {
      console.error('Error fetching ProductHunt RSS:', error);
      // Try fallback
      return await this.fetchProductHuntFrontpage();
    }
  }

  private parseRss($: cheerio.CheerioAPI): NewsItem[] {
    const items: NewsItem[] = [];
    $('item').each((i, el) => {
      if (i >= 10) return false;

      const $el = $(el);
      const title = $el.find('title').text().trim();
      const link = $el.find('link').text().trim();
      const description = $el.find('description').text().trim();
      const pubDate = $el.find('pubDate').text().trim();

      if (title) {
        items.push({
          id: `ph-${i}-${Date.now()}`,
          title,
          summary: truncate(cleanHtml(description)) || title,
          url: link || 'https://www.producthunt.com',
          source: this.source,
          sourceLabel: this.label,
          postedAt: pubDate ? new Date(pubDate) : new Date(),
          meta: {},
        });
      }
    });
    return items;
  }

  private async fetchProductHuntFrontpage(): Promise<NewsItem[]> {
    try {
      // Alternative: use producthunt frontpage via alternative RSS
      const { data } = await axios.get('https://www.producthunt.com/feed?category=undefined', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DigestBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(data, { xml: true });
      return this.parseRss($);
    } catch (error) {
      console.error('Error fetching ProductHunt frontpage:', error);
      return [];
    }
  }
}

export const fetchProductHunt = () => new ProductHuntFetcher().fetch();
