import { env } from "~/utils/env.server";
import type { DbUser, SpotifySearchAlbum } from "~/types";
import { updateUserTokens } from "~/utils/user.server";

const SCOPES = ["user-library-read", "playlist-read-private", "playlist-read-collaborative", "user-follow-read"];
const FETCH_TIMEOUT_MS = 12_000;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

async function fetchWithTimeout(url: string, init: RequestInit, label: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`${label} timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getBasicAuthHeader() {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }
  const creds = `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

export function getSpotifyAuthUrl() {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_REDIRECT_URI) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_REDIRECT_URI are required");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
  });
  console.log({ params });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  if (!env.SPOTIFY_REDIRECT_URI) {
    throw new Error("SPOTIFY_REDIRECT_URI is required");
  }
  const body = new URLSearchParams({
    code,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
    body,
  }, "Spotify token exchange");

  if (!response.ok) {
    throw new Error("Spotify token exchange failed");
  }

  return (await response.json()) as SpotifyTokenResponse;
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
    body,
  }, "Spotify token refresh");

  if (!response.ok) {
    throw new Error("Spotify token refresh failed");
  }

  return (await response.json()) as SpotifyTokenResponse;
}

export async function ensureValidAccessToken(user: DbUser) {
  const expiresSoon = user.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) {
    return user.accessToken;
  }

  const tokenResponse = await refreshAccessToken(user.refreshToken);
  const updatedRefreshToken = tokenResponse.refresh_token ?? user.refreshToken;
  const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  await updateUserTokens(user.id, {
    accessToken: tokenResponse.access_token,
    refreshToken: updatedRefreshToken,
    tokenExpiresAt,
  });

  return tokenResponse.access_token;
}

export async function fetchSpotifyProfile(accessToken: string) {
  const response = await fetchWithTimeout("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }, "Spotify profile fetch");

  if (!response.ok) {
    throw new Error("Failed to fetch Spotify profile");
  }

  return response.json();
}

export async function fetchSpotifySavedAlbums(accessToken: string) {
  const albums: any[] = [];
  let offset = 0;
  let hasNext = true;

  while (hasNext) {
    const response = await fetchWithTimeout(`https://api.spotify.com/v1/me/albums?limit=50&offset=${offset}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }, "Spotify saved albums fetch");

    if (!response.ok) {
      throw new Error("Failed to fetch saved albums");
    }

    const json = await response.json();
    albums.push(...json.items);
    offset += json.items.length;
    hasNext = Boolean(json.next);
  }

  return albums;
}

export async function fetchSpotifyFollowedArtists(accessToken: string) {
  const artists: any[] = [];
  let after: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const query = new URLSearchParams({ type: "artist", limit: "50" });
    if (after) {
      query.set("after", after);
    }

    const response = await fetchWithTimeout(`https://api.spotify.com/v1/me/following?${query.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }, "Spotify followed artists fetch");

    if (!response.ok) {
      throw new Error("Failed to fetch followed artists");
    }

    const json = await response.json();
    const block = json.artists;

    artists.push(...block.items);
    after = block.cursors?.after ?? null;
    hasNext = Boolean(block.next);
  }

  return artists;
}

export async function fetchSpotifyPlaylists(accessToken: string) {
  const playlists: any[] = [];
  let offset = 0;
  let hasNext = true;

  while (hasNext) {
    const response = await fetchWithTimeout(`https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }, "Spotify playlists fetch");

    if (!response.ok) {
      throw new Error("Failed to fetch playlists");
    }

    const json = await response.json();
    playlists.push(...json.items);
    offset += json.items.length;
    hasNext = Boolean(json.next);
  }

  return playlists;
}

export async function searchSpotifyAlbums(accessToken: string, query: string): Promise<SpotifySearchAlbum[]> {
  const params = new URLSearchParams({
    q: query,
    type: "album",
    limit: "12",
  });

  const response = await fetchWithTimeout(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, "Spotify album search");

  if (!response.ok) {
    throw new Error("Failed to search Spotify albums");
  }

  const json = await response.json();
  return (json.albums?.items ?? []).map((album: any) => ({
    spotifyId: album.id,
    name: album.name,
    albumType: album.album_type ?? null,
    releaseDate: album.release_date ?? null,
    artistNames: (album.artists ?? []).map((artist: any) => artist.name),
    imageUrl: album.images?.[0]?.url ?? null,
  }));
}
