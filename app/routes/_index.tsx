import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, Link, useActionData, useFetchers, useLoaderData, useLocation, useNavigate, useNavigation } from "react-router";
import { AnimatePresence } from "framer-motion";
import {
  Box,
  Grid,
  Heading,
  Text,
  Button,
  HStack,
  Link as ChakraLink,
  Stack,
  Spinner
} from "@chakra-ui/react";
import Sidebar from "~/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import type { Album, SpotifySearchAlbum } from "~/types";
import {
  addAlbumToCollection,
  addArtistToCollection,
  addSpotifySearchAlbumToCollection,
  createCollection,
  deleteCollection,
  getCollectionNamesForAlbum,
  getCollectionsForView,
  getLibraryData,
  removeAlbumFromCollection,
  removeArtistFromCollection,
  syncSpotifyData,
  updateCollection
} from "~/utils/library.server";
import { getAuthSession, getUserId, requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyFollowedArtists,
  fetchSpotifyPlaylists,
  fetchSpotifySavedAlbums
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";
import SpotifySearchSection from "~/components/SpotifySearchSection";
import AddToCollectionDialog from "~/components/AddToCollectionDialog";
import AlbumsTab from "~/components/home/AlbumsTab";
import ArtistsTab from "~/components/home/ArtistsTab";
import PlaylistsTab from "~/components/home/PlaylistsTab";
import CollectionsTab from "~/components/home/CollectionsTab";
import { AnimatedView } from "~/components/Animated";
import { buildHomeHref, getSelectedCollection, parseId, parsePage, parseTab, type TabKey } from "./index-helpers";
import { getOptionalDescription, getPositiveNumber, getRedirectTo, getRequiredName } from "./index-action-helpers";

const PAGE_SIZE = 20;
const HOME_LOADER_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, label: string, ms = HOME_LOADER_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthSession(request);
  const userId = auth.userId;

  if (!auth.auth0Sub) {
    return {
      authenticated: false,
      connected: false,
      libraryData: null,
      collections: [],
      filters: {
        genre: "",
        artist: "",
        tab: "collections" as TabKey,
        artistsPage: 1,
        albumsPage: 1,
        playlistsPage: 1,
        selectedAlbumId: null as number | null,
        selectedCollectionId: null as number | null,
        search: ""
      },
      selectedAlbumCollections: []
    };
  }

  if (!userId) {
    return {
      authenticated: true,
      connected: false,
      libraryData: null,
      collections: [],
      filters: {
        genre: "",
        artist: "",
        tab: "collections" as TabKey,
        artistsPage: 1,
        albumsPage: 1,
        playlistsPage: 1,
        selectedAlbumId: null as number | null,
        selectedCollectionId: null as number | null,
        search: ""
      },
      selectedAlbumCollections: []
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
  const search = (url.searchParams.get("search") ?? "").trim();

  const [libraryData, collections, selectedAlbumCollections] = await Promise.all([
    withTimeout(
      getLibraryData(
        userId,
        { genre: genre || undefined, artist: artist || undefined },
        { artistsPage, albumsPage, playlistsPage, pageSize: PAGE_SIZE }
      ),
      "Home library query"
    ),
    withTimeout(getCollectionsForView(userId, selectedCollectionId), "Collections query"),
    selectedAlbumId
      ? withTimeout(getCollectionNamesForAlbum(userId, selectedAlbumId), "Selected album collections query")
      : Promise.resolve([])
  ]);

  return {
    authenticated: true,
    connected: true,
    libraryData,
    collections,
    selectedAlbumCollections,
    filters: { genre, artist, tab, artistsPage, albumsPage, playlistsPage, selectedAlbumId, selectedCollectionId, search }
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
    return data({ ok: true, toast: { type: "success", title: "Library synced" } });
  }

  if (intent === "create_collection") {
    const name = getRequiredName(formData);
    const description = getOptionalDescription(formData);

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
    return data({ ok: true, toast: { type: "success", title: "Collection created" } });
  }

  if (intent === "update_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const name = getRequiredName(formData);
    const description = getOptionalDescription(formData);
    const redirectTo = getRedirectTo(formData);

    if (!name) {
      return data({ error: "Collection name is required" }, { status: 400 });
    }

    try {
      if (collectionId) {
        await updateCollection({ userId, collectionId, name, description });
      }
    } catch (error: any) {
      if (error?.code === "23505") {
        return data({ error: "Collection title already exists." }, { status: 409 });
      }
      throw error;
    }

    return data({ ok: true, toast: { type: "success", title: "Collection updated" } });
  }

  if (intent === "delete_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId) {
      await deleteCollection({ userId, collectionId });
    }

    return data({ ok: true, toast: { type: "success", title: "Collection deleted" } });
  }

  if (intent === "add_album_to_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const albumId = getPositiveNumber(formData, "albumId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && albumId) {
      await addAlbumToCollection({ collectionId, albumId, userId });
    }

    return data({ ok: true, toast: { type: "success", title: "Album added to collection" } });
  }

  if (intent === "add_artist_to_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const artistId = getPositiveNumber(formData, "artistId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && artistId) {
      await addArtistToCollection({ collectionId, artistId, userId });
    }

    return data({ ok: true, toast: { type: "success", title: "Artist added to collection" } });
  }

  if (intent === "add_search_album_to_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const redirectTo = getRedirectTo(formData);
    const rawArtistNames = String(formData.get("artistNames") ?? "[]");

    if (collectionId) {
      await addSpotifySearchAlbumToCollection({
        userId,
        collectionId,
        album: {
          spotifyId: String(formData.get("spotifyId") ?? ""),
          name: String(formData.get("name") ?? ""),
          albumType: String(formData.get("albumType") ?? "") || null,
          releaseDate: String(formData.get("releaseDate") ?? "") || null,
          artistNames: JSON.parse(rawArtistNames) as string[],
          imageUrl: String(formData.get("imageUrl") ?? "") || null
        }
      });
    }

    return data({ ok: true, toast: { type: "success", title: "Album added to collection" } });
  }

  if (intent === "remove_album_from_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const albumId = getPositiveNumber(formData, "albumId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && albumId) {
      await removeAlbumFromCollection({ collectionId, albumId, userId });
    }

    return data({ ok: true, toast: { type: "success", title: "Album removed from collection" } });
  }

  if (intent === "remove_artist_from_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const artistId = getPositiveNumber(formData, "artistId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && artistId) {
      await removeArtistFromCollection({ collectionId, artistId, userId });
    }

    return data({ ok: true, toast: { type: "success", title: "Artist removed from collection" } });
  }

  return redirect("/");
}

export default function Index() {
  const { authenticated, connected, libraryData, collections, filters, selectedAlbumCollections } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetchers = useFetchers();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const [addTarget, setAddTarget] = useState<
    | { kind: "album"; album: Album }
    | { kind: "artist"; artistId: number; artistName: string }
    | { kind: "spotifySearchAlbum"; album: SpotifySearchAlbum }
    | null
  >(null);
  const [clientToast, setClientToast] = useState<{ type: "success" | "error"; title: string; description?: string } | null>(null);
  const [lastToastKey, setLastToastKey] = useState("");

  if (!authenticated) {
    return (
      <Box p={6} borderRadius="2xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="md" textAlign="center">
        <Heading as="h2" size="lg" mb={2}>Log in to continue</Heading>
        <Text mb={4} color="app.muted">Use Auth0 to sign in to the app, then connect Spotify to sync and organize your library.</Text>
        <ChakraLink asChild>
          <Link to="/auth/login" prefetch="intent" viewTransition>
            <Button colorScheme="green">Log In</Button>
          </Link>
        </ChakraLink>
      </Box>
    );
  }

  if (!connected || !libraryData) {
    return (
      <Box p={6} borderRadius="2xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="md" textAlign="center">
        <Heading as="h2" size="lg" mb={2}>Connect your Spotify account</Heading>
        <Text mb={4} color="app.muted">Your Auth0 login is active. Connect Spotify to import your library, playlists, and organize custom collections.</Text>
        <ChakraLink asChild>
          <Link to="/auth/spotify" prefetch="intent" viewTransition>
            <Button colorScheme="green">Connect Spotify</Button>
          </Link>
        </ChakraLink>
      </Box>
    );
  }

  const pageData = libraryData;
  const safeCollections = collections.filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));
  const pendingIntent = navigation.formData?.get("intent");
  const pendingAlbumId = Number(navigation.formData?.get("albumId"));
  const pendingArtistId = Number(navigation.formData?.get("artistId"));
  const pendingSpotifyId = String(navigation.formData?.get("spotifyId") ?? "");
  const isFiltering = navigation.state !== "idle" && navigation.formMethod?.toUpperCase() === "GET";
  const isCreatingCollection = navigation.state === "submitting" && pendingIntent === "create_collection";
  const isSavingCollection = navigation.state === "submitting" && pendingIntent === "update_collection";
  const isDeletingCollection = navigation.state === "submitting" && pendingIntent === "delete_collection";
  const isLoadingData = navigation.state === "loading";

  function buildHref(overrides?: {
    genre?: string;
    artist?: string;
    tab?: TabKey;
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
  }) {
    return buildHomeHref(filters, pageData.pagination, overrides);
  }

  const selectedAlbum = libraryData.albums.find((album: Album) => album.id === filters.selectedAlbumId) ?? null;
  const selectedAlbumCollectionLinks = selectedAlbum ? selectedAlbumCollections : [];
  const selectedCollection = getSelectedCollection(safeCollections, filters.selectedCollectionId);
  const selectedCollectionArtists = selectedCollection?.artists ?? [];
  const selectedCollectionAlbums = selectedCollection?.albums ?? [];
  const currentHref = useMemo(() => buildHref(), [location.search]);
  const hasActiveFilters = Boolean(filters.genre || filters.artist);
  const clearFiltersHref = useMemo(
    () =>
      buildHref({
        genre: "",
        artist: "",
        artistsPage: 1,
        albumsPage: 1,
        playlistsPage: 1,
        selectedAlbumId: null,
      }),
    [location.search]
  );
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

  useEffect(() => {
    if (navigation.state === "idle") {
      setAddTarget(null);
    }
  }, [navigation.state]);

  useEffect(() => {
    for (const fetcher of fetchers) {
      const toast = fetcher.data?.toast as { type: "success" | "error"; title: string; description?: string } | undefined;
      if (!toast) {
        continue;
      }

      const key = `${toast.type}:${toast.title}:${toast.description ?? ""}`;
      if (key !== lastToastKey) {
        setClientToast(toast);
        setLastToastKey(key);
      }
    }
  }, [fetchers, lastToastKey]);

  useEffect(() => {
    if (!clientToast) {
      return;
    }

    const timeout = window.setTimeout(() => setClientToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [clientToast]);

  return (
    <Grid templateColumns={{ base: "1fr", lg: "320px minmax(0, 1fr)" }} gap={0} minH={{ base: "auto", lg: "calc(100vh - 84px)" }}>
      <Box
        as="aside"
        order={{ base: 2, lg: 1 }}
        borderRightWidth={{ base: "0", lg: "1px" }}
        borderColor="app.border"
        bg="app.panelSolid"
        overflowY={{ base: "visible", lg: "auto" }}
        maxH={{ base: "none", lg: "calc(100vh - 84px)" }}
      >
        <Sidebar
          filters={filters}
          genres={libraryData.genres}
          selectedCollectionId={filters.selectedCollectionId}
          actionError={actionData && "error" in actionData ? actionData.error : null}
          isFiltering={isFiltering}
          isCreatingCollection={isCreatingCollection}
          isSavingCollection={isSavingCollection}
          isDeletingCollection={isDeletingCollection}
          collections={safeCollections}
          selectedCollection={selectedCollection}
          buildHref={buildHref}
          onAddSpotifyAlbum={(album) => setAddTarget({ kind: "spotifySearchAlbum", album })}
        />
      </Box>

      <Box as="main" order={{ base: 1, lg: 2 }} minW={0} px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
        {clientToast ? (
          <Box
            position="fixed"
            top={{ base: 16, md: 4 }}
            left="50%"
            transform="translateX(-50%)"
            zIndex={1001}
            bg="app.panelSolid"
            borderWidth="1px"
            borderColor={clientToast.type === "success" ? "app.success" : "app.danger"}
            borderRadius="xl"
            boxShadow="lg"
            px={4}
            py={3}
            minW={{ base: "calc(100vw - 2rem)", md: "320px" }}
            maxW={{ base: "calc(100vw - 2rem)", md: "420px" }}
          >
            <Text fontWeight="semibold" color={clientToast.type === "success" ? "app.success" : "app.danger"}>
              {clientToast.title}
            </Text>
            {clientToast.description ? <Text fontSize="sm" color="app.muted" mt={1}>{clientToast.description}</Text> : null}
          </Box>
        ) : null}
        {isLoadingData ? (
          <Box
            position="fixed"
            inset={0}
            bg="app.overlay"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex={40}
            pointerEvents="none"
          >
            <Spinner size="xl" color="teal.500" />
          </Box>
        ) : null}
        <Box mt={0}>
          {/* keep the existing tab content markup for now, wrapped in a Box */}
          {/* legacy tab-nav removed; top tab HStack already provides tabs */}

          {actionData && "error" in actionData && actionData.error ? (
            <Box mb={{ base: 5, md: 6 }} borderRadius="xl" bg="app.panel" borderWidth="1px" borderColor="app.danger" px={{ base: 4, md: 5 }} py={{ base: 4, md: 4 }}>
              <Heading as="h2" size="sm" color="app.danger" mb={1}>Action failed</Heading>
              <Text color="app.danger">{actionData.error}</Text>
            </Box>
          ) : null}

          {filters.tab !== "collections" ? (
            <SpotifySearchSection
              initialSearch={filters.search}
              onAdd={(album) => setAddTarget({ kind: "spotifySearchAlbum", album })}
            />
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            {filters.tab === "albums" ? (
              <AnimatedView motionKey="albums">
                <AlbumsTab
                  albums={libraryData.albums}
                  totalItems={libraryData.pagination.albums.totalItems}
                  page={libraryData.pagination.albums.page}
                  totalPages={libraryData.pagination.albums.totalPages}
                  buildHref={buildHref}
                  collections={safeCollections}
                  onAddToCollection={(targetAlbum) => setAddTarget({ kind: "album", album: targetAlbum })}
                  hasActiveFilters={hasActiveFilters}
                  clearFiltersHref={clearFiltersHref}
                />
              </AnimatedView>
            ) : null}

            {filters.tab === "artists" ? (
              <AnimatedView motionKey="artists">
                <ArtistsTab
                  artists={libraryData.artists}
                  totalItems={libraryData.pagination.artists.totalItems}
                  page={libraryData.pagination.artists.page}
                  totalPages={libraryData.pagination.artists.totalPages}
                  buildHref={buildHref}
                  collections={safeCollections}
                  onAddToCollection={(artist) => setAddTarget({ kind: "artist", artistId: artist.id, artistName: artist.name })}
                  hasActiveFilters={hasActiveFilters}
                  clearFiltersHref={clearFiltersHref}
                />
              </AnimatedView>
            ) : null}

            {filters.tab === "playlists" ? (
              <AnimatedView motionKey="playlists">
                <PlaylistsTab
                  playlists={libraryData.playlists}
                  totalItems={libraryData.pagination.playlists.totalItems}
                  page={libraryData.pagination.playlists.page}
                  totalPages={libraryData.pagination.playlists.totalPages}
                  buildHref={buildHref}
                  hasPlaylists={libraryData.playlists.length > 0}
                />
              </AnimatedView>
            ) : null}

            {filters.tab === "collections" ? (
              <AnimatedView motionKey="collections">
                <CollectionsTab
                  collections={safeCollections}
                  selectedCollection={selectedCollection}
                  selectedCollectionAlbums={selectedCollectionAlbums}
                  selectedCollectionArtists={selectedCollectionArtists}
                  buildHref={buildHref}
                  pendingAlbumId={pendingAlbumId}
                  pendingArtistId={pendingArtistId}
                  pendingIntent={pendingIntent}
                />
              </AnimatedView>
            ) : null}
          </AnimatePresence>
        </Box>

        {selectedAlbum ? (
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            display="flex"
            alignItems="center"
            justifyContent="center"
            onClick={(event: any) => {
              if (event.target === event.currentTarget) {
                navigate(buildHref({ selectedAlbumId: null }));
              }
            }}
            zIndex={50}
          >
            <Box bg="app.panelSolid" borderWidth="1px" borderColor="app.border" borderRadius="2xl" maxW="xl" width="full" p={{ base: 4, md: 6 }} boxShadow="lg" mx={4}>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={3}>
                <Heading as="h3" size="md">{selectedAlbum.name}</Heading>
                <ChakraLink asChild>
                  <Link prefetch="intent" to={buildHref({ selectedAlbumId: null })} replace viewTransition>
                  <Button size="sm" variant="outline">Close</Button>
                  </Link>
                </ChakraLink>
              </HStack>

              <Text mb={2}>Artists: {selectedAlbum.artistNames.join(", ") || "Unknown artist"}</Text>
              <Text mb={2}>Release date: {selectedAlbum.releaseDate || "Unknown"}</Text>
              <Stack gap={2} mb={3} direction={{ base: "column", sm: "row" }}>
                <ChakraLink href={`spotify:album:${selectedAlbum.spotifyId}`}>
                  <Button size="sm">Open in Spotify App</Button>
                </ChakraLink>
              </Stack>
              <Heading as="h4" size="sm" mt={3} mb={2}>In Collections</Heading>
              {selectedAlbumCollectionLinks.length > 0 ? (
                <Stack gap={1}>
                  {selectedAlbumCollectionLinks.map((collection) => (
                    <Text key={collection.id}>{collection.name}</Text>
                  ))}
                </Stack>
              ) : (
                <Text color="app.muted">Not in any collection yet.</Text>
              )}
            </Box>
          </Box>
        ) : null}

        <AddToCollectionDialog
          open={Boolean(addTarget)}
          onClose={() => setAddTarget(null)}
          collections={safeCollections}
          target={addTarget}
          redirectTo={currentHref}
          defaultCollectionId={selectedCollection?.id ?? null}
        />
      </Box>
    </Grid>
  );
}
