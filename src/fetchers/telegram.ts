import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';
import { subHours, parseISO, isAfter } from 'date-fns';

const TELEGRAM_CHANNELS = [
  'data_secrets',
  'gonzo_ML',
  'seeallochnaya',
  'denissexy',
  'NeuralShit',
  'cryptoEssay',
  'sergiobulaev',
  'blognot',
  'addmeto',
];

interface TelegramPost {
  id: string;
  channel: string;
  text: string;
  date: Date;
  views?: number;
  link: string;
}

async function fetchChannelPosts(channel: string): Promise<TelegramPost[]> {
  const posts: TelegramPost[] = [];
  const cutoff = subHours(new Date(), 24);
  
  try {
    // Telegram has a public preview at t.me/s/channelname
    const url = `https://t.me/s/${channel}`;
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });
    
    const $ = cheerio.load(html);
    
    // Telegram widget messages
    $('.tgme_widget_message').each((i, el) => {
      const $el = $(el);
      
      // Get message ID from data attribute
      const messageId = $el.attr('data-post')?.split('/')[1] || `${i}`;
      
      // Get text content
      const textEl = $el.find('.tgme_widget_message_text');
      const text = textEl.text().trim();
      
      // Get date
      const timeEl = $el.find('time');
      const datetime = timeEl.attr('datetime');
      
      // Get views
      const viewsEl = $el.find('.tgme_widget_message_views');
      const viewsText = viewsEl.text().trim();
      const views = parseViews(viewsText);
      
      if (text && datetime) {
        const postDate = parseISO(datetime);
        
        // Only include posts from last 24h
        if (isAfter(postDate, cutoff)) {
          posts.push({
            id: `${channel}-${messageId}`,
            channel,
            text,
            date: postDate,
            views,
            link: `https://t.me/${channel}/${messageId}`,
          });
        }
      }
    });
    
    return posts;
  } catch (error) {
    console.error(`Error fetching Telegram channel @${channel}:`, error);
    return [];
  }
}

function parseViews(viewsStr: string): number | undefined {
  if (!viewsStr) return undefined;
  
  const cleaned = viewsStr.toLowerCase().replace(/\s/g, '');
  
  if (cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  if (cleaned.endsWith('m')) {
    return Math.round(parseFloat(cleaned) * 1000000);
  }
  
  const num = parseInt(cleaned);
  return isNaN(num) ? undefined : num;
}

function extractTitle(text: string): string {
  // Try to extract a title from the first line or bold text
  const firstLine = text.split('\n')[0].trim();
  
  // If first line is short enough, use it as title
  if (firstLine.length <= 100) {
    return firstLine;
  }
  
  // Otherwise truncate
  return firstLine.slice(0, 97) + '...';
}

function extractSummary(text: string): string {
  // Get first ~280 chars, tweet-style
  const cleaned = text.replace(/\n+/g, ' ').trim();
  
  if (cleaned.length <= 280) {
    return cleaned;
  }
  
  // Try to break at word boundary
  const truncated = cleaned.slice(0, 277);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 200) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

export async function fetchTelegramChannels(): Promise<NewsItem[]> {
  // Fetch all channels in parallel
  const results = await Promise.all(
    TELEGRAM_CHANNELS.map(channel => fetchChannelPosts(channel))
  );
  
  // Flatten and convert to NewsItems
  const allPosts = results.flat();
  
  // Sort by date (newest first) and convert to NewsItem format
  return allPosts
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(post => ({
      id: `tg-${post.id}`,
      title: extractTitle(post.text),
      summary: extractSummary(post.text),
      url: post.link,
      source: 'telegram' as const,
      sourceLabel: 'Telegram',
      postedAt: post.date,
      meta: {
        channel: `@${post.channel}`,
        upvotes: post.views,
      },
    }));
}

