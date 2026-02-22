import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, useActionData, useLoaderData, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { addAlbumToCollection, createCollection, getCollections, getLibraryData, syncSpotifyData } from "~/utils/library.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyFollowedArtists,
  fetchSpotifyPlaylists,
  fetchSpotifySavedAlbums
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

const PAGE_SIZE = 20;
const TABS = ["albums", "artists", "playlists", "collections"] as const;
type TabKey = (typeof TABS)[number];

function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseTab(value: string | null): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "albums";
}

function parseId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getPageItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const validPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  for (let index = 0; index < validPages.length; index += 1) {
    const page = validPages[index];
    const previous = validPages[index - 1];
    if (index > 0 && previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return {
      connected: false,
      libraryData: null,
      collections: [],
      filters: {
        genre: "",
        artist: "",
        tab: "albums" as TabKey,
        artistsPage: 1,
        albumsPage: 1,
        playlistsPage: 1,
        selectedAlbumId: null as number | null,
        selectedCollectionId: null as number | null
      }
    };
  }

  const url = new URL(request.url);
  const genre = (url.searchParams.get("genre") ?? "").trim();
  const artist = (url.searchParams.get("artist") ?? "").trim();
  const tab = parseTab(url.searchParams.get("tab"));
  const artistsPage = parsePage(url.searchParams.get("artistsPage"));
  const albumsPage = parsePage(url.searchParams.get("albumsPage"));
  const playlistsPage = parsePage(url.searchParams.get("playlistsPage"));
  const selectedAlbumId = parseId(url.searchParams.get("album"));
  const selectedCollectionId = parseId(url.searchParams.get("collection"));

  const [libraryData, collections] = await Promise.all([
    getLibraryData(
      userId,
      { genre: genre || undefined, artist: artist || undefined },
      { artistsPage, albumsPage, playlistsPage, pageSize: PAGE_SIZE }
    ),
    getCollections(userId)
  ]);

  return {
    connected: true,
    libraryData,
    collections,
    filters: { genre, artist, tab, artistsPage, albumsPage, playlistsPage, selectedAlbumId, selectedCollectionId }
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    const user = await getUserById(userId);
    if (!user) {
      return data({ message: "Missing user, try logging in again" }, { status: 400 });
    }

    const accessToken = await ensureValidAccessToken(user);
    const [artists, albums, playlists] = await Promise.all([
      fetchSpotifyFollowedArtists(accessToken),
      fetchSpotifySavedAlbums(accessToken),
      fetchSpotifyPlaylists(accessToken)
    ]);

    await syncSpotifyData({ userId, artists, albums, playlists });
    return redirect("/");
  }

  if (intent === "create_collection") {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      return data({ error: "Collection name is required" }, { status: 400 });
    }

    try {
      await createCollection({ userId, name, description });
    } catch (error: any) {
      if (error?.code === "23505") {
        return data({ error: "Collection title already exists." }, { status: 409 });
      }
      throw error;
    }
    return redirect("/");
  }

  if (intent === "add_album_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const albumId = Number(formData.get("albumId"));

    if (collectionId > 0 && albumId > 0) {
      await addAlbumToCollection({ collectionId, albumId, userId });
    }

    return redirect("/");
  }

  return redirect("/");
}

export default function Index() {
  const { connected, libraryData, collections, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!connected || !libraryData) {
    return (
      <section className="card">
        <h2>Connect your Spotify account</h2>
        <p>Sign in with Spotify to import your library, playlists, and organize custom collections.</p>
        <a className="button" href="/auth/spotify">
          Connect Spotify
        </a>
      </section>
    );
  }

  const pageData = libraryData;
  const safeCollections = collections.filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));

  function buildHref(overrides?: {
    tab?: TabKey;
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
  }) {
    const params = new URLSearchParams();

    if (filters.genre) {
      params.set("genre", filters.genre);
    }
    if (filters.artist) {
      params.set("artist", filters.artist);
    }

    const tab = overrides?.tab ?? filters.tab;
    const artistsPage = overrides?.artistsPage ?? pageData.pagination.artists.page;
    const albumsPage = overrides?.albumsPage ?? pageData.pagination.albums.page;
    const playlistsPage = overrides?.playlistsPage ?? pageData.pagination.playlists.page;
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

    return `/?${params.toString()}`;
  }

  function renderPagination(list: "albums" | "artists" | "playlists", currentPage: number, totalPages: number) {
    const pageItems = getPageItems(currentPage, totalPages);

    return (
      <div className="pagination">
        <a
          className="button secondary"
          aria-disabled={currentPage <= 1}
          href={
            list === "albums"
              ? buildHref({ albumsPage: Math.max(1, currentPage - 1), selectedAlbumId: null })
              : list === "artists"
                ? buildHref({ artistsPage: Math.max(1, currentPage - 1) })
                : buildHref({ playlistsPage: Math.max(1, currentPage - 1) })
          }
        >
          Previous
        </a>
        <div className="page-links">
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`${list}-ellipsis-${index}`} className="page-ellipsis">
                ...
              </span>
            ) : (
              <a
                key={`${list}-${item}`}
                className={`button secondary page-link${item === currentPage ? " active" : ""}`}
                aria-current={item === currentPage ? "page" : undefined}
                href={
                  list === "albums"
                    ? buildHref({ albumsPage: item, selectedAlbumId: null })
                    : list === "artists"
                      ? buildHref({ artistsPage: item })
                      : buildHref({ playlistsPage: item })
                }
              >
                {item}
              </a>
            )
          )}
        </div>
        <a
          className="button secondary"
          aria-disabled={currentPage >= totalPages}
          href={
            list === "albums"
              ? buildHref({ albumsPage: Math.min(totalPages, currentPage + 1), selectedAlbumId: null })
              : list === "artists"
                ? buildHref({ artistsPage: Math.min(totalPages, currentPage + 1) })
                : buildHref({ playlistsPage: Math.min(totalPages, currentPage + 1) })
          }
        >
          Next
        </a>
      </div>
    );
  }

  const selectedAlbum = libraryData.albums.find((album) => album.id === filters.selectedAlbumId) ?? null;
  const selectedAlbumCollections = selectedAlbum
    ? safeCollections.filter((collection) => collection.albums.some((album) => album.id === selectedAlbum.id))
    : [];
  const selectedCollection =
    safeCollections.find((collection) => collection.id === filters.selectedCollectionId) ?? safeCollections[0] ?? null;
  const artistFilter = filters.artist.toLowerCase();
  const genreFilter = filters.genre.toLowerCase();

  const selectedCollectionArtists = selectedCollection
    ? selectedCollection.artists.filter((artist) => {
        const artistMatches = !artistFilter || artist.name.toLowerCase().includes(artistFilter);
        const genreMatches = !genreFilter || artist.genres.some((genre) => genre.toLowerCase() === genreFilter);
        return artistMatches && genreMatches;
      })
    : [];

  const selectedCollectionAlbums = selectedCollection
    ? selectedCollection.albums.filter((album) => {
        const artistMatches =
          !artistFilter || album.artistNames.some((artistName) => artistName.toLowerCase().includes(artistFilter));
        const genreMatches =
          !genreFilter ||
          album.artistNames.some((albumArtistName) =>
            selectedCollection.artists.some(
              (collectionArtist) =>
                collectionArtist.name.toLowerCase() === albumArtistName.toLowerCase() &&
                collectionArtist.genres.some((genre) => genre.toLowerCase() === genreFilter)
            )
          );
        return artistMatches && genreMatches;
      })
    : [];

  useEffect(() => {
    if (!selectedAlbum) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        navigate(buildHref({ selectedAlbumId: null }));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, selectedAlbum, location.search]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <section className="card sidebar-card">
          <h2>Filters</h2>
          <Form method="get" className="filter-form">
            <input type="hidden" name="tab" value={filters.tab} />
            <input type="hidden" name="artistsPage" value="1" />
            <input type="hidden" name="albumsPage" value="1" />
            <input type="hidden" name="playlistsPage" value="1" />
            {filters.selectedCollectionId ? (
              <input type="hidden" name="collection" value={String(filters.selectedCollectionId)} />
            ) : null}
            <label>
              Genre
              <select name="genre" defaultValue={filters.genre}>
                <option value="">All genres</option>
                {libraryData.genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Artist name
              <input type="text" name="artist" defaultValue={filters.artist} placeholder="Filter library by artist" />
            </label>
            <button className="button" type="submit">
              Apply
            </button>
          </Form>
        </section>

        <section className="card sidebar-card">
          <h2>Create Collection</h2>
          <Form method="post" className="filter-form">
            <input type="hidden" name="intent" value="create_collection" />
            <label>
              Name
              <input type="text" name="name" required />
            </label>
            <label>
              Description
              <input type="text" name="description" />
            </label>
            <button className="button" type="submit">
              Create
            </button>
            {actionData && "error" in actionData ? <p className="form-error">{actionData.error}</p> : null}
          </Form>
        </section>
      </aside>

      <section className="card album-panel">
        <nav className="tab-nav" aria-label="Library sections">
          <a className={`tab-link${filters.tab === "albums" ? " active" : ""}`} href={buildHref({ tab: "albums" })}>
            Albums
          </a>
          <a className={`tab-link${filters.tab === "artists" ? " active" : ""}`} href={buildHref({ tab: "artists" })}>
            Artists
          </a>
          <a className={`tab-link${filters.tab === "playlists" ? " active" : ""}`} href={buildHref({ tab: "playlists" })}>
            Playlists
          </a>
          <a
            className={`tab-link${filters.tab === "collections" ? " active" : ""}`}
            href={buildHref({ tab: "collections", selectedCollectionId: selectedCollection?.id ?? null })}
          >
            Collections
          </a>
        </nav>

        {filters.tab === "albums" ? (
          <>
            <div className="album-panel-header">
              <h2>Saved Albums</h2>
              <p className="muted">{libraryData.pagination.albums.totalItems} total</p>
            </div>

            <ul className="album-grid">
              {libraryData.albums.map((album) => (
                <li key={album.id} className="album-tile">
                  <a className="album-art-wrap" href={buildHref({ selectedAlbumId: album.id })}>
                    {album.imageUrl ? (
                      <img className="album-art" src={album.imageUrl} alt={`${album.name} cover`} loading="lazy" />
                    ) : (
                      <div className="album-art-placeholder">No Art</div>
                    )}
                  </a>
                  <div className="album-meta">
                    <a className="album-title-link" href={buildHref({ selectedAlbumId: album.id })}>
                      <strong>{album.name}</strong>
                    </a>
                    <p>{album.artistNames.join(", ") || "Unknown artist"}</p>
                  </div>
                  {safeCollections.length > 0 ? (
                    <Form method="post" className="album-collection-form">
                      <input type="hidden" name="intent" value="add_album_to_collection" />
                      <input type="hidden" name="albumId" value={album.id} />
                      <select name="collectionId" required>
                        {safeCollections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="button secondary compact">
                        Add
                      </button>
                    </Form>
                  ) : null}
                </li>
              ))}
            </ul>

            {renderPagination("albums", libraryData.pagination.albums.page, libraryData.pagination.albums.totalPages)}
          </>
        ) : null}

        {filters.tab === "artists" ? (
          <>
            <div className="album-panel-header">
              <h2>Artists</h2>
              <p className="muted">{libraryData.pagination.artists.totalItems} total</p>
            </div>
            <ul className="entity-list">
              {libraryData.artists.map((artist) => (
                <li key={artist.id} className="entity-item">
                  <strong>{artist.name}</strong>
                  <p>{artist.genres.join(", ") || "No genres"}</p>
                </li>
              ))}
            </ul>
            {renderPagination("artists", libraryData.pagination.artists.page, libraryData.pagination.artists.totalPages)}
          </>
        ) : null}

        {filters.tab === "playlists" ? (
          <>
            <div className="album-panel-header">
              <h2>Playlists</h2>
              <p className="muted">{libraryData.pagination.playlists.totalItems} total</p>
            </div>
            <ul className="entity-list">
              {libraryData.playlists.map((playlist) => (
                <li key={playlist.id} className="entity-item">
                  <strong>{playlist.name}</strong>
                  <p>{playlist.tracksTotal} tracks</p>
                </li>
              ))}
            </ul>
            {renderPagination("playlists", libraryData.pagination.playlists.page, libraryData.pagination.playlists.totalPages)}
          </>
        ) : null}

        {filters.tab === "collections" ? (
          <>
            <div className="album-panel-header">
              <h2>Collections</h2>
              <p className="muted">{safeCollections.length} total</p>
            </div>
            {safeCollections.length === 0 ? (
              <p className="muted">Create a collection from the sidebar to get started.</p>
            ) : (
              <>
                <div className="collection-picker">
                  {safeCollections.map((collection) => (
                    <a
                      key={collection.id}
                      className={`collection-pill${selectedCollection?.id === collection.id ? " active" : ""}`}
                      href={buildHref({ tab: "collections", selectedCollectionId: collection.id })}
                    >
                      {collection.name}
                    </a>
                  ))}
                </div>

                {selectedCollection ? (
                  <div className="collection-content">
                    <h3>{selectedCollection.name}</h3>
                    <p className="muted">{selectedCollection.description || "No description"}</p>

                    <h4>Albums</h4>
                    {selectedCollectionAlbums.length > 0 ? (
                      <ul className="collection-grid">
                        {selectedCollectionAlbums.map((album) => (
                          <li key={album.id} className="collection-grid-item">
                            <div className="album-art-wrap">
                              {album.imageUrl ? (
                                <img className="album-art" src={album.imageUrl} alt={`${album.name} cover`} loading="lazy" />
                              ) : (
                                <div className="album-art-placeholder">Album</div>
                              )}
                            </div>
                            <strong>{album.name}</strong>
                            <p className="muted">{album.artistNames.join(", ") || "Unknown artist"}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No albums in this collection match the active filters.</p>
                    )}

                    <h4>Artists</h4>
                    {selectedCollectionArtists.length > 0 ? (
                      <ul className="entity-list">
                        {selectedCollectionArtists.map((artist) => (
                          <li key={artist.id} className="entity-item">
                            <strong>{artist.name}</strong>
                            <p>{artist.genres.join(", ") || "No genres"}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No artists in this collection match the active filters.</p>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </section>

      {selectedAlbum ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              navigate(buildHref({ selectedAlbumId: null }));
            }
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Album details">
            <div className="modal-header">
              <h3>{selectedAlbum.name}</h3>
              <a className="button secondary compact" href={buildHref({ selectedAlbumId: null })}>
                Close
              </a>
            </div>
            <p className="muted">Artists: {selectedAlbum.artistNames.join(", ") || "Unknown artist"}</p>
            <p className="muted">Release date: {selectedAlbum.releaseDate || "Unknown"}</p>
            <h4>In Collections</h4>
            {selectedAlbumCollections.length > 0 ? (
              <ul className="detail-list">
                {selectedAlbumCollections.map((collection) => (
                  <li key={collection.id}>{collection.name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Not in any collection yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
