import { Box, Heading, Text, Image, Stack, Button, Link as ChakraLink } from "@chakra-ui/react";
import type { Album } from "~/types";

export default function AlbumCard({
  album,
  buildHref,
  canAddToCollection,
  onAddToCollection,
}: {
  album: Album;
  buildHref: (overrides?: { selectedAlbumId?: number | null }) => string;
  canAddToCollection: boolean;
  onAddToCollection: (album: Album) => void;
}) {
  const spotifyAppUrl = `spotify:album:${album.spotifyId}`;

  return (
    <Box borderWidth="1px" borderRadius="xl" overflow="hidden" bg="white">
      <ChakraLink href={buildHref({ selectedAlbumId: album.id })} display="block">
        {album.imageUrl ? (
          <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" h={{ base: "220px", md: "200px" }} />
        ) : (
          <Box h={{ base: "220px", md: "200px" }} bg="gray.100" display="flex" alignItems="center" justifyContent="center">
            <Text color="gray.500">No Art</Text>
          </Box>
        )}
      </ChakraLink>

      <Box p={{ base: 4, md: 3 }}>
        <ChakraLink href={buildHref({ selectedAlbumId: album.id })} _hover={{ textDecoration: "none" }}>
          <Heading as="h3" size="sm" mb={2} lineHeight="1.35">{album.name}</Heading>
        </ChakraLink>
        <Text fontSize="sm" color="gray.600" mb={4} lineHeight="1.5">{album.artistNames.join(", ") || "Unknown artist"}</Text>

        <Stack gap={2} align="stretch" direction={{ base: "column", sm: "row" }} mb={3}>
          <ChakraLink href={spotifyAppUrl} display="inline-block">
            <Button size="sm" variant="solid" w={{ base: "full", sm: "auto" }}>Open in Spotify App</Button>
          </ChakraLink>
        </Stack>

        {canAddToCollection ? (
          <Button size="sm" colorScheme="teal" w="full" onClick={() => onAddToCollection(album)}>
            Add to Collection
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
