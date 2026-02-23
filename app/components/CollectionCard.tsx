import type { Collection as CollectionType, Album as AlbumType, Artist as ArtistType } from "~/types";
import { Box, Heading, Text, SimpleGrid, Image, Stack } from "@chakra-ui/react";
import AlbumCard from "~/components/AlbumCard";

export default function CollectionCard({ collection, selectedCollectionAlbums, selectedCollectionArtists, buildHref }: {
  collection: CollectionType;
  selectedCollectionAlbums: AlbumType[];
  selectedCollectionArtists: ArtistType[];
  buildHref: (overrides?: any) => string;
}) {
  return (
    <Box>
      <Heading as="h3" size="md">{collection.name}</Heading>
      <Text color="gray.500" mb={3}>{collection.description || "No description"}</Text>

      <Heading as="h4" size="sm" mt={4} mb={2}>Albums</Heading>
      {selectedCollectionAlbums.length > 0 ? (
  <SimpleGrid columns={[2,3,4]} gap={3} mb={4}>
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
        <Stack gap={2}>
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
  );
}
