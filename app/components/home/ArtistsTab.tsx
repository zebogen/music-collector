import { Link } from "react-router";
import { Box, Button, Heading, Link as ChakraLink, Stack, Text } from "@chakra-ui/react";
import type { Artist, Collection } from "~/types";
import PaginationControls from "~/components/PaginationControls";
import EmptyState from "~/components/EmptyState";
import { AnimatedItem } from "~/components/Animated";

export default function ArtistsTab({
  artists,
  totalItems,
  page,
  totalPages,
  buildHref,
  collections,
  onAddToCollection,
  hasActiveFilters,
  clearFiltersHref,
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
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  collections: Collection[];
  onAddToCollection: (artist: Artist) => void;
  hasActiveFilters: boolean;
  clearFiltersHref: string;
}) {
  return (
    <>
      <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} mb={{ base: 5, md: 5 }} gap={1}>
        <Heading as="h2" size="md">Artists</Heading>
        <Text color="app.muted">{totalItems} total</Text>
      </Stack>

      {artists.length > 0 ? (
        <>
          <Stack gap={4} mb={5}>
            {artists.map((artist, index) => (
              <AnimatedItem key={artist.id} index={index}>
                <Stack
                  direction={{ base: "column", md: "row" }}
                  justify="space-between"
                  align={{ base: "stretch", md: "center" }}
                  p={{ base: 4, md: 3 }}
                  bg="app.card"
                  borderWidth="1px"
                  borderColor="app.border"
                  borderRadius="xl"
                >
                  <Box>
                    <ChakraLink asChild _hover={{ textDecoration: "none" }}>
                      <Link to={`/artists/${artist.id}`} prefetch="intent" viewTransition>
                        <Heading as="h3" size="sm">{artist.name}</Heading>
                      </Link>
                    </ChakraLink>
                    <Text fontSize="sm" color="app.muted">{artist.genres.join(", ") || "No genres"}</Text>
                  </Box>
                  {collections.length > 0 ? (
                    <Button size="sm" colorScheme="teal" onClick={() => onAddToCollection(artist)}>
                      Add to Collection
                    </Button>
                  ) : null}
                </Stack>
              </AnimatedItem>
            ))}
          </Stack>

          <PaginationControls
            list="artists"
            currentPage={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      ) : (
        <EmptyState
          title={hasActiveFilters ? "No artists match these filters" : "No artists yet"}
          description={
            hasActiveFilters
              ? "Try clearing the current filters to see more artists from your Spotify library."
              : "Follow artists on Spotify or sync your account again to populate this view."
          }
          actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
          actionHref={hasActiveFilters ? clearFiltersHref : undefined}
        />
      )}
    </>
  );
}
