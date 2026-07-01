import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';
import { Fetcher, truncate } from './base.js';

export class HypeFetcher implements Fetcher {
  source = 'hype' as const;
  label = 'Hype';

  async fetch(): Promise<NewsItem[]> {
    try {
      const { data: html } = await axios.get('https://hype.replicate.dev/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });
      
      const $ = cheerio.load(html);
      const items: NewsItem[] = [];
      const articleSelectors = [
        'article',
        '[class*="post"]',
        '[class*="article"]',
        '[class*="item"]',
        '[class*="card"]',
        'a[href*="http"]',
      ];
      
      for (const selector of articleSelectors) {
        $(selector).each((i, el) => {
          if (items.length >= 10) return false;
          const $el = $(el);
          let title = '';
          const titleEl = $el.find('h1, h2, h3, h4, [class*="title"]').first();
          if (titleEl.length) {
            title = titleEl.text().trim();
          } else if ($el.is('a')) {
            title = $el.text().trim();
          }
          
          let url = '';
          if ($el.is('a')) {
            url = $el.attr('href') || '';
          } else {
            const linkEl = $el.find('a[href]').first();
            url = linkEl.attr('href') || '';
          }
          if (url && !url.startsWith('http')) {
            url = `https://hype.replicate.dev${url.startsWith('/') ? '' : '/'}${url}`;
          }
          
          let summary = '';
          const descEl = $el.find('p, [class*="desc"], [class*="summary"]').first();
          if (descEl.length) {
            summary = descEl.text().trim();
          }
          
          if (title && title.length > 5 && !items.some(item => item.title === title)) {
            items.push({
              id: `hype-${i}-${Date.now()}`,
              title: title.slice(0, 200),
              summary: truncate(summary || title),
              url: url || 'https://hype.replicate.dev/',
              source: this.source,
              sourceLabel: this.label,
              postedAt: new Date(),
              meta: {},
            });
          }
        });
        if (items.length >= 5) break;
      }
      
      if (items.length === 0) {
        $('a').each((i, el) => {
          if (items.length >= 10) return false;
          const $el = $(el);
          const href = $el.attr('href') || '';
          const text = $el.text().trim();
          if (
            text.length > 20 && 
            text.length < 300 &&
            !href.includes('twitter') &&
            !href.includes('github') &&
            !href.includes('mailto') &&
            !items.some(item => item.title === text)
          ) {
            items.push({
              id: `hype-${i}-${Date.now()}`,
              title: text.slice(0, 200),
              summary: truncate(text),
              url: href.startsWith('http') ? href : `https://hype.replicate.dev${href}`,
              source: this.source,
              sourceLabel: this.label,
              postedAt: new Date(),
              meta: {},
            });
          }
        });
      }
      
      return items.slice(0, 10);
    } catch (error) {
      console.error('Error fetching Hype:', error);
      return [];
    }
  }
}

export const fetchHype = () => new HypeFetcher().fetch();

