import { Box, Button, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import type { Artist, Collection } from "~/types";
import PaginationControls from "~/components/PaginationControls";

export default function ArtistsTab({
  artists,
  totalItems,
  page,
  totalPages,
  buildHref,
  collections,
  onAddToCollection,
}: {
  artists: Artist[];
  totalItems: number;
  page: number;
  totalPages: number;
  buildHref: (overrides?: {
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  collections: Collection[];
  onAddToCollection: (artist: Artist) => void;
}) {
  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
        <Heading as="h2" size="lg">Artists</Heading>
        <Text color="gray.500">{totalItems} total</Text>
      </HStack>

      <Stack gap={4} mb={5}>
        {artists.map((artist) => (
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
            {collections.length > 0 ? (
              <Button size="sm" colorScheme="teal" onClick={() => onAddToCollection(artist)}>
                Add to Collection
              </Button>
            ) : null}
          </HStack>
        ))}
      </Stack>

      <PaginationControls
        list="artists"
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </>
  );
}
