# AGENTS.md

## Cursor Cloud specific instructions

Digest is a single self-contained Node.js + TypeScript (ESM) service: an Express app that
aggregates news from external sources into an in-memory feed and serves a static frontend from
`public/`. There is no database, cache, queue, or companion service to run — just this one process.

### Running
- Dev (hot reload): `npm run dev` (uses `tsx watch`), then open `http://localhost:3000`. This is the
  primary way to develop. `tsx` transpiles without type-checking, so it will run even if `tsc` has
  type errors.
- Prod build/run: `npm run build` (`tsc` → `dist/`) then `npm start`. The `build` and `start` scripts
  are also what the Procfile / `railway.json` use.
- On startup the server does an initial feed fetch and then refreshes every 30 min via `node-cron`.

### Testing / linting
- No test framework and no linter are configured. The only static quality gate is `npm run build`
  (`tsc` strict). Use API endpoints (`/health`, `/api/feed`, `POST /api/refresh`,
  `GET|PUT /api/channels/telegram`) for end-to-end verification.

### Non-obvious caveats
- Requires outbound internet: all "sources" (HackerNews, Show HN, HN comments, Telegram `t.me/s/`,
  Hype, Product Hunt, Substack) are remote. Every fetch is wrapped in `Promise.allSettled`/try-catch,
  so the app still boots and serves partial data if some sources fail. Product Hunt is scraped and
  frequently returns 0 items — this is expected, not a setup failure.
- `data/channels.json` is the only on-disk state (the Telegram channel list, editable via
  `PUT /api/channels/telegram`).
- `npm run fetch` is broken: it points at `src/scripts/fetch-once.ts`, which does not exist.
- Env vars (both optional): `PORT` (default `3000`), `SUBSTACK_FEEDS` (comma/newline separated).
