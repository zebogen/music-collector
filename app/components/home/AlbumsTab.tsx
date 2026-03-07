import { Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import type { Album, Collection } from "~/types";
import AlbumCard from "~/components/AlbumCard";
import PaginationControls from "~/components/PaginationControls";
import EmptyState from "~/components/EmptyState";
import { AnimatedItem } from "~/components/Animated";

export default function AlbumsTab({
  albums,
  totalItems,
  page,
  totalPages,
  buildHref,
  collections,
  onAddToCollection,
  hasActiveFilters,
  clearFiltersHref,
}: {
  albums: Album[];
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
  onAddToCollection: (album: Album) => void;
  hasActiveFilters: boolean;
  clearFiltersHref: string;
}) {
  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 5 }} gap={1}>
        <Heading as="h2" size="md">Saved Albums</Heading>
        <Text color="app.muted">{totalItems} total</Text>
      </HStack>

      {albums.length > 0 ? (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 5, md: 4 }} mb={5}>
            {albums.map((album, index) => (
              <AnimatedItem key={album.id} index={index}>
                <AlbumCard
                  album={album}
                  buildHref={buildHref}
                  canAddToCollection={collections.length > 0}
                  onAddToCollection={onAddToCollection}
                />
              </AnimatedItem>
            ))}
          </SimpleGrid>

          <PaginationControls
            list="albums"
            currentPage={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      ) : (
        <EmptyState
          title={hasActiveFilters ? "No albums match these filters" : "No saved albums yet"}
          description={
            hasActiveFilters
              ? "Try clearing the current genre or artist filter to see more of your library."
              : "Sync your Spotify library to pull in saved albums, then add standout records to collections."
          }
          actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
          actionHref={hasActiveFilters ? clearFiltersHref : undefined}
        />
      )}
    </>
  );
}
