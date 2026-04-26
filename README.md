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
- `AUTH0_APP_BASE_URL` (optional)
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
   - optional: `AUTH0_APP_BASE_URL`
   - `AUTH0_REDIRECT_URI`
   - `AUTH0_LOGOUT_RETURN_TO`

### Auth0 + Vercel Preview Deployments (PR branches)

This app supports dynamic Auth0 callback/logout URLs, so preview deploys can authenticate without hard-coding each deployment URL.

How it works:

- If `AUTH0_REDIRECT_URI` / `AUTH0_LOGOUT_RETURN_TO` are set, those explicit values are used.
- On Vercel **Preview** (`VERCEL_ENV=preview`), the app always uses preview runtime origin/branch URL so a production `AUTH0_REDIRECT_URI` does not force redirects to prod.
- Otherwise, the app computes callback/logout URLs from runtime host headers.
- On Vercel preview deploys, if `VERCEL_BRANCH_URL` is present, the app prefers that stable branch URL (for example, `my-app-git-feature-x.vercel.app`) so auth continues to work across commits in the same PR branch.

Recommended Auth0 settings:

1. In **Allowed Callback URLs**, add:
   - `http://127.0.0.1:5173/auth/callback`
   - `https://<your-production-domain>/auth/callback`
   - `https://<your-project>-git-<branch>-<team>.vercel.app/auth/callback` for each long-lived preview branch you test, or use a wildcard pattern supported by your Auth0 tenant policy.
2. In **Allowed Logout URLs**, add matching base URLs (without `/auth/callback`).
3. On Vercel, you can leave `AUTH0_REDIRECT_URI` and `AUTH0_LOGOUT_RETURN_TO` unset for Preview to use dynamic behavior, and set explicit values only for Production if preferred.

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
   - optional: `AUTH0_APP_BASE_URL` (forces a single base URL for callback/logout generation)
   - `AUTH0_REDIRECT_URI`
   - `AUTH0_LOGOUT_RETURN_TO`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI`
   - optional: `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`
6. Either:
   - set `AUTH0_REDIRECT_URI` and `AUTH0_LOGOUT_RETURN_TO` to explicit production URLs, or
   - leave them unset and let runtime URL detection generate them dynamically.
7. If you set `AUTH0_REDIRECT_URI`, use:
   - `https://<your-domain>/auth/callback`
8. Set `SPOTIFY_REDIRECT_URI` to your deployed Spotify callback URL:
   - `https://<your-domain>/auth/spotify/callback`
9. Deploy.

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
