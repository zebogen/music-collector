import { Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import type { Album, Collection } from "~/types";
import AlbumCard from "~/components/AlbumCard";
import PaginationControls from "~/components/PaginationControls";

export default function AlbumsTab({
  albums,
  totalItems,
  page,
  totalPages,
  buildHref,
  collections,
  onAddToCollection,
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
}) {
  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
        <Heading as="h2" size="lg">Saved Albums</Heading>
        <Text color="gray.500">{totalItems} total</Text>
      </HStack>

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 5, md: 4 }} mb={5}>
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            buildHref={buildHref}
            canAddToCollection={collections.length > 0}
            onAddToCollection={onAddToCollection}
          />
        ))}
      </SimpleGrid>

      <PaginationControls
        list="albums"
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </>
  );
}
