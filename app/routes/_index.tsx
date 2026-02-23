import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, useActionData, useLoaderData, useLocation, useNavigate } from "react-router";
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Select,
  Input,
  VStack,
  HStack,
  SimpleGrid,
  Image,
  Link as ChakraLink,
  Badge,
  Stack
} from "@chakra-ui/react";
import Sidebar from "~/components/Sidebar";
import AlbumCard from "~/components/AlbumCard";
import ArtistItem from "~/components/ArtistItem";
import PlaylistItem from "~/components/PlaylistItem";
import CollectionCard from "~/components/CollectionCard";
import { useEffect } from "react";
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

  if (intent === "add_artist_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const artistId = Number(formData.get("artistId"));

    if (collectionId > 0 && artistId > 0) {
      await addArtistToCollection({ collectionId, artistId, userId });
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
      <HStack spacing={3} align="center">
        <ChakraLink href={
          list === "albums"
            ? buildHref({ albumsPage: Math.max(1, currentPage - 1), selectedAlbumId: null })
            : list === "artists"
              ? buildHref({ artistsPage: Math.max(1, currentPage - 1) })
              : buildHref({ playlistsPage: Math.max(1, currentPage - 1) })
        }>
          <Button variant="outline" size="sm" isDisabled={currentPage <= 1}>Previous</Button>
        </ChakraLink>

        <HStack spacing={2}>
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <Text key={`${list}-ellipsis-${index}`}>…</Text>
            ) : (
              <ChakraLink key={`${list}-${item}`} href={
                list === "albums"
                  ? buildHref({ albumsPage: item, selectedAlbumId: null })
                  : list === "artists"
                    ? buildHref({ artistsPage: item })
                    : buildHref({ playlistsPage: item })
              }>
                <Button size="sm" variant={item === currentPage ? "solid" : "ghost"} aria-current={item === currentPage ? "page" : undefined}>{item}</Button>
              </ChakraLink>
            )
          )}
        </HStack>

        <ChakraLink href={
          list === "albums"
            ? buildHref({ albumsPage: Math.min(totalPages, currentPage + 1), selectedAlbumId: null })
            : list === "artists"
              ? buildHref({ artistsPage: Math.min(totalPages, currentPage + 1) })
              : buildHref({ playlistsPage: Math.min(totalPages, currentPage + 1) })
        }>
          <Button variant="outline" size="sm" isDisabled={currentPage >= totalPages}>Next</Button>
        </ChakraLink>
      </HStack>
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
    <Grid templateColumns={["1fr", "300px 1fr"]} gap={6}>
      <Box as="aside">
        <Sidebar filters={filters} genres={libraryData.genres} selectedCollectionId={filters.selectedCollectionId} actionError={actionData && "error" in actionData ? actionData.error : null} />
      </Box>

      <Box as="main">
        <Box p={4} borderRadius="md" bg="white" boxShadow="sm">
          <HStack as="nav" spacing={3} mb={4}>
            <ChakraLink href={buildHref({ tab: "albums" })}>
              <Button variant={filters.tab === "albums" ? "solid" : "ghost"}>Albums</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "artists" })}>
              <Button variant={filters.tab === "artists" ? "solid" : "ghost"}>Artists</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "playlists" })}>
              <Button variant={filters.tab === "playlists" ? "solid" : "ghost"}>Playlists</Button>
            </ChakraLink>
            <ChakraLink href={buildHref({ tab: "collections", selectedCollectionId: selectedCollection?.id ?? null })}>
              <Button variant={filters.tab === "collections" ? "solid" : "ghost"}>Collections</Button>
            </ChakraLink>
          </HStack>

          </Box>

        <Box mt={4}>
          {/* keep the existing tab content markup for now, wrapped in a Box */}
          {/* legacy tab-nav removed; top tab HStack already provides tabs */}

          {filters.tab === "albums" ? (
            <>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="lg">Saved Albums</Heading>
                <Text color="gray.500">{libraryData.pagination.albums.totalItems} total</Text>
              </HStack>

              <SimpleGrid columns={[2, 3, 4]} spacing={4} mb={4}>
                {libraryData.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} safeCollections={safeCollections} buildHref={buildHref} />
                ))}
              </SimpleGrid>

              {renderPagination("albums", libraryData.pagination.albums.page, libraryData.pagination.albums.totalPages)}
            </>
          ) : null}

          {filters.tab === "artists" ? (
            <>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="lg">Artists</Heading>
                <Text color="gray.500">{libraryData.pagination.artists.totalItems} total</Text>
              </HStack>

              <Stack spacing={3} mb={4}>
                {libraryData.artists.map((artist) => (
                  <HStack key={artist.id} justify="space-between" align="center" p={3} bg="white" borderWidth="1px" borderRadius="md">
                    <Box>
                      <Heading as="h3" size="sm">{artist.name}</Heading>
                      <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
                    </Box>
                    {safeCollections.length > 0 ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="add_artist_to_collection" />
                        <input type="hidden" name="artistId" value={artist.id} />
                        <HStack>
                          <Select name="collectionId" placeholder="Collection" size="sm">
                            {safeCollections.map((collection) => (
                              <option key={collection.id} value={collection.id}>{collection.name}</option>
                            ))}
                          </Select>
                          <Button type="submit" size="sm" colorScheme="teal">Add</Button>
                        </HStack>
                      </Form>
                    ) : null}
                  </HStack>
                ))}
              </Stack>

              {renderPagination("artists", libraryData.pagination.artists.page, libraryData.pagination.artists.totalPages)}
            </>
          ) : null}

          {filters.tab === "playlists" ? (
            <>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="lg">Playlists</Heading>
                <Text color="gray.500">{libraryData.pagination.playlists.totalItems} total</Text>
              </HStack>

              <Stack spacing={3} mb={4}>
                {libraryData.playlists.map((playlist) => (
                  <Box key={playlist.id} p={3} bg="white" borderWidth="1px" borderRadius="md">
                    <Heading as="h3" size="sm">{playlist.name}</Heading>
                    <Text fontSize="sm" color="gray.600">{playlist.tracksTotal} tracks</Text>
                  </Box>
                ))}
              </Stack>

              {renderPagination("playlists", libraryData.pagination.playlists.page, libraryData.pagination.playlists.totalPages)}
            </>
          ) : null}

          {filters.tab === "collections" ? (
            <>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="lg">Collections</Heading>
                <Text color="gray.500">{safeCollections.length} total</Text>
              </HStack>

              {safeCollections.length === 0 ? (
                <Text color="gray.500">Create a collection from the sidebar to get started.</Text>
              ) : (
                <>
                  <HStack spacing={2} mb={4}>
                    {safeCollections.map((collection) => (
                      <ChakraLink key={collection.id} href={buildHref({ tab: "collections", selectedCollectionId: collection.id })}>
                        <Button size="sm" variant={selectedCollection?.id === collection.id ? "solid" : "ghost"}>{collection.name}</Button>
                      </ChakraLink>
                    ))}
                  </HStack>

                  {selectedCollection ? (
                    <Box>
                      <Heading as="h3" size="md">{selectedCollection.name}</Heading>
                      <Text color="gray.500" mb={3}>{selectedCollection.description || "No description"}</Text>

                      <Heading as="h4" size="sm" mt={4} mb={2}>Albums</Heading>
                      {selectedCollectionAlbums.length > 0 ? (
                        <SimpleGrid columns={[2,3,4]} spacing={3} mb={4}>
                          {selectedCollectionAlbums.map((album) => (
                            <Box key={album.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                              {album.imageUrl ? (
                                <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="140px" mb={2} />
                              ) : (
                                <Box height="100px" bg="gray.100" mb={2} display="flex" alignItems="center" justifyContent="center">Album</Box>
                              )}
                              <Text fontWeight="semibold">{album.name}</Text>
                              <Text fontSize="sm" color="gray.600">{album.artistNames.join(", ") || "Unknown artist"}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text color="gray.500">No albums in this collection match the active filters.</Text>
                      )}

                      <Heading as="h4" size="sm" mt={4} mb={2}>Artists</Heading>
                      {selectedCollectionArtists.length > 0 ? (
                        <Stack spacing={2}>
                          {selectedCollectionArtists.map((artist) => (
                            <Box key={artist.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                              <Text fontWeight="semibold">{artist.name}</Text>
                              <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Text color="gray.500">No artists in this collection match the active filters.</Text>
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
            <Box bg="white" borderRadius="md" maxW="xl" width="full" p={6} boxShadow="lg">
              <HStack justify="space-between" mb={3}>
                <Heading as="h3" size="md">{selectedAlbum.name}</Heading>
                <ChakraLink href={buildHref({ selectedAlbumId: null })}>
                  <Button size="sm" variant="outline">Close</Button>
                </ChakraLink>
              </HStack>

              <Text mb={2}>Artists: {selectedAlbum.artistNames.join(", ") || "Unknown artist"}</Text>
              <Text mb={2}>Release date: {selectedAlbum.releaseDate || "Unknown"}</Text>
              <Heading as="h4" size="sm" mt={3} mb={2}>In Collections</Heading>
              {selectedAlbumCollections.length > 0 ? (
                <Stack spacing={1}>
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
      </Box>
    </Grid>
  );
}
