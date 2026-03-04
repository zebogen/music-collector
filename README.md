# music-collector

React Router + TypeScript web app for organizing your Spotify library.

## Features

- Log in with Auth0
- Link a Spotify account
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

- React Router framework + React + TypeScript
- PostgreSQL (`pg`) locally, Neon on Vercel
- Vite build
- Vercel adapter (`@vercel/react-router`)

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` for Neon migrations on Vercel/local CLI
- `SESSION_SECRET`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_REDIRECT_URI`
- `AUTH0_LOGOUT_RETURN_TO`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`

Optional (used in production basic auth):

- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`

## Auth0 Setup

1. Create an application in Auth0.
2. Add allowed callback URL:
   - `http://127.0.0.1:5173/auth/callback` for local dev
   - your production URL + `/auth/callback` in production
3. Add allowed logout URL:
   - `http://127.0.0.1:5173` for local dev
   - your production app URL in production
4. Add Auth0 values to `.env`:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_REDIRECT_URI`
   - `AUTH0_LOGOUT_RETURN_TO`

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

   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_REDIRECT_URI=http://127.0.0.1:5173/auth/callback`
   - `AUTH0_LOGOUT_RETURN_TO=http://127.0.0.1:5173`
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
2. Create a Neon project.
3. Copy two Neon connection strings:
   - pooled connection string for app runtime
   - direct/unpooled connection string for migrations
4. Import project in Vercel.
5. Set these Vercel env vars:
   - `DATABASE_URL` = Neon pooled connection string
   - `DATABASE_URL_UNPOOLED` = Neon direct/unpooled connection string
   - `SESSION_SECRET`
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_REDIRECT_URI`
   - `AUTH0_LOGOUT_RETURN_TO`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI`
   - optional: `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`
6. Set `AUTH0_REDIRECT_URI` to your deployed Auth0 callback URL:
   - `https://<your-domain>/auth/callback`
7. Set `SPOTIFY_REDIRECT_URI` to your deployed Spotify callback URL:
   - `https://<your-domain>/auth/spotify/callback`
8. Deploy.

Notes:
- Runtime queries on Vercel use Neon serverless driver via `@neondatabase/serverless`.
- Local Docker/local Postgres still use your normal `DATABASE_URL`.
- `npm run migrate` prefers `DATABASE_URL_UNPOOLED` when set, which is the right choice for Neon schema changes.
- Run `npm run migrate` after pulling the Auth0 changes so the `auth_identities` table exists.
- Vercel build runs `npm run vercel-build`, which does:
  - `npm run migrate`
  - `npm run build`
- That means each deploy applies schema changes automatically before the app build.

## Scripts

- `npm run dev` - start React Router dev server
- `npm run build` - production build
- `npm run start` - run built server locally
- `npm run typecheck` - TypeScript checks
- `npm run migrate` - apply SQL schema to Postgres
