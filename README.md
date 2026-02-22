# music-collector

Remix + TypeScript web app for organizing your Spotify library.

## Features

- Connect to Spotify OAuth
- Sync and display:
  - Followed artists
  - Saved albums
  - Playlists
- Create custom collections containing artists and albums
- Filter library by genre and artist name
- Postgres-backed persistence
- Production basic auth (username/password via env vars)
- Vercel deployment support

## Stack

- Remix (Node runtime) + React + TypeScript
- PostgreSQL (`pg`)
- Vite build
- Vercel adapter (`@vercel/remix`)

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`

Optional (used in production basic auth):

- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`

## Spotify App Setup

1. Create an app in Spotify Developer Dashboard.
2. Add redirect URI:
   - `http://127.0.0.1:5173/auth/spotify/callback` for local dev
   - your production URL + `/auth/spotify/callback` in production
3. Add client id/secret in `.env`.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Run DB schema migration:

```bash
npm run migrate
```

3. Start dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

App will be available at `http://127.0.0.1:5173`.

## Containerized Development

1. Copy Docker env template:

```bash
cp .env.docker.example .env.docker
```

2. Set Spotify values in `.env.docker`:

   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/spotify/callback`

3. Start app + Postgres:

```bash
docker compose up --build
```

4. Open:
   - `http://127.0.0.1:5173`

Notes:

- Database migrations run automatically when the `app` container starts.
- Postgres is available on host `127.0.0.1:5433` with user/password `postgres/postgres`.
- To rebuild containers without deleting DB data:

```bash
docker compose down
docker compose up --build
```

- If app dependencies are stale, remove only the app dependencies volume (keeps DB data):

```bash
docker compose down
docker volume rm music-collector_app_node_modules
docker compose up --build
```

## Deploy to Vercel

1. Push repo to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Set all env vars from `.env.example` in Vercel Project Settings.
4. Set `SPOTIFY_REDIRECT_URI` to your deployed callback URL:
   - `https://<your-domain>/auth/spotify/callback`
5. Deploy.

## Scripts

- `npm run dev` - start React Router dev server
- `npm run build` - production build
- `npm run start` - run built server locally
- `npm run typecheck` - TypeScript checks
- `npm run migrate` - apply SQL schema to Postgres
