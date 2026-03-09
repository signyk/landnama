# Landnáma

Track which of the [Travelers' Century Club](https://www.travelerscenturyclub.org/) 330 territories you've visited. Compete with friends on shared leaderboards.

## Stack

- Vanilla TypeScript + Vite
- Supabase (auth, PostgreSQL, real-time)
- Cloudflare Pages

## Development

```bash
cp .env.example .env   # fill in your Supabase credentials
npm install
npm run dev            # http://localhost:3000
npm run build          # type-check + bundle
npm run lint           # ESLint
npm run format         # Prettier
```

### Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

## Deployment

Hosted on Cloudflare Pages. `public/_redirects` rewrites all paths to `index.html` for SPA routing. Push to `main` to deploy.
