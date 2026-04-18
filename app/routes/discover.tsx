import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { Box, Button, Heading, HStack, Image, SimpleGrid, Stack, Text, chakra } from "@chakra-ui/react";
import {
  addAlbumToCollection,
  addSpotifySearchAlbumToCollection,
  getCollectionById,
  getCollectionSummaries,
  getRediscoveryQueue,
  getSavedArtistSeeds,
  getSavedSpotifyIdSets
} from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";
import {
  ensureValidAccessToken,
  fetchSpotifyRelatedArtists,
  searchSpotifyAlbums,
  searchSpotifyAlbumsByArtist
} from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

type RelatedArtist = {
  spotifyId: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
};

function uniqueBySpotifyId<T extends { spotifyId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.spotifyId)) {
      continue;
    }
    seen.add(item.spotifyId);
    out.push(item);
  }
  return out;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  if (!user) {
    throw data("Missing user", { status: 400 });
  }

  const url = new URL(request.url);
  const selectedCollectionId = Number(url.searchParams.get("collectionId") ?? "0");

  const [collections, rediscoveryQueue, savedSeeds, savedSpotifyIds] = await Promise.all([
    getCollectionSummaries(userId),
    getRediscoveryQueue(userId, 24),
    getSavedArtistSeeds(userId, 6),
    getSavedSpotifyIdSets(userId)
  ]);

  const activeCollectionId =
    Number.isInteger(selectedCollectionId) && selectedCollectionId > 0
      ? selectedCollectionId
      : (collections[0]?.id ?? null);

  const accessToken = await ensureValidAccessToken(user);

  const relatedBySeed = await Promise.all(
    savedSeeds.map(async (seed) => ({
      seed,
      related: (await fetchSpotifyRelatedArtists(accessToken, seed.spotifyId))
        .filter((artist) => !savedSpotifyIds.artistSpotifyIds.has(artist.spotifyId))
        .slice(0, 8)
    }))
  );

  const missingArtists = uniqueBySpotifyId(relatedBySeed.flatMap((entry) => entry.related)).slice(0, 24);

  const missingAlbumCandidates = await Promise.all(
    missingArtists.slice(0, 8).map((artist) => searchSpotifyAlbumsByArtist(accessToken, artist.name, 6))
  );
  const missingAlbums = uniqueBySpotifyId(
    missingAlbumCandidates
      .flat()
      .filter((album) => !savedSpotifyIds.albumSpotifyIds.has(album.spotifyId))
  ).slice(0, 24);

  const collection = activeCollectionId ? await getCollectionById(userId, activeCollectionId) : null;
  const collectionQueries = collection
    ? uniqueBySpotifyId(
        [
          ...collection.artists.slice(0, 3).map((artist) => ({ spotifyId: `artist:${artist.name}`, name: `artist:${artist.name}` })),
          ...collection.albums.slice(0, 3).map((album) => ({ spotifyId: `album:${album.name}`, name: album.name })),
          { spotifyId: `name:${collection.name}`, name: collection.name }
        ] as Array<{ spotifyId: string; name: string }>
      )
    : [];

  const collectionRecommendationResults = await Promise.all(
    collectionQueries.slice(0, 5).map((query) => searchSpotifyAlbums(accessToken, query.name))
  );

  const collectionRecommendations = uniqueBySpotifyId(
    collectionRecommendationResults
      .flat()
      .filter((album) => !savedSpotifyIds.albumSpotifyIds.has(album.spotifyId))
  ).slice(0, 24);

  return data({
    collections,
    activeCollectionId,
    rediscoveryQueue,
    missingArtists,
    missingAlbums,
    relatedBySeed,
    collectionRecommendations
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const collectionId = Number(formData.get("collectionId"));

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return data({ error: "Pick a collection first." }, { status: 400 });
  }

  if (intent === "add_existing_album") {
    const albumId = Number(formData.get("albumId"));
    if (!Number.isInteger(albumId) || albumId <= 0) {
      return data({ error: "Invalid album." }, { status: 400 });
    }

    await addAlbumToCollection({ userId, collectionId, albumId });
    return data({ ok: true, toast: { type: "success", title: "Album added to collection" } });
  }

  if (intent === "add_search_album") {
    const rawArtistNames = String(formData.get("artistNames") ?? "[]");
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

  return data({ error: "Unsupported intent." }, { status: 400 });
}

export default function DiscoverRoute() {
  const {
    collections,
    activeCollectionId,
    rediscoveryQueue,
    missingArtists,
    missingAlbums,
    relatedBySeed,
    collectionRecommendations
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addFetcher = useFetcher<{ ok?: boolean; error?: string }>();

  const selectedCollectionId = Number(searchParams.get("collectionId") ?? activeCollectionId ?? 0);
  const selectCollectionHref = (collectionId: number) => `/discover?collectionId=${collectionId}`;
  const firstCollectionId = collections[0]?.id ?? 0;
  const [selectedCollectionByAlbum, setSelectedCollectionByAlbum] = useState<Record<string, number>>({});
  const activeCollectionByAlbum = useMemo(
    () => (spotifyId: string) => selectedCollectionByAlbum[spotifyId] ?? firstCollectionId,
    [selectedCollectionByAlbum, firstCollectionId]
  );

  function onCollectionPick(spotifyId: string, collectionId: number) {
    setSelectedCollectionByAlbum((prev) => ({ ...prev, [spotifyId]: collectionId }));
  }

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 6 }}>
      <Heading as="h1" size="lg" mb={1}>Discovery Lab</Heading>
      <Text color="app.muted" mb={6}>Rediscover forgotten gems and find close-fit music outside your saved library.</Text>

      <Stack gap={8}>
        <Box>
          <HStack justify="space-between" mb={3} align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }}>
            <Heading as="h2" size="md">1. Rediscovery Queue</Heading>
            <Text color="app.muted" fontSize="sm">{rediscoveryQueue.length} candidates</Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4}>
            {rediscoveryQueue.map((album) => (
              <Box key={album.spotifyId} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" overflow="hidden">
                {album.imageUrl ? (
                  <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" w="100%" h="160px" />
                ) : (
                  <Box h="160px" bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">Album</Box>
                )}
                <Box p={3}>
                  <Text fontWeight="semibold">{album.name}</Text>
                  <Text fontSize="sm" color="app.muted">{album.artistNames.join(", ") || "Unknown artist"}</Text>
                  <Text fontSize="xs" color="app.muted" mt={2}>
                    {album.inCollection ? "Already in a collection" : "Not in any collection yet"}
                  </Text>
                  <Stack mt={2} gap={2}>
                    <HStack>
                      <chakra.select
                        value={activeCollectionByAlbum(album.spotifyId)}
                        onChange={(event) => onCollectionPick(album.spotifyId, Number(event.currentTarget.value))}
                      >
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>{collection.name}</option>
                        ))}
                      </chakra.select>
                      <addFetcher.Form method="post" action="/discover">
                        <input type="hidden" name="intent" value="add_existing_album" />
                        <input type="hidden" name="albumId" value={album.id} />
                        <input type="hidden" name="collectionId" value={activeCollectionByAlbum(album.spotifyId)} />
                        <Button size="sm" type="submit" loading={addFetcher.state !== "idle"}>Add</Button>
                      </addFetcher.Form>
                    </HStack>
                    <chakra.a href={`spotify:album:${album.spotifyId}`}>
                      <Button size="sm" variant="outline">Play in Spotify</Button>
                    </chakra.a>
                  </Stack>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Box>
          <Heading as="h2" size="md" mb={3}>6. Missing-From-Library Radar</Heading>
          <Text color="app.muted" mb={4}>Artists and albums adjacent to your top saved artists but not yet in your library.</Text>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <Box borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={4}>
              <Heading as="h3" size="sm" mb={3}>Artists You Might Be Missing</Heading>
              <Stack gap={2}>
                {missingArtists.slice(0, 10).map((artist: RelatedArtist) => (
                  <HStack key={artist.spotifyId} justify="space-between">
                    <Text>{artist.name}</Text>
                    <chakra.a href={`spotify:artist:${artist.spotifyId}`}>
                      <Button size="xs" variant="outline">Open</Button>
                    </chakra.a>
                  </HStack>
                ))}
              </Stack>
            </Box>
            <Box borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={4}>
              <Heading as="h3" size="sm" mb={3}>Albums You Might Like</Heading>
              <Stack gap={2}>
                {missingAlbums.slice(0, 10).map((album) => (
                  <Box key={album.spotifyId} borderWidth="1px" borderColor="app.border" borderRadius="md" p={2}>
                    <HStack justify="space-between">
                      <Box minW={0}>
                        <Text fontWeight="semibold" lineClamp={1}>{album.name}</Text>
                        <Text fontSize="sm" color="app.muted" lineClamp={1}>{album.artistNames.join(", ")}</Text>
                      </Box>
                      <chakra.a href={`spotify:album:${album.spotifyId}`}>
                        <Button size="xs" variant="outline">Open</Button>
                      </chakra.a>
                    </HStack>
                    <HStack mt={2}>
                      <chakra.select
                        value={activeCollectionByAlbum(album.spotifyId)}
                        onChange={(event) => onCollectionPick(album.spotifyId, Number(event.currentTarget.value))}
                      >
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>{collection.name}</option>
                        ))}
                      </chakra.select>
                      <addFetcher.Form method="post" action="/discover">
                        <input type="hidden" name="intent" value="add_search_album" />
                        <input type="hidden" name="collectionId" value={activeCollectionByAlbum(album.spotifyId)} />
                        <input type="hidden" name="spotifyId" value={album.spotifyId} />
                        <input type="hidden" name="name" value={album.name} />
                        <input type="hidden" name="albumType" value={album.albumType ?? ""} />
                        <input type="hidden" name="releaseDate" value={album.releaseDate ?? ""} />
                        <input type="hidden" name="imageUrl" value={album.imageUrl ?? ""} />
                        <input type="hidden" name="artistNames" value={JSON.stringify(album.artistNames)} />
                        <Button size="xs" type="submit" loading={addFetcher.state !== "idle"}>Add</Button>
                      </addFetcher.Form>
                    </HStack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </SimpleGrid>
        </Box>

        <Box>
          <HStack justify="space-between" mb={3} align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }}>
            <Heading as="h2" size="md">7. Similar-To-Collection Discovery</Heading>
            <HStack>
              <Text fontSize="sm" color="app.muted">Collection</Text>
              <chakra.select
                value={selectedCollectionId || ""}
                onChange={(event) => {
                  const href = selectCollectionHref(Number(event.currentTarget.value));
                  navigate(href);
                }}
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </chakra.select>
            </HStack>
          </HStack>
          {collectionRecommendations.length > 0 ? (
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4}>
              {collectionRecommendations.map((album) => (
                <Box key={album.spotifyId} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={3}>
                  <Text fontWeight="semibold">{album.name}</Text>
                  <Text fontSize="sm" color="app.muted">{album.artistNames.join(", ") || "Unknown artist"}</Text>
                  <HStack mt={2}>
                    <chakra.select
                      value={activeCollectionByAlbum(album.spotifyId)}
                      onChange={(event) => onCollectionPick(album.spotifyId, Number(event.currentTarget.value))}
                    >
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>{collection.name}</option>
                      ))}
                    </chakra.select>
                    <addFetcher.Form method="post" action="/discover">
                      <input type="hidden" name="intent" value="add_search_album" />
                      <input type="hidden" name="collectionId" value={activeCollectionByAlbum(album.spotifyId)} />
                      <input type="hidden" name="spotifyId" value={album.spotifyId} />
                      <input type="hidden" name="name" value={album.name} />
                      <input type="hidden" name="albumType" value={album.albumType ?? ""} />
                      <input type="hidden" name="releaseDate" value={album.releaseDate ?? ""} />
                      <input type="hidden" name="imageUrl" value={album.imageUrl ?? ""} />
                      <input type="hidden" name="artistNames" value={JSON.stringify(album.artistNames)} />
                      <Button size="sm" type="submit" loading={addFetcher.state !== "idle"}>Add</Button>
                    </addFetcher.Form>
                    <chakra.a href={`spotify:album:${album.spotifyId}`}>
                      <Button size="sm" variant="outline">Open</Button>
                    </chakra.a>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <Text color="app.muted">No recommendations yet. Add more artists/albums to collections to improve this.</Text>
          )}
        </Box>

        <Box>
          <Heading as="h2" size="md" mb={3}>11. One-Degree-Away Explorer</Heading>
          <Text color="app.muted" mb={4}>Your seed artists and closely related artists you do not currently have saved.</Text>
          <Stack gap={3}>
            {relatedBySeed.map((entry) => (
              <Box key={entry.seed.spotifyId} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={4}>
                <Text fontWeight="semibold" mb={2}>{entry.seed.name}</Text>
                <HStack gap={2} wrap="wrap">
                  {entry.related.slice(0, 8).map((artist: RelatedArtist) => (
                    <chakra.a key={artist.spotifyId} href={`spotify:artist:${artist.spotifyId}`}>
                      <Button size="xs" variant="outline">{artist.name}</Button>
                    </chakra.a>
                  ))}
                </HStack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>

      <HStack mt={8}>
        <Link to="/collections?tab=collections" prefetch="intent" viewTransition>
          <Button variant="outline">Back to Library</Button>
        </Link>
      </HStack>
      {addFetcher.data?.error ? (
        <Text color="app.danger" mt={4}>{addFetcher.data.error}</Text>
      ) : null}
    </Box>
  );
}
