import { db } from "~/utils/db.server";
import type { Album, Artist, Collection, Playlist, SpotifySearchAlbum } from "~/types";

function mapArtist(row: any): Artist {
  return {
    id: row.id,
    spotifyId: row.spotify_id,
    name: row.name,
    genres: row.genres,
    imageUrl: row.image_url
  };
}

function mapAlbum(row: any): Album {
  return {
    id: row.id,
    spotifyId: row.spotify_id,
    name: row.name,
    albumType: row.album_type,
    releaseDate: row.release_date,
    artistNames: row.artist_names,
    imageUrl: row.image_url
  };
}

function mapPlaylist(row: any): Playlist {
  return {
    id: row.id,
    spotifyId: row.spotify_id,
    name: row.name,
    description: row.description,
    tracksTotal: row.tracks_total,
    imageUrl: row.image_url
  };
}

async function upsertAlbum(client: any, album: SpotifySearchAlbum) {
  const result = await client.query(
    `
      INSERT INTO albums (spotify_id, name, album_type, release_date, artist_names, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (spotify_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        album_type = EXCLUDED.album_type,
        release_date = EXCLUDED.release_date,
        artist_names = EXCLUDED.artist_names,
        image_url = EXCLUDED.image_url,
        updated_at = NOW()
      RETURNING id
    `,
    [album.spotifyId, album.name, album.albumType, album.releaseDate, album.artistNames, album.imageUrl]
  );

  return result.rows[0].id as number;
}

export async function syncSpotifyData(input: {
  userId: number;
  artists: any[];
  albums: any[];
  playlists: any[];
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM user_saved_artists WHERE user_id = $1", [input.userId]);
    await client.query("DELETE FROM user_saved_albums WHERE user_id = $1", [input.userId]);
    await client.query("DELETE FROM playlists WHERE user_id = $1", [input.userId]);

    for (const artist of input.artists) {
      const artistResult = await client.query(
        `
          INSERT INTO artists (spotify_id, name, genres, image_url)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (spotify_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            genres = EXCLUDED.genres,
            image_url = EXCLUDED.image_url,
            updated_at = NOW()
          RETURNING id
        `,
        [artist.id, artist.name, artist.genres ?? [], artist.images?.[0]?.url ?? null]
      );

      await client.query(
        `
          INSERT INTO user_saved_artists (user_id, artist_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [input.userId, artistResult.rows[0].id]
      );
    }

    for (const item of input.albums) {
      const album = item.album;
      const albumId = await upsertAlbum(client, {
        spotifyId: album.id,
        name: album.name,
        albumType: album.album_type ?? null,
        releaseDate: album.release_date ?? null,
        artistNames: (album.artists ?? []).map((artist: any) => artist.name),
        imageUrl: album.images?.[0]?.url ?? null
      });

      await client.query(
        `
          INSERT INTO user_saved_albums (user_id, album_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [input.userId, albumId]
      );
    }

    for (const playlist of input.playlists) {
      await client.query(
        `
          INSERT INTO playlists (spotify_id, user_id, name, description, tracks_total, image_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, spotify_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            tracks_total = EXCLUDED.tracks_total,
            image_url = EXCLUDED.image_url,
            updated_at = NOW()
        `,
        [
          playlist.id,
          input.userId,
          playlist.name,
          playlist.description ?? null,
          playlist.tracks?.total ?? 0,
          playlist.images?.[0]?.url ?? null
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLibraryData(
  userId: number,
  filters?: { genre?: string; artist?: string },
  pagination?: { artistsPage?: number; albumsPage?: number; playlistsPage?: number; pageSize?: number }
) {
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;
  const artistsPage = pagination?.artistsPage && pagination.artistsPage > 0 ? pagination.artistsPage : 1;
  const albumsPage = pagination?.albumsPage && pagination.albumsPage > 0 ? pagination.albumsPage : 1;
  const playlistsPage = pagination?.playlistsPage && pagination.playlistsPage > 0 ? pagination.playlistsPage : 1;
  const artistsOffset = (artistsPage - 1) * pageSize;
  const albumsOffset = (albumsPage - 1) * pageSize;
  const playlistsOffset = (playlistsPage - 1) * pageSize;

  const artistParams: any[] = [userId];
  let artistBaseSql = `
    FROM artists a
    JOIN user_saved_artists usa ON usa.artist_id = a.id
    WHERE usa.user_id = $1
  `;

  if (filters?.genre) {
    artistParams.push(filters.genre.toLowerCase());
    artistBaseSql += ` AND EXISTS (
      SELECT 1
      FROM unnest(a.genres) AS g
      WHERE lower(g) = $${artistParams.length}
    )`;
  }

  if (filters?.artist) {
    artistParams.push(`%${filters.artist.toLowerCase()}%`);
    artistBaseSql += ` AND lower(a.name) LIKE $${artistParams.length}`;
  }

  const artistCountSql = `SELECT COUNT(*)::int AS count ${artistBaseSql}`;
  const artistSql = `SELECT a.* ${artistBaseSql} ORDER BY a.name ASC LIMIT $${artistParams.length + 1} OFFSET $${
    artistParams.length + 2
  }`;
  const artistPagedParams = [...artistParams, pageSize, artistsOffset];

  const albumParams: any[] = [userId];
  let albumBaseSql = `
    FROM albums al
    JOIN user_saved_albums usa ON usa.album_id = al.id
    WHERE usa.user_id = $1
  `;

  if (filters?.artist) {
    albumParams.push(`%${filters.artist.toLowerCase()}%`);
    albumBaseSql += ` AND EXISTS (
      SELECT 1
      FROM unnest(al.artist_names) AS artist_name
      WHERE lower(artist_name) LIKE $${albumParams.length}
    )`;
  }

  if (filters?.genre) {
    albumParams.push(filters.genre.toLowerCase());
    albumBaseSql += ` AND EXISTS (
      SELECT 1
      FROM unnest(al.artist_names) AS album_artist_name
      JOIN artists a ON lower(a.name) = lower(album_artist_name)
      JOIN user_saved_artists usa2 ON usa2.artist_id = a.id
      WHERE usa2.user_id = $1
        AND EXISTS (
          SELECT 1
          FROM unnest(a.genres) AS g
          WHERE lower(g) = $${albumParams.length}
        )
    )`;
  }

  const albumCountSql = `SELECT COUNT(*)::int AS count ${albumBaseSql}`;
  const albumSql = `SELECT al.* ${albumBaseSql} ORDER BY al.name ASC LIMIT $${albumParams.length + 1} OFFSET $${
    albumParams.length + 2
  }`;
  const albumPagedParams = [...albumParams, pageSize, albumsOffset];

  const playlistCountSql = "SELECT COUNT(*)::int AS count FROM playlists WHERE user_id = $1";
  const playlistSql = "SELECT * FROM playlists WHERE user_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3";

  const [artistsCountResult, albumsCountResult, playlistsCountResult, artistsResult, albumsResult, playlistsResult, genresResult] =
    await Promise.all([
      db.query(artistCountSql, artistParams),
      db.query(albumCountSql, albumParams),
      db.query(playlistCountSql, [userId]),
      db.query(artistSql, artistPagedParams),
      db.query(albumSql, albumPagedParams),
      db.query(playlistSql, [userId, pageSize, playlistsOffset]),
    db.query(
      `
        SELECT DISTINCT unnest(genres) AS genre
        FROM artists a
        JOIN user_saved_artists usa ON usa.artist_id = a.id
        WHERE usa.user_id = $1 AND array_length(genres, 1) > 0
        ORDER BY genre ASC
      `,
      [userId]
    )
    ]);

  const artistsTotal = artistsCountResult.rows[0]?.count ?? 0;
  const albumsTotal = albumsCountResult.rows[0]?.count ?? 0;
  const playlistsTotal = playlistsCountResult.rows[0]?.count ?? 0;

  return {
    artists: artistsResult.rows.map(mapArtist),
    albums: albumsResult.rows.map(mapAlbum),
    playlists: playlistsResult.rows.map(mapPlaylist),
    genres: genresResult.rows.map((row: any) => row.genre as string),
    pagination: {
      pageSize,
      artists: {
        page: artistsPage,
        totalItems: artistsTotal,
        totalPages: Math.max(1, Math.ceil(artistsTotal / pageSize))
      },
      albums: {
        page: albumsPage,
        totalItems: albumsTotal,
        totalPages: Math.max(1, Math.ceil(albumsTotal / pageSize))
      },
      playlists: {
        page: playlistsPage,
        totalItems: playlistsTotal,
        totalPages: Math.max(1, Math.ceil(playlistsTotal / pageSize))
      }
    }
  };
}

export async function createCollection(input: { userId: number; name: string; description?: string }) {
  await db.query(
    `
      INSERT INTO collections (user_id, name, description)
      VALUES ($1, $2, $3)
    `,
    [input.userId, input.name, input.description ?? null]
  );
}

export async function updateCollection(input: { userId: number; collectionId: number; name: string; description?: string }) {
  await db.query(
    `
      UPDATE collections
      SET name = $3,
          description = $4,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `,
    [input.collectionId, input.userId, input.name, input.description ?? null]
  );
}

export async function deleteCollection(input: { userId: number; collectionId: number }) {
  await db.query(
    `
      DELETE FROM collections
      WHERE id = $1 AND user_id = $2
    `,
    [input.collectionId, input.userId]
  );
}

export async function addArtistToCollection(input: { collectionId: number; artistId: number; userId: number }) {
  await db.query(
    `
      INSERT INTO collection_artists (collection_id, artist_id)
      SELECT c.id, $2
      FROM collections c
      WHERE c.id = $1 AND c.user_id = $3
      ON CONFLICT DO NOTHING
    `,
    [input.collectionId, input.artistId, input.userId]
  );
}

export async function addAlbumToCollection(input: { collectionId: number; albumId: number; userId: number }) {
  await db.query(
    `
      INSERT INTO collection_albums (collection_id, album_id)
      SELECT c.id, $2
      FROM collections c
      WHERE c.id = $1 AND c.user_id = $3
      ON CONFLICT DO NOTHING
    `,
    [input.collectionId, input.albumId, input.userId]
  );
}

export async function removeArtistFromCollection(input: { collectionId: number; artistId: number; userId: number }) {
  await db.query(
    `
      DELETE FROM collection_artists ca
      USING collections c
      WHERE ca.collection_id = c.id
        AND ca.collection_id = $1
        AND ca.artist_id = $2
        AND c.user_id = $3
    `,
    [input.collectionId, input.artistId, input.userId]
  );
}

export async function removeAlbumFromCollection(input: { collectionId: number; albumId: number; userId: number }) {
  await db.query(
    `
      DELETE FROM collection_albums ca
      USING collections c
      WHERE ca.collection_id = c.id
        AND ca.collection_id = $1
        AND ca.album_id = $2
        AND c.user_id = $3
    `,
    [input.collectionId, input.albumId, input.userId]
  );
}

export async function addSpotifySearchAlbumToCollection(input: {
  userId: number;
  collectionId: number;
  album: SpotifySearchAlbum;
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const albumId = await upsertAlbum(client, input.album);
    await client.query(
      `
        INSERT INTO collection_albums (collection_id, album_id)
        SELECT c.id, $2
        FROM collections c
        WHERE c.id = $1 AND c.user_id = $3
        ON CONFLICT DO NOTHING
      `,
      [input.collectionId, albumId, input.userId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCollections(userId: number): Promise<Collection[]> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.description,
        COALESCE(artists.items, '[]'::json) AS artists,
        COALESCE(albums.items, '[]'::json) AS albums
      FROM collections c
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object('id', a.id, 'name', a.name, 'genres', a.genres)
          ORDER BY a.name
        ) AS items
        FROM collection_artists ca
        JOIN artists a ON a.id = ca.artist_id
        WHERE ca.collection_id = c.id
      ) AS artists ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object(
            'id', al.id,
            'spotifyId', al.spotify_id,
            'name', al.name,
            'artistNames', al.artist_names,
            'imageUrl', al.image_url,
            'releaseDate', al.release_date
          )
          ORDER BY al.name
        ) AS items
        FROM collection_albums cal
        JOIN albums al ON al.id = cal.album_id
        WHERE cal.collection_id = c.id
      ) AS albums ON TRUE
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    artists: row.artists,
    albums: row.albums
  }));
}

export async function getCollectionsForView(userId: number, selectedCollectionId: number | null): Promise<Collection[]> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.description,
        CASE
          WHEN $2::int IS NOT NULL AND c.id = $2::int THEN COALESCE(artists.items, '[]'::json)
          ELSE '[]'::json
        END AS artists,
        CASE
          WHEN $2::int IS NOT NULL AND c.id = $2::int THEN COALESCE(albums.items, '[]'::json)
          ELSE '[]'::json
        END AS albums
      FROM collections c
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object('id', a.id, 'name', a.name, 'genres', a.genres)
          ORDER BY a.name
        ) AS items
        FROM collection_artists ca
        JOIN artists a ON a.id = ca.artist_id
        WHERE ca.collection_id = c.id
      ) AS artists ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object(
            'id', al.id,
            'spotifyId', al.spotify_id,
            'name', al.name,
            'artistNames', al.artist_names,
            'imageUrl', al.image_url,
            'releaseDate', al.release_date
          )
          ORDER BY al.name
        ) AS items
        FROM collection_albums cal
        JOIN albums al ON al.id = cal.album_id
        WHERE cal.collection_id = c.id
      ) AS albums ON TRUE
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `,
    [userId, selectedCollectionId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    artists: row.artists,
    albums: row.albums
  }));
}

export async function getCollectionNamesForAlbum(userId: number, albumId: number): Promise<Array<{ id: number; name: string }>> {
  const result = await db.query(
    `
      SELECT c.id, c.name
      FROM collections c
      JOIN collection_albums ca ON ca.collection_id = c.id
      WHERE c.user_id = $1
        AND ca.album_id = $2
      ORDER BY c.name ASC
    `,
    [userId, albumId]
  );

  return result.rows.map((row: any) => ({ id: row.id, name: row.name }));
}

export async function getCollectionSummaries(userId: number): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  albumsCount: number;
  artistsCount: number;
  coverImageUrl: string | null;
}>> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.description,
        (
          SELECT COUNT(*)::int
          FROM collection_albums cal
          WHERE cal.collection_id = c.id
        ) AS albums_count,
        (
          SELECT COUNT(*)::int
          FROM collection_artists ca
          WHERE ca.collection_id = c.id
        ) AS artists_count,
        (
          SELECT al.image_url
          FROM collection_albums cal
          JOIN albums al ON al.id = cal.album_id
          WHERE cal.collection_id = c.id
          ORDER BY al.updated_at DESC NULLS LAST
          LIMIT 1
        ) AS cover_image_url
      FROM collections c
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    albumsCount: row.albums_count ?? 0,
    artistsCount: row.artists_count ?? 0,
    coverImageUrl: row.cover_image_url ?? null
  }));
}

export async function getCollectionById(userId: number, collectionId: number): Promise<Collection | null> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.description,
        COALESCE(artists.items, '[]'::json) AS artists,
        COALESCE(albums.items, '[]'::json) AS albums
      FROM collections c
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object('id', a.id, 'name', a.name, 'genres', a.genres)
          ORDER BY a.name
        ) AS items
        FROM collection_artists ca
        JOIN artists a ON a.id = ca.artist_id
        WHERE ca.collection_id = c.id
      ) AS artists ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          jsonb_build_object(
            'id', al.id,
            'spotifyId', al.spotify_id,
            'name', al.name,
            'artistNames', al.artist_names,
            'imageUrl', al.image_url,
            'releaseDate', al.release_date
          )
          ORDER BY al.name
        ) AS items
        FROM collection_albums cal
        JOIN albums al ON al.id = cal.album_id
        WHERE cal.collection_id = c.id
      ) AS albums ON TRUE
      WHERE c.user_id = $1 AND c.id = $2
      LIMIT 1
    `,
    [userId, collectionId]
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    artists: row.artists,
    albums: row.albums
  };
}

export async function getPlaylistById(userId: number, playlistId: number): Promise<Playlist | null> {
  const result = await db.query(
    `
      SELECT *
      FROM playlists
      WHERE user_id = $1 AND id = $2
      LIMIT 1
    `,
    [userId, playlistId]
  );

  if (!result.rowCount) {
    return null;
  }

  return mapPlaylist(result.rows[0]);
}

export async function getSavedArtistSeeds(userId: number, limit = 8): Promise<Array<{
  id: number;
  spotifyId: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
}>> {
  const result = await db.query(
    `
      SELECT a.id, a.spotify_id, a.name, a.genres, a.image_url
      FROM artists a
      JOIN user_saved_artists usa ON usa.artist_id = a.id
      WHERE usa.user_id = $1
      ORDER BY array_length(a.genres, 1) DESC NULLS LAST, a.name ASC
      LIMIT $2
    `,
    [userId, Math.max(1, limit)]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    spotifyId: row.spotify_id,
    name: row.name,
    genres: row.genres ?? [],
    imageUrl: row.image_url ?? null
  }));
}

export async function getSavedSpotifyIdSets(userId: number): Promise<{
  artistSpotifyIds: Set<string>;
  albumSpotifyIds: Set<string>;
}> {
  const [artistRows, albumRows] = await Promise.all([
    db.query(
      `
        SELECT a.spotify_id
        FROM artists a
        JOIN user_saved_artists usa ON usa.artist_id = a.id
        WHERE usa.user_id = $1
      `,
      [userId]
    ),
    db.query(
      `
        SELECT al.spotify_id
        FROM albums al
        JOIN user_saved_albums usa ON usa.album_id = al.id
        WHERE usa.user_id = $1
      `,
      [userId]
    )
  ]);

  return {
    artistSpotifyIds: new Set(artistRows.rows.map((row: any) => String(row.spotify_id))),
    albumSpotifyIds: new Set(albumRows.rows.map((row: any) => String(row.spotify_id)))
  };
}

export async function getRediscoveryQueue(userId: number, limit = 24): Promise<Array<{
  id: number;
  spotifyId: string;
  name: string;
  artistNames: string[];
  imageUrl: string | null;
  releaseDate: string | null;
  inCollection: boolean;
}>> {
  const result = await db.query(
    `
      SELECT
        al.id,
        al.spotify_id,
        al.name,
        al.artist_names,
        al.image_url,
        al.release_date,
        EXISTS (
          SELECT 1
          FROM collection_albums ca
          JOIN collections c ON c.id = ca.collection_id
          WHERE c.user_id = $1 AND ca.album_id = al.id
        ) AS in_collection
      FROM albums al
      JOIN user_saved_albums usa ON usa.album_id = al.id
      WHERE usa.user_id = $1
      ORDER BY
        in_collection ASC,
        CASE WHEN al.release_date ~ '^[0-9]{4}' THEN split_part(al.release_date, '-', 1)::int ELSE 9999 END ASC,
        al.name ASC
      LIMIT $2
    `,
    [userId, Math.max(1, limit)]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    spotifyId: row.spotify_id,
    name: row.name,
    artistNames: row.artist_names ?? [],
    imageUrl: row.image_url ?? null,
    releaseDate: row.release_date ?? null,
    inCollection: Boolean(row.in_collection)
  }));
}

export async function getArtistById(userId: number, artistId: number): Promise<Artist | null> {
  const result = await db.query(
    `
      SELECT a.*
      FROM artists a
      JOIN user_saved_artists usa ON usa.artist_id = a.id
      WHERE usa.user_id = $1 AND a.id = $2
      LIMIT 1
    `,
    [userId, artistId]
  );

  if (!result.rowCount) {
    return null;
  }

  return mapArtist(result.rows[0]);
}

export async function getAlbumById(userId: number, albumId: number): Promise<Album | null> {
  const result = await db.query(
    `
      SELECT al.*
      FROM albums al
      JOIN user_saved_albums usa ON usa.album_id = al.id
      WHERE usa.user_id = $1 AND al.id = $2
      LIMIT 1
    `,
    [userId, albumId]
  );

  if (!result.rowCount) {
    return null;
  }

  return mapAlbum(result.rows[0]);
}
