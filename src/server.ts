import express from 'express';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import { refreshFeed, getFeedState } from './aggregator.js';
import { SourceType } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get feed items
app.get('/api/feed', (req, res) => {
  const { source } = req.query;
  const feedState = getFeedState();
  
  let items = feedState.items;
  
  // Filter by source if specified
  if (source && typeof source === 'string') {
    const validSources: SourceType[] = ['hackernews', 'showhn', 'producthunt', 'telegram', 'hype', 'hn-comments'];
    if (validSources.includes(source as SourceType)) {
      items = items.filter(item => item.source === source);
    }
  } else {
    // Exclude Hype and HN Comments from main feed
    items = items.filter(item => item.source !== 'hype' && item.source !== 'hn-comments');
  }
  
  res.json({
    items,
    lastUpdated: feedState.lastUpdated,
    totalCount: feedState.items.length,
    filteredCount: items.length,
    errors: feedState.errors,
  });
});

// Manual refresh endpoint (for debugging)
app.post('/api/refresh', async (req, res) => {
  try {
    await refreshFeed();
    res.json({ success: true, message: 'Feed refreshed' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', lastUpdated: getFeedState().lastUpdated });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Digest app running at http://localhost:${PORT}`);
  
  // Initial fetch on startup
  console.log('📰 Performing initial feed fetch...');
  await refreshFeed();
  
  // Schedule refresh every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ Scheduled feed refresh triggered');
    await refreshFeed();
  });
  
  console.log('⏰ Scheduled updates every 30 minutes');
});

