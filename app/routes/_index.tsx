import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, useLoaderData, useNavigation } from "react-router";
import {
  addAlbumToCollection,
  addArtistToCollection,
  createCollection,
  getCollections,
  getLibraryData,
  syncSpotifyData
} from "~/utils/library.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyFollowedArtists,
  fetchSpotifyPlaylists,
  fetchSpotifySavedAlbums
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

const PAGE_SIZE = 20;

function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
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
      data: null,
      collections: [],
      filters: { genre: "", artist: "" }
    };
  }

  const url = new URL(request.url);
  const genre = (url.searchParams.get("genre") ?? "").trim();
  const artist = (url.searchParams.get("artist") ?? "").trim();
  const artistsPage = parsePage(url.searchParams.get("artistsPage"));
  const albumsPage = parsePage(url.searchParams.get("albumsPage"));
  const playlistsPage = parsePage(url.searchParams.get("playlistsPage"));

  const [data, collections] = await Promise.all([
    getLibraryData(
      userId,
      { genre: genre || undefined, artist: artist || undefined },
      { artistsPage, albumsPage, playlistsPage, pageSize: PAGE_SIZE }
    ),
    getCollections(userId)
  ]);

  return {
    connected: true,
    data,
    collections,
    filters: { genre, artist, artistsPage, albumsPage, playlistsPage }
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    const user = await getUserById(userId);
    if (!user) {
      return redirect("/");
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

    await createCollection({ userId, name, description });
    return redirect("/");
  }

  if (intent === "add_artist_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const artistId = Number(formData.get("artistId"));

    if (collectionId > 0 && artistId > 0) {
      await addArtistToCollection({ collectionId, artistId, userId });
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
  const { connected, data, collections, filters } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (!connected || !data) {
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

  const pageData = data;
  const safeCollections = collections.filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));

  function buildPageHref(list: "artists" | "albums" | "playlists", page: number) {
    const params = new URLSearchParams();

    if (filters.genre) {
      params.set("genre", filters.genre);
    }
    if (filters.artist) {
      params.set("artist", filters.artist);
    }

    params.set("artistsPage", String(list === "artists" ? page : pageData.pagination.artists.page));
    params.set("albumsPage", String(list === "albums" ? page : pageData.pagination.albums.page));
    params.set("playlistsPage", String(list === "playlists" ? page : pageData.pagination.playlists.page));

    return `/?${params.toString()}`;
  }

  function renderPagination(list: "artists" | "albums" | "playlists", currentPage: number, totalPages: number) {
    const pageItems = getPageItems(currentPage, totalPages);

    return (
      <div className="pagination">
        <a
          className="button secondary"
          aria-disabled={currentPage <= 1}
          href={buildPageHref(list, Math.max(1, currentPage - 1))}
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
                href={buildPageHref(list, item)}
              >
                {item}
              </a>
            )
          )}
        </div>
        <a
          className="button secondary"
          aria-disabled={currentPage >= totalPages}
          href={buildPageHref(list, Math.min(totalPages, currentPage + 1))}
        >
          Next
        </a>
      </div>
    );
  }

  return (
    <div className="layout">
      <section className="card">
        <h2>Sync</h2>
        <p>Pull the latest artists, albums, and playlists from Spotify into your local database.</p>
        <Form method="post">
          <input type="hidden" name="intent" value="sync" />
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Syncing..." : "Sync Library"}
          </button>
        </Form>
        <Form method="post" action="/logout">
          <button type="submit" className="button secondary">
            Log out
          </button>
        </Form>
      </section>

      <section className="card">
        <h2>Filters</h2>
        <Form method="get" className="filter-form">
          <label>
            Genre
            <select name="genre" defaultValue={filters.genre}>
              <option value="">All genres</option>
              {data?.genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Artist name
            <input type="text" name="artist" defaultValue={filters.artist} placeholder="Filter artists and albums" />
          </label>
          <button className="button" type="submit">
            Apply
          </button>
        </Form>
      </section>

      <section className="card">
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
        </Form>
      </section>

      <section className="card wide">
        <h2>Artists ({data.pagination.artists.totalItems})</h2>
        <ul className="grid-list">
          {data?.artists.map((artist) => (
            <li key={artist.id} className="list-item">
              <div>
                <strong>{artist.name}</strong>
                <p>{artist.genres.join(", ") || "No genres"}</p>
              </div>
              {safeCollections.length > 0 ? (
                <Form method="post" className="inline-form">
                  <input type="hidden" name="intent" value="add_artist_to_collection" />
                  <input type="hidden" name="artistId" value={artist.id} />
                  <select name="collectionId" required>
                    {safeCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button secondary">
                    Add to collection
                  </button>
                </Form>
              ) : null}
            </li>
          ))}
        </ul>
        {renderPagination("artists", data.pagination.artists.page, data.pagination.artists.totalPages)}
      </section>

      <section className="card wide">
        <h2>Albums ({data.pagination.albums.totalItems})</h2>
        <ul className="grid-list">
          {data?.albums.map((album) => (
            <li key={album.id} className="list-item">
              <div>
                <strong>{album.name}</strong>
                <p>{album.artistNames.join(", ") || "Unknown artist"}</p>
              </div>
              {safeCollections.length > 0 ? (
                <Form method="post" className="inline-form">
                  <input type="hidden" name="intent" value="add_album_to_collection" />
                  <input type="hidden" name="albumId" value={album.id} />
                  <select name="collectionId" required>
                    {safeCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button secondary">
                    Add to collection
                  </button>
                </Form>
              ) : null}
            </li>
          ))}
        </ul>
        {renderPagination("albums", data.pagination.albums.page, data.pagination.albums.totalPages)}
      </section>

      <section className="card wide">
        <h2>Playlists ({data.pagination.playlists.totalItems})</h2>
        <ul className="grid-list">
          {data?.playlists.map((playlist) => (
            <li key={playlist.id} className="list-item">
              <div>
                <strong>{playlist.name}</strong>
                <p>{playlist.tracksTotal} tracks</p>
              </div>
            </li>
          ))}
        </ul>
        {renderPagination("playlists", data.pagination.playlists.page, data.pagination.playlists.totalPages)}
      </section>

      <section className="card wide">
        <h2>Collections ({safeCollections.length})</h2>
        <ul className="grid-list">
          {safeCollections.map((collection) => (
            <li key={collection.id} className="list-item">
              <div>
                <strong>{collection.name}</strong>
                <p>{collection.description || "No description"}</p>
                <p>Artists: {collection.artists.map((artist) => artist.name).join(", ") || "None"}</p>
                <p>Albums: {collection.albums.map((album) => album.name).join(", ") || "None"}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
