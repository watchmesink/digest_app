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
  fullText: string;
  fullTextHtml: string;
  images: string[];
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
      
      // Get text content (summary)
      const textEl = $el.find('.tgme_widget_message_text');
      const text = textEl.text().trim();
      
      // Get full HTML text (preserves formatting like bold, italic, links, line breaks)
      let fullTextHtml = textEl.html() || '';
      
      // Clean up the HTML - remove script tags and sanitize
      fullTextHtml = fullTextHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .replace(/on\w+='[^']*'/gi, '');
      
      // Convert HTML to plain text but preserve line breaks for summary
      const fullText = textEl.text().trim();
      
      // Get images (only from post content, not channel icons/avatars)
      const images: string[] = [];
      
      // Exclude channel icon/avatar images - these are typically in user photo elements
      const messageContent = $el.find('.tgme_widget_message_bubble');
      
      // Find images only within the message content (not in header/user photo areas)
      messageContent.find('img').each((_, imgEl) => {
        const $img = $(imgEl);
        const src = $img.attr('src');
        
        // Skip if it's an icon, emoji, or avatar
        if (src && 
            !src.includes('telegram.org/img/icon') && 
            !src.includes('emoji') &&
            !src.includes('avatar') &&
            !$img.closest('.tgme_widget_message_user_photo, .tgme_widget_message_author').length) {
          images.push(src);
        }
      });
      
      // Check for background images in photo wraps (these are post images)
      messageContent.find('.tgme_widget_message_photo_wrap, .tgme_widget_message_video_wrap').each((_, wrapEl) => {
        const $wrap = $(wrapEl);
        const style = $wrap.attr('style') || '';
        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
        if (bgMatch && !images.includes(bgMatch[1])) {
          images.push(bgMatch[1]);
        }
        
        // Also check nested img tags
        const nestedImg = $wrap.find('img').attr('src');
        if (nestedImg && !images.includes(nestedImg)) {
          images.push(nestedImg);
        }
      });
      
      // Check for video thumbnails in message content
      messageContent.find('video').each((_, videoEl) => {
        const $video = $(videoEl);
        const poster = $video.attr('poster');
        if (poster && !images.includes(poster)) {
          images.push(poster);
        }
      });
      
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
            fullText,
            fullTextHtml,
            images,
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
  // Extract the first complete sentence
  // Look for sentence endings: . ! ? followed by space or end of string
  const sentenceMatch = text.match(/^[^.!?]*[.!?](?:\s|$)/);
  
  if (sentenceMatch) {
    const firstSentence = sentenceMatch[0].trim();
    // If sentence is reasonable length, use it
    if (firstSentence.length <= 150) {
      return firstSentence;
    }
    // If too long, truncate at word boundary
    if (firstSentence.length > 150) {
      const truncated = firstSentence.slice(0, 147);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 100) {
        return truncated.slice(0, lastSpace) + '...';
      }
      return truncated + '...';
    }
  }
  
  // Fallback: use first line if no sentence ending found
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= 100) {
    return firstLine;
  }
  
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
        fullText: post.fullText,
        fullTextHtml: post.fullTextHtml,
        images: post.images,
      },
    }));
}

