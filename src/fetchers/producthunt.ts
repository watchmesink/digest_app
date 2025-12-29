import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';

// ProductHunt RSS feed is more reliable than scraping
export async function fetchProductHunt(): Promise<NewsItem[]> {
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
    const items: NewsItem[] = [];
    
    $('item').each((i, el) => {
      if (i >= 10) return false;
      
      const $el = $(el);
      const title = $el.find('title').text().trim();
      const link = $el.find('link').text().trim();
      const description = $el.find('description').text().trim();
      const pubDate = $el.find('pubDate').text().trim();
      
      if (title) {
        // Clean description (remove HTML)
        const cleanDesc = description
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const summary = cleanDesc.length > 280 
          ? cleanDesc.slice(0, 277) + '...'
          : cleanDesc;
        
        items.push({
          id: `ph-${i}-${Date.now()}`,
          title,
          summary: summary || title,
          url: link || 'https://www.producthunt.com',
          source: 'producthunt',
          sourceLabel: 'Product Hunt',
          postedAt: pubDate ? new Date(pubDate) : new Date(),
          meta: {},
        });
      }
    });
    
    if (items.length > 0) {
      return items;
    }
    
    // Fallback: try the frontpage RSS
    return await fetchProductHuntFrontpage();
  } catch (error) {
    console.error('Error fetching ProductHunt RSS:', error);
    // Try fallback
    return await fetchProductHuntFrontpage();
  }
}

async function fetchProductHuntFrontpage(): Promise<NewsItem[]> {
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
    const items: NewsItem[] = [];
    
    $('item').each((i, el) => {
      if (i >= 10) return false;
      
      const $el = $(el);
      const title = $el.find('title').text().trim();
      const link = $el.find('link').text().trim();
      const description = $el.find('description').text().trim();
      const pubDate = $el.find('pubDate').text().trim();
      
      if (title) {
        const cleanDesc = description
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const summary = cleanDesc.length > 280 
          ? cleanDesc.slice(0, 277) + '...'
          : cleanDesc;
        
        items.push({
          id: `ph-${i}-${Date.now()}`,
          title,
          summary: summary || title,
          url: link || 'https://www.producthunt.com',
          source: 'producthunt',
          sourceLabel: 'Product Hunt',
          postedAt: pubDate ? new Date(pubDate) : new Date(),
          meta: {},
        });
      }
    });
    
    return items;
  } catch (error) {
    console.error('Error fetching ProductHunt frontpage:', error);
    return [];
  }
}
