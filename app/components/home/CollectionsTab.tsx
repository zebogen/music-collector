import { useEffect, useState } from "react";
import { Box, Heading, Image, SimpleGrid, Stack, Text, Button, Link as ChakraLink } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import type { Collection } from "~/types";
import EmptyState from "~/components/EmptyState";
import { AnimatedItem } from "~/components/Animated";

export default function CollectionsTab({
  collections,
  selectedCollection,
  selectedCollectionAlbums,
  selectedCollectionArtists,
  buildHref,
  pendingAlbumId,
  pendingArtistId,
  pendingIntent,
}: {
  collections: Collection[];
  selectedCollection: Collection | null;
  selectedCollectionAlbums: Collection["albums"];
  selectedCollectionArtists: Collection["artists"];
  buildHref: (overrides?: {
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  pendingAlbumId: number;
  pendingArtistId: number;
  pendingIntent: FormDataEntryValue | null | undefined;
}) {
  const removeAlbumFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const removeArtistFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const [optimisticAlbumIds, setOptimisticAlbumIds] = useState<number[]>([]);
  const [optimisticArtistIds, setOptimisticArtistIds] = useState<number[]>([]);

  useEffect(() => {
    setOptimisticAlbumIds([]);
    setOptimisticArtistIds([]);
  }, [selectedCollection?.id]);

  const visibleAlbums = selectedCollectionAlbums.filter((album) => !optimisticAlbumIds.includes(album.id));
  const visibleArtists = selectedCollectionArtists.filter((artist) => !optimisticArtistIds.includes(artist.id));

  if (collections.length === 0) {
    return (
      <EmptyState
        title="No collections yet"
        description="Create your first collection from the sidebar."
      />
    );
  }

  if (!selectedCollection) {
    return <Text color="app.muted">Select a collection from the sidebar.</Text>;
  }

  return (
    <>
      <Heading as="h2" size="md" mb={1}>{selectedCollection.name}</Heading>
      <Text color="app.muted" mb={5}>{selectedCollection.description || "No description"}</Text>

      <Heading as="h4" size="sm" mb={2}>Albums</Heading>
      {visibleAlbums.length > 0 ? (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={3} mb={5}>
          {visibleAlbums.map((album, index) => (
            <AnimatedItem key={album.id} index={index}>
              <Box p={3} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="md">
                {album.imageUrl ? (
                  <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="160px" mb={2} />
                ) : (
                  <Box height="120px" bg="app.cardAlt" mb={2} display="flex" alignItems="center" justifyContent="center">Album</Box>
                )}
                <Text fontWeight="semibold">{album.name}</Text>
                <Text fontSize="sm" color="app.muted" mb={2}>{album.artistNames.join(", ") || "Unknown artist"}</Text>
                <Stack gap={2} direction={{ base: "column", sm: "row" }}>
                  <ChakraLink href={`spotify:album:${album.spotifyId}`}>
                    <Button size={{ base: "sm", md: "xs" }}>Open</Button>
                  </ChakraLink>
                  <removeAlbumFetcher.Form method="post">
                    <input type="hidden" name="intent" value="remove_album_from_collection" />
                    <input type="hidden" name="collectionId" value={selectedCollection.id} />
                    <input type="hidden" name="albumId" value={album.id} />
                    <input type="hidden" name="redirectTo" value={buildHref()} />
                    <Button
                      type="submit"
                      size={{ base: "sm", md: "xs" }}
                      variant="outline"
                      onClick={() => setOptimisticAlbumIds((current) => (current.includes(album.id) ? current : [...current, album.id]))}
                      loading={
                        (removeAlbumFetcher.state !== "idle" &&
                          Number(removeAlbumFetcher.formData?.get("albumId")) === album.id) ||
                        (pendingIntent === "remove_album_from_collection" && pendingAlbumId === album.id)
                      }
                      loadingText="Removing..."
                    >
                      Remove
                    </Button>
                  </removeAlbumFetcher.Form>
                </Stack>
              </Box>
            </AnimatedItem>
          ))}
        </SimpleGrid>
      ) : (
        <Text color="app.muted">No albums in this collection yet.</Text>
      )}

      <Heading as="h4" size="sm" mt={4} mb={2}>Artists</Heading>
      {visibleArtists.length > 0 ? (
        <Stack gap={2}>
          {visibleArtists.map((artist, index) => (
            <AnimatedItem key={artist.id} index={index}>
              <Box p={3} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="md">
                <Text fontWeight="semibold">{artist.name}</Text>
                <Text fontSize="sm" color="app.muted">{artist.genres.join(", ") || "No genres"}</Text>
                <removeArtistFetcher.Form method="post">
                  <input type="hidden" name="intent" value="remove_artist_from_collection" />
                  <input type="hidden" name="collectionId" value={selectedCollection.id} />
                  <input type="hidden" name="artistId" value={artist.id} />
                  <input type="hidden" name="redirectTo" value={buildHref()} />
                  <Button
                    type="submit"
                    size={{ base: "sm", md: "xs" }}
                    variant="outline"
                    mt={2}
                    onClick={() => setOptimisticArtistIds((current) => (current.includes(artist.id) ? current : [...current, artist.id]))}
                    loading={
                      (removeArtistFetcher.state !== "idle" &&
                        Number(removeArtistFetcher.formData?.get("artistId")) === artist.id) ||
                      (pendingIntent === "remove_artist_from_collection" && pendingArtistId === artist.id)
                    }
                    loadingText="Removing..."
                  >
                    Remove
                  </Button>
                </removeArtistFetcher.Form>
              </Box>
            </AnimatedItem>
          ))}
        </Stack>
      ) : (
        <Text color="app.muted">No artists in this collection yet.</Text>
      )}
    </>
  );
}
