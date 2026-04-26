import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Link as ChakraLink,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { useState } from "react";
import AddToCollectionDialog from "~/components/AddToCollectionDialog";
import SpotifySearchSection from "~/components/SpotifySearchSection";
import {
  addAlbumToCollection,
  addSpotifySearchAlbumToCollection,
  getCollectionSummaries,
  getRandomSavedAlbum,
  getRediscoveryQueue
} from "~/utils/library.server";
import { getAuthSession, requireUserId } from "~/utils/session.server";
import type { Album, SpotifySearchAlbum } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthSession(request);

  if (!auth.auth0Sub) {
    return data({
      authenticated: false,
      connected: false,
      collections: [],
      randomAlbum: null,
      discoveryAlbums: []
    });
  }

  if (!auth.userId) {
    return data({
      authenticated: true,
      connected: false,
      collections: [],
      randomAlbum: null,
      discoveryAlbums: []
    });
  }

  const userId = auth.userId;
  const [collections, randomAlbum, discoveryAlbums] = await Promise.all([
    getCollectionSummaries(userId),
    getRandomSavedAlbum(userId),
    getRediscoveryQueue(userId, 4)
  ]);

  return data({
    authenticated: true,
    connected: true,
    collections: collections.map((collection) => ({
      ...collection,
      artists: [],
      albums: []
    })),
    randomAlbum,
    discoveryAlbums
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "add_album_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const albumId = Number(formData.get("albumId"));

    if (!Number.isInteger(collectionId) || collectionId <= 0 || !Number.isInteger(albumId) || albumId <= 0) {
      return data({ error: "Pick a collection and album first." }, { status: 400 });
    }

    await addAlbumToCollection({ userId, collectionId, albumId });
    return data({ ok: true, toast: { type: "success", title: "Album added to collection" } });
  }

  if (intent === "add_search_album_to_collection") {
    const collectionId = Number(formData.get("collectionId"));
    const rawArtistNames = String(formData.get("artistNames") ?? "[]");

    if (!Number.isInteger(collectionId) || collectionId <= 0) {
      return data({ error: "Pick a collection first." }, { status: 400 });
    }

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

    return data({ ok: true, toast: { type: "success", title: "Album added to collection" } });
  }

  return data({ error: "Unsupported action." }, { status: 400 });
}

export default function HomeRoute() {
  const { authenticated, connected, collections, randomAlbum, discoveryAlbums } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [addTarget, setAddTarget] = useState<
    | { kind: "album"; album: Album }
    | { kind: "spotifySearchAlbum"; album: SpotifySearchAlbum }
    | null
  >(null);

  if (!authenticated) {
    return (
      <Box px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }}>
        <Stack gap={5} maxW="4xl" mx="auto">
          <Box
            bg="app.panel"
            borderWidth="1px"
            borderColor="app.border"
            borderRadius="3xl"
            p={{ base: 6, md: 10 }}
          >
            <Stack gap={5}>
              <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">
                Music Collector
              </Text>
              <Heading as="h1" size="2xl" maxW="14ch">
                Start with a spark, not a spreadsheet.
              </Heading>
              <Text color="app.muted" fontSize={{ base: "md", md: "lg" }} maxW="2xl">
                Search for records, surface a random saved album, and jump into discovery without landing straight in the collections workspace.
              </Text>
              <Stack align="stretch" direction={{ base: "column", sm: "row" }}>
                <ChakraLink asChild>
                  <Link to="/auth/login" prefetch="intent" viewTransition>
                    <Button colorScheme="green" size="lg" w={{ base: "full", sm: "auto" }}>
                      Log In
                    </Button>
                  </Link>
                </ChakraLink>
                <ChakraLink asChild>
                  <Link to="/collections?tab=collections" prefetch="intent" viewTransition>
                    <Button variant="outline" size="lg" w={{ base: "full", sm: "auto" }}>
                      Open Collections Workspace
                    </Button>
                  </Link>
                </ChakraLink>
              </Stack>
            </Stack>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            {[
              {
                title: "Random Picks",
                body: "Shuffle your library when you want something good fast."
              },
              {
                title: "Discovery",
                body: "Jump into rediscovery and adjacent albums without digging through menus."
              },
              {
                title: "Collections",
                body: "Save the albums and artists you want to come back to on purpose."
              }
            ].map((item) => (
              <Box key={item.title} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="2xl" p={4}>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>
                  {item.title}
                </Text>
                <Text color="app.muted">{item.body}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Box>
    );
  }

  if (!connected) {
    return (
      <Box px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }}>
        <Box
          bg="app.panel"
          borderWidth="1px"
          borderColor="app.border"
          borderRadius="3xl"
          p={{ base: 6, md: 10 }}
          maxW="4xl"
          mx="auto"
        >
          <Stack gap={5}>
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">
              Welcome back
            </Text>
            <Heading as="h1" size="xl">
              Connect Spotify to unlock search, random picks, and discovery.
            </Heading>
            <Text color="app.muted" fontSize={{ base: "md", md: "lg" }}>
              Once your account is linked, the homepage becomes a quick-launch pad for what to hear next.
            </Text>
            <HStack align="stretch" direction={{ base: "column", sm: "row" }}>
              <ChakraLink asChild>
                <Link to="/auth/spotify" prefetch="intent" viewTransition>
                  <Button colorScheme="green" size="lg" w={{ base: "full", sm: "auto" }}>
                    Connect Spotify
                  </Button>
                </Link>
              </ChakraLink>
              <ChakraLink asChild>
                <Link to="/collections?tab=collections" prefetch="intent" viewTransition>
                  <Button variant="outline" size="lg" w={{ base: "full", sm: "auto" }}>
                    Open Collections Workspace
                  </Button>
                </Link>
              </ChakraLink>
            </HStack>
          </Stack>
        </Box>
      </Box>
    );
  }

  const safeCollections = collections.filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 6 }}>
      <Stack gap={{ base: 5, md: 7 }}>
        <Box
          borderWidth="1px"
          borderColor="app.border"
          borderRadius={{ base: "2xl", md: "3xl" }}
          bg="app.panel"
          p={{ base: 4, md: 6 }}
          overflow="hidden"
          position="relative"
        >
          <Stack gap={5}>
            <Stack gap={2} maxW="3xl">
              <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">
                Home Base
              </Text>
              <Heading as="h1" size={{ base: "lg", md: "xl" }}>
                Pick something fast, then dive deeper when you want to.
              </Heading>
              <Text color="app.muted" fontSize={{ base: "md", md: "lg" }}>
                This homepage keeps search, random listening, and discovery in one place so the collections workspace can stay focused.
              </Text>
            </Stack>

            <HStack align="stretch" direction={{ base: "column", sm: "row" }}>
              <ChakraLink asChild>
                <Link to="/collections?tab=collections" prefetch="intent" viewTransition>
                  <Button colorScheme="green" size="lg" w={{ base: "full", sm: "auto" }}>
                    Open Collections
                  </Button>
                </Link>
              </ChakraLink>
              <ChakraLink asChild>
                <Link to="/discover" prefetch="intent" viewTransition>
                  <Button variant="outline" size="lg" w={{ base: "full", sm: "auto" }}>
                    Explore Discovery Lab
                  </Button>
                </Link>
              </ChakraLink>
            </HStack>
          </Stack>
        </Box>

        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={{ base: 5, md: 6 }}>
          <Stack gap={3}>
            <Button colorScheme="teal" size="lg" alignSelf={{ base: "stretch", sm: "flex-start" }} onClick={() => navigate(`/?pick=${Date.now()}`)}>
              Shuffle Pick
            </Button>
            <Box
              borderWidth="1px"
              borderColor="app.border"
              borderRadius="2xl"
              bg="app.card"
              overflow="hidden"
              cursor={randomAlbum ? "pointer" : "default"}
              onClick={randomAlbum ? () => navigate(`/albums/${randomAlbum.id}`) : undefined}
              onKeyDown={
                randomAlbum
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/albums/${randomAlbum.id}`);
                      }
                    }
                  : undefined
              }
              role={randomAlbum ? "link" : undefined}
              tabIndex={randomAlbum ? 0 : undefined}
            >
            {randomAlbum?.imageUrl ? (
              <Image
                src={randomAlbum.imageUrl}
                alt={`${randomAlbum.name} cover`}
                objectFit="cover"
                w="100%"
                h={{ base: "280px", md: "320px" }}
              />
            ) : (
              <Box h={{ base: "280px", md: "320px" }} bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">
                Album art
              </Box>
            )}
            <Box p={{ base: 4, md: 5 }}>
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>
                    Random Album
                  </Text>
                  <Heading as="h2" size="lg" mb={2}>
                    {randomAlbum?.name ?? "Your next random pick will appear here"}
                  </Heading>
                  <Text color="app.muted">
                    {randomAlbum
                      ? `${randomAlbum.artistNames.join(", ") || "Unknown artist"}${randomAlbum.releaseDate ? ` • ${randomAlbum.releaseDate}` : ""}`
                      : "Sync a few saved albums in Spotify to start shuffling through your library."}
                  </Text>
                </Box>

                <HStack
                  align="stretch"
                  direction={{ base: "column", md: "row" }}
                  wrap={{ base: "nowrap", md: "wrap" }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {randomAlbum ? (
                    <Button
                      variant="outline"
                      size="lg"
                      w={{ base: "full", md: "auto" }}
                      onClick={() => setAddTarget({ kind: "album", album: randomAlbum })}
                    >
                      Add to Collection
                    </Button>
                  ) : null}
                  {randomAlbum ? (
                    <ChakraLink asChild>
                      <Link to={`/albums/${randomAlbum.id}`} prefetch="intent" viewTransition>
                        <Button variant="ghost" size="lg" w={{ base: "full", md: "auto" }}>
                          View Details
                        </Button>
                      </Link>
                    </ChakraLink>
                  ) : null}
                  {randomAlbum ? (
                    <ChakraLink href={`spotify:album:${randomAlbum.spotifyId}`}>
                      <Button variant="ghost" size="lg" w={{ base: "full", md: "auto" }}>
                        Open in Spotify
                      </Button>
                    </ChakraLink>
                  ) : null}
                </HStack>
              </Stack>
            </Box>
            </Box>
          </Stack>

          <Box borderWidth="1px" borderColor="app.border" borderRadius="2xl" bg="app.card" p={{ base: 4, md: 5 }}>
            <Stack gap={4}>
              <Box>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>
                  Discover
                </Text>
                <Heading as="h2" size="lg" mb={2}>
                  Try something adjacent to what you already love.
                </Heading>
                <Text color="app.muted">
                  A quick preview from your rediscovery queue, with the full recommendation flow one tap away.
                </Text>
              </Box>

              {discoveryAlbums.length > 0 ? (
                <Stack gap={3}>
                  {discoveryAlbums.map((album) => (
                    <Box key={album.spotifyId} borderWidth="1px" borderColor="app.border" borderRadius="xl" p={3} bg="app.panelSolid">
                      <HStack align="center" gap={3}>
                        {album.imageUrl ? (
                          <Image src={album.imageUrl} alt={`${album.name} cover`} boxSize="64px" borderRadius="lg" objectFit="cover" flexShrink={0} />
                        ) : (
                          <Box boxSize="64px" borderRadius="lg" bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            Album
                          </Box>
                        )}
                        <Box minW={0}>
                          <Text fontWeight="semibold" lineClamp={1}>{album.name}</Text>
                          <Text fontSize="sm" color="app.muted" lineClamp={2}>
                            {album.artistNames.join(", ") || "Unknown artist"}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box borderWidth="1px" borderColor="app.border" borderRadius="xl" p={4} bg="app.panelSolid">
                  <Text color="app.muted">
                    Discovery suggestions show up here after your library has enough saved data to build a queue.
                  </Text>
                </Box>
              )}

              <HStack align="stretch" direction={{ base: "column", sm: "row" }}>
                <ChakraLink asChild>
                  <Link to="/discover" prefetch="intent" viewTransition>
                    <Button colorScheme="teal" size="lg" w={{ base: "full", sm: "auto" }}>
                      Open Discovery Lab
                    </Button>
                  </Link>
                </ChakraLink>
                <ChakraLink asChild>
                  <Link to="/collections?tab=albums" prefetch="intent" viewTransition>
                    <Button variant="outline" size="lg" w={{ base: "full", sm: "auto" }}>
                      Browse Saved Albums
                    </Button>
                  </Link>
                </ChakraLink>
              </HStack>
            </Stack>
          </Box>
        </SimpleGrid>

        <Box>
          <SpotifySearchSection
            initialSearch=""
            onAdd={(album) => setAddTarget({ kind: "spotifySearchAlbum", album })}
          />
          {safeCollections.length === 0 ? (
            <Text color="app.muted" mt={3}>
              Create a collection in the collections workspace before adding a search result.
            </Text>
          ) : null}
        </Box>
      </Stack>

      <AddToCollectionDialog
        open={Boolean(addTarget)}
        onClose={() => setAddTarget(null)}
        collections={safeCollections}
        target={addTarget}
        redirectTo="/"
        defaultCollectionId={safeCollections[0]?.id ?? null}
      />
    </Box>
  );
}
