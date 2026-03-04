import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, useActionData, useLoaderData, useLocation, useNavigate, useNavigation } from "react-router";
import {
  Box,
  Grid,
  Heading,
  Text,
  Button,
  HStack,
  SimpleGrid,
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
  getCollections,
  getLibraryData,
  removeAlbumFromCollection,
  removeArtistFromCollection,
  syncSpotifyData,
  updateCollection
} from "~/utils/library.server";
import { getUserId, redirectWithToast, requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyFollowedArtists,
  fetchSpotifyPlaylists,
  fetchSpotifySavedAlbums,
  searchSpotifyAlbums
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";
import SpotifySearchSection from "~/components/SpotifySearchSection";
import AddToCollectionDialog from "~/components/AddToCollectionDialog";
import AlbumsTab from "~/components/home/AlbumsTab";
import ArtistsTab from "~/components/home/ArtistsTab";
import PlaylistsTab from "~/components/home/PlaylistsTab";
import CollectionsTab from "~/components/home/CollectionsTab";
import { buildHomeHref, getSelectedCollection, parseId, parsePage, parseTab, type TabKey } from "./index-helpers";
import { getOptionalDescription, getPositiveNumber, getRedirectTo, getRequiredName } from "./index-action-helpers";

const PAGE_SIZE = 20;

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
        selectedCollectionId: null as number | null,
        search: ""
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
  const search = (url.searchParams.get("search") ?? "").trim();

  const user = await getUserById(userId);
  const accessToken = user ? await ensureValidAccessToken(user) : null;

  const [libraryData, collections, searchResults] = await Promise.all([
    getLibraryData(
      userId,
      { genre: genre || undefined, artist: artist || undefined },
      { artistsPage, albumsPage, playlistsPage, pageSize: PAGE_SIZE }
    ),
    getCollections(userId),
    accessToken && search ? searchSpotifyAlbums(accessToken, search) : Promise.resolve([])
  ]);

  return {
    connected: true,
    libraryData,
    collections,
    searchResults,
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
    return redirectWithToast(request, "/", { type: "success", title: "Library synced" });
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
    return redirectWithToast(request, "/", { type: "success", title: "Collection created" });
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

    return redirectWithToast(request, redirectTo, { type: "success", title: "Collection updated" });
  }

  if (intent === "delete_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId) {
      await deleteCollection({ userId, collectionId });
    }

    return redirectWithToast(request, redirectTo, { type: "success", title: "Collection deleted" });
  }

  if (intent === "add_album_to_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const albumId = getPositiveNumber(formData, "albumId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && albumId) {
      await addAlbumToCollection({ collectionId, albumId, userId });
    }

    return redirectWithToast(request, redirectTo, { type: "success", title: "Album added to collection" });
  }

  if (intent === "add_artist_to_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const artistId = getPositiveNumber(formData, "artistId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && artistId) {
      await addArtistToCollection({ collectionId, artistId, userId });
    }

    return redirectWithToast(request, redirectTo, { type: "success", title: "Artist added to collection" });
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

    return redirectWithToast(request, redirectTo, { type: "success", title: "Album added to collection" });
  }

  if (intent === "remove_album_from_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const albumId = getPositiveNumber(formData, "albumId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && albumId) {
      await removeAlbumFromCollection({ collectionId, albumId, userId });
    }

    return redirectWithToast(request, redirectTo, { type: "success", title: "Album removed from collection" });
  }

  if (intent === "remove_artist_from_collection") {
    const collectionId = getPositiveNumber(formData, "collectionId");
    const artistId = getPositiveNumber(formData, "artistId");
    const redirectTo = getRedirectTo(formData);

    if (collectionId && artistId) {
      await removeArtistFromCollection({ collectionId, artistId, userId });
    }

    return redirectWithToast(request, redirectTo, { type: "success", title: "Artist removed from collection" });
  }

  return redirect("/");
}

export default function Index() {
  const { connected, libraryData, collections, filters, searchResults } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const [addTarget, setAddTarget] = useState<
    | { kind: "album"; album: Album }
    | { kind: "artist"; artistId: number; artistName: string }
    | { kind: "spotifySearchAlbum"; album: SpotifySearchAlbum }
    | null
  >(null);

  if (!connected || !libraryData) {
    return (
      <Box p={6} borderRadius="md" bg="white" boxShadow="sm" textAlign="center">
        <Heading as="h2" size="lg" mb={2}>Connect your Spotify account</Heading>
        <Text mb={4}>Sign in with Spotify to import your library, playlists, and organize custom collections.</Text>
        <ChakraLink href="/auth/spotify">
          <Button colorScheme="green">Connect Spotify</Button>
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
  const selectedAlbumCollections = selectedAlbum
    ? safeCollections.filter((collection) => collection.albums.some((album) => album.id === selectedAlbum.id))
    : [];
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
  const clearSearchHref = useMemo(
    () =>
      buildHref({
        search: "",
        selectedAlbumId: null,
      }),
    [location.search]
  );
  const searchHiddenFields = useMemo(() => {
    const fields: Record<string, string> = {
      tab: filters.tab,
      artistsPage: String(filters.artistsPage),
      albumsPage: String(filters.albumsPage),
      playlistsPage: String(filters.playlistsPage),
    };

    if (filters.genre) {
      fields.genre = filters.genre;
    }
    if (filters.artist) {
      fields.artist = filters.artist;
    }
    if (filters.selectedCollectionId) {
      fields.collection = String(filters.selectedCollectionId);
    }

    return fields;
  }, [filters]);

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

  return (
    <Grid templateColumns={{ base: "1fr", lg: "300px minmax(0, 1fr)" }} gap={{ base: 4, md: 6 }}>
      <Box as="aside" order={{ base: 2, lg: 1 }}>
        <Sidebar
          filters={filters}
          genres={libraryData.genres}
          selectedCollectionId={filters.selectedCollectionId}
          actionError={actionData && "error" in actionData ? actionData.error : null}
          isFiltering={isFiltering}
          isCreatingCollection={isCreatingCollection}
        />
      </Box>

      <Box as="main" order={{ base: 1, lg: 2 }} minW={0}>
        {isLoadingData ? (
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.200"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex={40}
            pointerEvents="none"
          >
            <Spinner size="xl" color="teal.500" />
          </Box>
        ) : null}
        <Box p={{ base: 4, md: 4 }} borderRadius="xl" bg="white" boxShadow="sm">
          <SimpleGrid as="nav" columns={{ base: 2, md: 4 }} gap={3}>
            <ChakraLink href={buildHref({ tab: "albums" })}>
              <Button variant={filters.tab === "albums" ? "solid" : "ghost"} w={{ base: "full", sm: "auto" }}>Albums</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "artists" })}>
              <Button variant={filters.tab === "artists" ? "solid" : "ghost"} w={{ base: "full", sm: "auto" }}>Artists</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "playlists" })}>
              <Button variant={filters.tab === "playlists" ? "solid" : "ghost"} w={{ base: "full", sm: "auto" }}>Playlists</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "collections", selectedCollectionId: selectedCollection?.id ?? null })}>
              <Button variant={filters.tab === "collections" ? "solid" : "ghost"} w={{ base: "full", sm: "auto" }}>Collections</Button>
            </ChakraLink>
          </SimpleGrid>
        </Box>

        <Box mt={{ base: 5, md: 4 }}>
          {/* keep the existing tab content markup for now, wrapped in a Box */}
          {/* legacy tab-nav removed; top tab HStack already provides tabs */}

          {actionData && "error" in actionData && actionData.error ? (
            <Box mb={{ base: 5, md: 6 }} borderRadius="xl" bg="red.50" borderWidth="1px" borderColor="red.200" px={{ base: 4, md: 5 }} py={{ base: 4, md: 4 }}>
              <Heading as="h2" size="sm" color="red.700" mb={1}>Action failed</Heading>
              <Text color="red.700">{actionData.error}</Text>
            </Box>
          ) : null}

          <SpotifySearchSection
            search={filters.search}
            results={searchResults}
            hiddenFields={searchHiddenFields}
            isSearching={isFiltering}
            clearHref={clearSearchHref}
            onAdd={(album) => setAddTarget({ kind: "spotifySearchAlbum", album })}
          />

          {filters.tab === "albums" ? (
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
          ) : null}

          {filters.tab === "artists" ? (
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
          ) : null}

          {filters.tab === "playlists" ? (
            <PlaylistsTab
              playlists={libraryData.playlists}
              totalItems={libraryData.pagination.playlists.totalItems}
              page={libraryData.pagination.playlists.page}
              totalPages={libraryData.pagination.playlists.totalPages}
              buildHref={buildHref}
              hasPlaylists={libraryData.playlists.length > 0}
            />
          ) : null}

          {filters.tab === "collections" ? (
            <CollectionsTab
              collections={safeCollections}
              selectedCollection={selectedCollection}
              selectedCollectionAlbums={selectedCollectionAlbums}
              selectedCollectionArtists={selectedCollectionArtists}
              buildHref={buildHref}
              pendingAlbumId={pendingAlbumId}
              pendingArtistId={pendingArtistId}
              pendingIntent={pendingIntent}
              isSavingCollection={isSavingCollection}
              isDeletingCollection={isDeletingCollection}
              actionError={actionData && "error" in actionData ? actionData.error : null}
            />
          ) : null}
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
            <Box bg="white" borderRadius="md" maxW="xl" width="full" p={{ base: 4, md: 6 }} boxShadow="lg" mx={4}>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={3}>
                <Heading as="h3" size="md">{selectedAlbum.name}</Heading>
                <ChakraLink href={buildHref({ selectedAlbumId: null })}>
                  <Button size="sm" variant="outline">Close</Button>
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
              {selectedAlbumCollections.length > 0 ? (
                <Stack gap={1}>
                  {selectedAlbumCollections.map((collection) => (
                    <Text key={collection.id}>{collection.name}</Text>
                  ))}
                </Stack>
              ) : (
                <Text color="gray.500">Not in any collection yet.</Text>
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
