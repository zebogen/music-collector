export type DbUser = {
  id: number;
  spotifyUserId: string;
  displayName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

export type Artist = {
  id: number;
  spotifyId: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
};

export type Album = {
  id: number;
  spotifyId: string;
  name: string;
  albumType: string | null;
  releaseDate: string | null;
  artistNames: string[];
  imageUrl: string | null;
};

export type SpotifySearchAlbum = {
  spotifyId: string;
  name: string;
  albumType: string | null;
  releaseDate: string | null;
  artistNames: string[];
  imageUrl: string | null;
};

export type Playlist = {
  id: number;
  spotifyId: string;
  name: string;
  description: string | null;
  tracksTotal: number;
  imageUrl: string | null;
};

export type Collection = {
  id: number;
  name: string;
  description: string | null;
  artists: Pick<Artist, "id" | "name" | "genres">[];
  albums: Pick<Album, "id" | "spotifyId" | "name" | "artistNames" | "imageUrl" | "releaseDate">[];
};
