import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, useActionData, useLoaderData, useLocation, useNavigate, useNavigation } from "react-router";
import {
  Box,
  Grid,
  Heading,
  Text,
  Button,
  Input,
  HStack,
  SimpleGrid,
  Image,
  Link as ChakraLink,
  Stack,
  Spinner
} from "@chakra-ui/react";
import { chakra } from "@chakra-ui/react";
import Sidebar from "~/components/Sidebar";
import AlbumCard from "~/components/AlbumCard";
import { useEffect, useMemo, useState } from "react";
import type { Album, Artist, Playlist, SpotifySearchAlbum } from "~/types";
import {
  addAlbumToCollection,
  addArtistToCollection,
  addSpotifySearchAlbumToCollection,
  createCollection,
  getCollections,
  getLibraryData,
  removeAlbumFromCollection,
  removeArtistFromCollection,
  syncSpotifyData
} from "~/utils/library.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyFollowedArtists,
  fetchSpotifyPlaylists,
  fetchSpotifySavedAlbums,
  searchSpotifyAlbums
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";
import PaginationControls from "~/components/PaginationControls";
import SpotifySearchSection from "~/components/SpotifySearchSection";
import AddToCollectionDialog from "~/components/AddToCollectionDialog";

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
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (collectionId > 0 && albumId > 0) {
      await addAlbumToCollection({ collectionId, albumId, userId });
    }

    return redirect(redirectTo);
  }

  if (intent === "add_artist_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const artistId = Number(formData.get("artistId"));
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (collectionId > 0 && artistId > 0) {
      await addArtistToCollection({ collectionId, artistId, userId });
    }

    return redirect(redirectTo);
  }

  if (intent === "add_search_album_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const redirectTo = String(formData.get("redirectTo") ?? "/");
    const rawArtistNames = String(formData.get("artistNames") ?? "[]");

    if (collectionId > 0) {
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

    return redirect(redirectTo);
  }

  if (intent === "remove_album_from_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const albumId = Number(formData.get("albumId"));
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (collectionId > 0 && albumId > 0) {
      await removeAlbumFromCollection({ collectionId, albumId, userId });
    }

    return redirect(redirectTo);
  }

  if (intent === "remove_artist_from_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const artistId = Number(formData.get("artistId"));
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (collectionId > 0 && artistId > 0) {
      await removeArtistFromCollection({ collectionId, artistId, userId });
    }

    return redirect(redirectTo);
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
  const isLoadingData = navigation.state === "loading";

  function buildHref(overrides?: {
    tab?: TabKey;
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
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
    const search = overrides && "search" in overrides ? overrides.search : filters.search;

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
    if (search) {
      params.set("search", search);
    }

    return `/?${params.toString()}`;
  }

  const selectedAlbum = libraryData.albums.find((album: Album) => album.id === filters.selectedAlbumId) ?? null;
  const selectedAlbumCollections = selectedAlbum
    ? safeCollections.filter((collection) => collection.albums.some((album) => album.id === selectedAlbum.id))
    : [];
  const selectedCollection =
    safeCollections.find((collection) => collection.id === filters.selectedCollectionId) ?? safeCollections[0] ?? null;
  const selectedCollectionArtists = selectedCollection?.artists ?? [];
  const selectedCollectionAlbums = selectedCollection?.albums ?? [];
  const currentHref = useMemo(() => buildHref(), [location.search]);
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

          <SpotifySearchSection
            search={filters.search}
            results={searchResults}
            hiddenFields={searchHiddenFields}
            isSearching={isFiltering}
            onAdd={(album) => setAddTarget({ kind: "spotifySearchAlbum", album })}
          />

          {filters.tab === "albums" ? (
            <>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
                <Heading as="h2" size="lg">Saved Albums</Heading>
                <Text color="gray.500">{libraryData.pagination.albums.totalItems} total</Text>
              </HStack>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 5, md: 4 }} mb={5}>
                {libraryData.albums.map((album: Album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    buildHref={buildHref}
                    canAddToCollection={safeCollections.length > 0}
                    onAddToCollection={(targetAlbum) => setAddTarget({ kind: "album", album: targetAlbum })}
                  />
                ))}
              </SimpleGrid>

              <PaginationControls
                list="albums"
                currentPage={libraryData.pagination.albums.page}
                totalPages={libraryData.pagination.albums.totalPages}
                buildHref={buildHref}
              />
            </>
          ) : null}

          {filters.tab === "artists" ? (
            <>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
                <Heading as="h2" size="lg">Artists</Heading>
                <Text color="gray.500">{libraryData.pagination.artists.totalItems} total</Text>
              </HStack>

              <Stack gap={4} mb={5}>
                {libraryData.artists.map((artist: Artist) => (
                  <HStack
                    key={artist.id}
                    justify="space-between"
                    align={{ base: "stretch", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    p={{ base: 4, md: 3 }}
                    bg="white"
                    borderWidth="1px"
                    borderRadius="md"
                  >
                    <Box>
                      <Heading as="h3" size="sm">{artist.name}</Heading>
                      <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
                    </Box>
                    {safeCollections.length > 0 ? (
                      <Button size="sm" colorScheme="teal" onClick={() => setAddTarget({ kind: "artist", artistId: artist.id, artistName: artist.name })}>
                        Add to Collection
                      </Button>
                    ) : null}
                  </HStack>
                ))}
              </Stack>

              <PaginationControls
                list="artists"
                currentPage={libraryData.pagination.artists.page}
                totalPages={libraryData.pagination.artists.totalPages}
                buildHref={buildHref}
              />
            </>
          ) : null}

          {filters.tab === "playlists" ? (
            <>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
                <Heading as="h2" size="lg">Playlists</Heading>
                <Text color="gray.500">{libraryData.pagination.playlists.totalItems} total</Text>
              </HStack>

              <Stack gap={4} mb={5}>
                {libraryData.playlists.map((playlist: Playlist) => (
                  <Box key={playlist.id} p={{ base: 4, md: 3 }} bg="white" borderWidth="1px" borderRadius="xl">
                    <Heading as="h3" size="sm">{playlist.name}</Heading>
                    <Text fontSize="sm" color="gray.600" mt={1}>{playlist.tracksTotal} tracks</Text>
                  </Box>
                ))}
              </Stack>

              <PaginationControls
                list="playlists"
                currentPage={libraryData.pagination.playlists.page}
                totalPages={libraryData.pagination.playlists.totalPages}
                buildHref={buildHref}
              />
            </>
          ) : null}

          {filters.tab === "collections" ? (
            <>
              <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
                <Heading as="h2" size="lg">Collections</Heading>
                <Text color="gray.500">{safeCollections.length} total</Text>
              </HStack>

              {safeCollections.length === 0 ? (
                <Text color="gray.500">Create a collection from the sidebar to get started.</Text>
              ) : (
                <>
                  <Stack gap={2} mb={5} direction={{ base: "column", md: "row" }} wrap="wrap">
                    {safeCollections.map((collection) => (
                      <ChakraLink key={collection.id} href={buildHref({ tab: "collections", selectedCollectionId: collection.id })}>
                        <Button size="sm" variant={selectedCollection?.id === collection.id ? "solid" : "ghost"} w={{ base: "full", md: "auto" }}>{collection.name}</Button>
                      </ChakraLink>
                    ))}
                  </Stack>

                  {selectedCollection ? (
                    <Box>
                      <Heading as="h3" size="md">{selectedCollection.name}</Heading>
                      <Text color="gray.500" mb={3}>{selectedCollection.description || "No description"}</Text>

                      <Heading as="h4" size="sm" mt={4} mb={2}>Albums</Heading>
                      {selectedCollectionAlbums.length > 0 ? (
                        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 4, md: 3 }} mb={5}>
                          {selectedCollectionAlbums.map((album) => (
                            <Box key={album.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                              {album.imageUrl ? (
                                <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="140px" mb={2} />
                              ) : (
                                <Box height="100px" bg="gray.100" mb={2} display="flex" alignItems="center" justifyContent="center">Album</Box>
                              )}
                              <Text fontWeight="semibold">{album.name}</Text>
                              <Text fontSize="sm" color="gray.600" mb={2}>{album.artistNames.join(", ") || "Unknown artist"}</Text>
                              <Stack gap={2} direction={{ base: "column", sm: "row" }}>
                                <ChakraLink href={`spotify:album:${album.spotifyId}`}>
                                  <Button size="xs">Open in App</Button>
                                </ChakraLink>
                                <Form method="post">
                                  <input type="hidden" name="intent" value="remove_album_from_collection" />
                                  <input type="hidden" name="collectionId" value={selectedCollection.id} />
                                  <input type="hidden" name="albumId" value={album.id} />
                                  <input type="hidden" name="redirectTo" value={buildHref()} />
                                  <Button
                                    type="submit"
                                    size="xs"
                                    variant="outline"
                                    colorScheme="red"
                                    loading={navigation.state === "submitting" && pendingIntent === "remove_album_from_collection" && pendingAlbumId === album.id}
                                    loadingText="Removing..."
                                  >
                                    Remove
                                  </Button>
                                </Form>
                              </Stack>
                            </Box>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text color="gray.500">No albums in this collection yet.</Text>
                      )}

                      <Heading as="h4" size="sm" mt={4} mb={2}>Artists</Heading>
                      {selectedCollectionArtists.length > 0 ? (
                        <Stack gap={2}>
                          {selectedCollectionArtists.map((artist) => (
                            <Box key={artist.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                              <Text fontWeight="semibold">{artist.name}</Text>
                              <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
                              <Form method="post">
                                <input type="hidden" name="intent" value="remove_artist_from_collection" />
                                <input type="hidden" name="collectionId" value={selectedCollection.id} />
                                <input type="hidden" name="artistId" value={artist.id} />
                                <input type="hidden" name="redirectTo" value={buildHref()} />
                                <Button
                                  type="submit"
                                  size="xs"
                                  variant="outline"
                                  colorScheme="red"
                                  mt={2}
                                  loading={navigation.state === "submitting" && pendingIntent === "remove_artist_from_collection" && pendingArtistId === artist.id}
                                  loadingText="Removing..."
                                >
                                  Remove
                                </Button>
                              </Form>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Text color="gray.500">No artists in this collection yet.</Text>
                      )}
                    </Box>
                  ) : null}
                </>
              )}
            </>
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
