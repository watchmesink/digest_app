import axios from 'axios';
import { USER_AGENT, HTTP_TIMEOUT_MS, HTTP_TIMEOUT_LONG_MS } from '../config/constants.js';

export const httpClient = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeout: HTTP_TIMEOUT_MS,
});

export const rssClient = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: HTTP_TIMEOUT_MS,
});

export const longTimeoutClient = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeout: HTTP_TIMEOUT_LONG_MS,
});
