import type { Collection } from "~/types";

export const TABS = ["albums", "artists", "playlists", "collections"] as const;
export type TabKey = (typeof TABS)[number];

export type HomeFilters = {
  genre: string;
  artist: string;
  tab: TabKey;
  artistsPage: number;
  albumsPage: number;
  playlistsPage: number;
  selectedAlbumId: number | null;
  selectedCollectionId: number | null;
};

export function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseTab(value: string | null): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "collections";
}

export function parseId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function buildHomeHref(
  filters: HomeFilters,
  pagination: {
    artists: { page: number };
    albums: { page: number };
    playlists: { page: number };
  },
  overrides?: {
    genre?: string;
    artist?: string;
    tab?: TabKey;
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
  }
) {
  const params = new URLSearchParams();

  const genre = overrides && "genre" in overrides ? overrides.genre : filters.genre;
  const artist = overrides && "artist" in overrides ? overrides.artist : filters.artist;

  if (genre) {
    params.set("genre", genre);
  }
  if (artist) {
    params.set("artist", artist);
  }

  const tab = overrides?.tab ?? filters.tab;
  const artistsPage = overrides?.artistsPage ?? pagination.artists.page;
  const albumsPage = overrides?.albumsPage ?? pagination.albums.page;
  const playlistsPage = overrides?.playlistsPage ?? pagination.playlists.page;
  const selectedAlbumId =
    overrides && "selectedAlbumId" in overrides ? overrides.selectedAlbumId : filters.selectedAlbumId;
  const selectedCollectionId =
    overrides && "selectedCollectionId" in overrides ? overrides.selectedCollectionId : filters.selectedCollectionId;

  params.set("tab", tab);
  params.set("artistsPage", String(artistsPage));
  params.set("albumsPage", String(albumsPage));
  params.set("playlistsPage", String(playlistsPage));
  if (selectedAlbumId) {
    params.set("album", String(selectedAlbumId));
  }
  if (selectedCollectionId) {
    params.set("collection", String(selectedCollectionId));
  }

  return `/collections?${params.toString()}`;
}

export function getSelectedCollection(collections: Collection[], selectedCollectionId: number | null) {
  return collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0] ?? null;
}
