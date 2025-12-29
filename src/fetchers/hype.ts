import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';
import { subHours } from 'date-fns';

// Hype from Replicate - scrape the page since there's no public API
export async function fetchHype(): Promise<NewsItem[]> {
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
    
    // Try to find article/news items on the page
    // The structure might vary, so we try multiple selectors
    
    // Look for common article patterns
    const articleSelectors = [
      'article',
      '[class*="post"]',
      '[class*="article"]',
      '[class*="item"]',
      '[class*="card"]',
      'a[href*="http"]',
    ];
    
    // Try each selector until we find content
    for (const selector of articleSelectors) {
      $(selector).each((i, el) => {
        if (items.length >= 10) return false;
        
        const $el = $(el);
        
        // Try to extract title
        let title = '';
        const titleEl = $el.find('h1, h2, h3, h4, [class*="title"]').first();
        if (titleEl.length) {
          title = titleEl.text().trim();
        } else if ($el.is('a')) {
          title = $el.text().trim();
        }
        
        // Try to extract URL
        let url = '';
        if ($el.is('a')) {
          url = $el.attr('href') || '';
        } else {
          const linkEl = $el.find('a[href]').first();
          url = linkEl.attr('href') || '';
        }
        
        // Make URL absolute if needed
        if (url && !url.startsWith('http')) {
          url = `https://hype.replicate.dev${url.startsWith('/') ? '' : '/'}${url}`;
        }
        
        // Try to extract description/summary
        let summary = '';
        const descEl = $el.find('p, [class*="desc"], [class*="summary"]').first();
        if (descEl.length) {
          summary = descEl.text().trim();
        }
        
        // Only add if we have meaningful content
        if (title && title.length > 5 && !items.some(item => item.title === title)) {
          items.push({
            id: `hype-${i}-${Date.now()}`,
            title: title.slice(0, 200),
            summary: summary || title,
            url: url || 'https://hype.replicate.dev/',
            source: 'hype',
            sourceLabel: 'Hype',
            postedAt: new Date(), // Assume recent
            meta: {},
          });
        }
      });
      
      if (items.length >= 5) break;
    }
    
    // If we couldn't scrape structured content, try a more generic approach
    if (items.length === 0) {
      // Just get all links that look like article links
      $('a').each((i, el) => {
        if (items.length >= 10) return false;
        
        const $el = $(el);
        const href = $el.attr('href') || '';
        const text = $el.text().trim();
        
        // Skip navigation/footer links
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
            summary: text,
            url: href.startsWith('http') ? href : `https://hype.replicate.dev${href}`,
            source: 'hype',
            sourceLabel: 'Hype',
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

