# Digest — News Aggregator

A unified news feed aggregating content from multiple sources into a clean, HackerNews-style interface.

![Digest Screenshot](https://via.placeholder.com/800x400/06402B/FFFFFF?text=Digest+News+Aggregator)

## Sources

- **HackerNews** — Top 10 most upvoted stories (last 24h)
- **Show HN** — Top 10 most upvoted Show HN posts (last 24h)
- **Product Hunt** — Top 10 products of the day
- **Hype** — Top news from hype.replicate.dev
- **Telegram Channels** — Posts from selected Russian tech/ML channels
- **HN Best Comments** — Quality comments from HackerNews discussions

### Telegram Channels
- @data_secrets
- @gonzo_ML
- @seeallochnaya
- @denissexy
- @NeuralShit
- @cryptoEssay
- @sergiobulaev
- @blognot
- @addmeto

## Features

- 🔄 Auto-updates every 30 minutes
- 🏷️ Filter by source type
- 🌙 Dark mode support
- 📱 Responsive design
- ⚡ Fast, lightweight frontend

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Scheduling**: node-cron
- **Scraping**: axios + cheerio

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/feed` — Get all feed items
- `GET /api/feed?source=hackernews` — Filter by source
- `POST /api/refresh` — Manually trigger feed refresh
- `GET /health` — Health check endpoint

### Available source filters:
- `hackernews`
- `showhn`
- `producthunt`
- `telegram`
- `hype`
- `hn-comments`

## Deployment on Railway

1. Push code to GitHub
2. Create new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Railway will auto-detect and deploy

The app includes `railway.json` configuration for optimal deployment.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |

## Architecture

```
src/
├── server.ts          # Express server + cron scheduling
├── aggregator.ts      # Feed aggregation logic
├── types.ts           # TypeScript interfaces
└── fetchers/          # Data source fetchers
    ├── hackernews.ts  # HN API integration
    ├── hn-comments.ts # HN Algolia API for comments
    ├── producthunt.ts # ProductHunt scraper
    ├── telegram.ts    # Telegram public channel scraper
    └── hype.ts        # Hype scraper

public/
├── index.html         # Main page
├── styles.css         # Styling
└── app.js             # Frontend JavaScript
```

## Notes

- Telegram channels are scraped from public preview pages (`t.me/s/channel`)
- ProductHunt uses web scraping as their API requires OAuth
- HN Best Comments uses the Algolia HN Search API for better discovery
- The feed caches in memory and persists across requests

## License

MIT

