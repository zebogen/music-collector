import { Link } from "react-router";
import { Box, Heading, Text, Image, Stack, Button, Link as ChakraLink } from "@chakra-ui/react";
import type { Album } from "~/types";

export default function AlbumCard({
  album,
  canAddToCollection,
  onAddToCollection,
}: {
  album: Album;
  canAddToCollection: boolean;
  onAddToCollection: (album: Album) => void;
}) {
  const spotifyAppUrl = `spotify:album:${album.spotifyId}`;

  return (
    <Box borderWidth="1px" borderColor="app.border" borderRadius="xl" overflow="hidden" bg="app.card" boxShadow="sm">
      <ChakraLink asChild display="block">
        <Link prefetch="intent" to={`/albums/${album.id}`} viewTransition>
        {album.imageUrl ? (
          <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" h={{ base: "180px", md: "200px" }} />
        ) : (
          <Box h={{ base: "180px", md: "200px" }} bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">
            <Text color="app.muted">No Art</Text>
          </Box>
        )}
        </Link>
      </ChakraLink>

      <Box p={{ base: 3, md: 3 }}>
        <ChakraLink asChild _hover={{ textDecoration: "none" }}>
          <Link prefetch="intent" to={`/albums/${album.id}`} viewTransition>
          <Heading as="h3" size="sm" mb={2} lineHeight="1.35">{album.name}</Heading>
          </Link>
        </ChakraLink>
        <Text fontSize="sm" color="app.muted" mb={4} lineHeight="1.5">{album.artistNames.join(", ") || "Unknown artist"}</Text>

        <Stack gap={2} align="stretch" direction={{ base: "column", sm: "row" }} mb={2}>
          <ChakraLink href={spotifyAppUrl} display="inline-block">
            <Button size={{ base: "md", md: "sm" }} variant="solid" w={{ base: "full", sm: "auto" }}>Open in Spotify App</Button>
          </ChakraLink>
        </Stack>

        {canAddToCollection ? (
          <Button size={{ base: "md", md: "sm" }} colorScheme="teal" w="full" onClick={() => onAddToCollection(album)}>
            Add to Collection
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
