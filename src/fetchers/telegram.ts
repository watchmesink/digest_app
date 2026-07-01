import axios from 'axios';
import * as cheerio from 'cheerio';
import { NewsItem } from '../types.js';
import { subHours, parseISO, isAfter } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Fetcher, truncate } from './base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CHANNELS = [
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

const CHANNELS_FILE = path.join(__dirname, '../../data/channels.json');

export function getTelegramChannels(): string[] {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf-8'));
      return data.telegram || DEFAULT_CHANNELS;
    }
  } catch (error) {
    console.error('Error reading channels config:', error);
  }
  return DEFAULT_CHANNELS;
}

export function setTelegramChannels(channels: string[]): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CHANNELS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Clean channel names (remove @ if present)
    const cleanedChannels = channels.map(ch => ch.replace(/^@/, '').trim()).filter(Boolean);
    
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ telegram: cleanedChannels }, null, 2));
  } catch (error) {
    console.error('Error writing channels config:', error);
    throw error;
  }
}

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

export class TelegramFetcher implements Fetcher {
  source = 'telegram' as const;
  label = 'Telegram';

  async fetch(): Promise<NewsItem[]> {
    const channels = getTelegramChannels();
    const results = await Promise.all(
      channels.map(channel => this.fetchChannelPosts(channel))
    );
    
    const allPosts = results.flat();
    
    return allPosts
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(post => ({
        id: `tg-${post.id}`,
        title: this.extractTitle(post.text),
        summary: truncate(post.text.replace(/\n+/g, ' ').trim()),
        url: post.link,
        source: this.source,
        sourceLabel: this.label,
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

  private async fetchChannelPosts(channel: string): Promise<TelegramPost[]> {
    const posts: TelegramPost[] = [];
    const cutoff = subHours(new Date(), 24);
    
    try {
      const url = `https://t.me/s/${channel}`;
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(html);
      
      $('.tgme_widget_message').each((i, el) => {
        const $el = $(el);
        const messageId = $el.attr('data-post')?.split('/')[1] || `${i}`;
        const textEl = $el.find('.tgme_widget_message_text');
        const text = textEl.text().trim();
        let fullTextHtml = textEl.html() || '';
        
        fullTextHtml = fullTextHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/on\w+='[^']*'/gi, '');
        
        const fullText = textEl.text().trim();
        const images: string[] = [];
        const messageContent = $el.find('.tgme_widget_message_bubble');
        
        messageContent.find('img').each((_, imgEl) => {
          const src = $(imgEl).attr('src');
          if (src && 
              !src.includes('telegram.org/img/icon') && 
              !src.includes('emoji') &&
              !src.includes('avatar') &&
              !$(imgEl).closest('.tgme_widget_message_user_photo, .tgme_widget_message_author').length) {
            images.push(src);
          }
        });
        
        messageContent.find('.tgme_widget_message_photo_wrap, .tgme_widget_message_video_wrap').each((_, wrapEl) => {
          const $wrap = $(wrapEl);
          const style = $wrap.attr('style') || '';
          const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
          if (bgMatch && !images.includes(bgMatch[1])) {
            images.push(bgMatch[1]);
          }
          const nestedImg = $wrap.find('img').attr('src');
          if (nestedImg && !images.includes(nestedImg)) {
            images.push(nestedImg);
          }
        });
        
        messageContent.find('video').each((_, videoEl) => {
          const poster = $(videoEl).attr('poster');
          if (poster && !images.includes(poster)) {
            images.push(poster);
          }
        });
        
        const timeEl = $el.find('time');
        const datetime = timeEl.attr('datetime');
        const viewsEl = $el.find('.tgme_widget_message_views');
        const views = this.parseViews(viewsEl.text().trim());
        
        if (text && datetime) {
          const postDate = parseISO(datetime);
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

  private parseViews(viewsStr: string): number | undefined {
    if (!viewsStr) return undefined;
    const cleaned = viewsStr.toLowerCase().replace(/\s/g, '');
    if (cleaned.endsWith('k')) return Math.round(parseFloat(cleaned) * 1000);
    if (cleaned.endsWith('m')) return Math.round(parseFloat(cleaned) * 1000000);
    const num = parseInt(cleaned);
    return isNaN(num) ? undefined : num;
  }

  private extractTitle(text: string): string {
    const sentenceMatch = text.match(/^[^.!?]*[.!?](?:\s|$)/);
    if (sentenceMatch) {
      const firstSentence = sentenceMatch[0].trim();
      if (firstSentence.length <= 150) return firstSentence;
      const truncated = firstSentence.slice(0, 147);
      const lastSpace = truncated.lastIndexOf(' ');
      return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + '...';
    }
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length <= 100) return firstLine;
    return firstLine.slice(0, 97) + '...';
  }
}

export const fetchTelegramChannels = () => new TelegramFetcher().fetch();

