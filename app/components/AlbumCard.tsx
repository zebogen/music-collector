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
    <Box
      borderWidth="1px"
      borderColor="app.border"
      borderRadius="xl"
      overflow="hidden"
      bg="app.card"
      boxShadow="sm"
      display={{ base: "grid", sm: "block" }}
      gridTemplateColumns={{ base: "116px minmax(0, 1fr)", sm: "1fr" }}
    >
      <ChakraLink asChild display="block" minW={0}>
        <Link prefetch="intent" to={`/albums/${album.id}`} viewTransition>
        {album.imageUrl ? (
          <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" h={{ base: "100%", sm: "180px", md: "200px" }} minH={{ base: "116px", sm: "auto" }} />
        ) : (
          <Box h={{ base: "100%", sm: "180px", md: "200px" }} minH={{ base: "116px", sm: "auto" }} bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">
            <Text color="app.muted">No Art</Text>
          </Box>
        )}
        </Link>
      </ChakraLink>

      <Box p={{ base: 3, md: 3 }} minW={0}>
        <ChakraLink asChild _hover={{ textDecoration: "none" }}>
          <Link prefetch="intent" to={`/albums/${album.id}`} viewTransition>
          <Heading as="h3" size="sm" mb={2} lineHeight="1.35" lineClamp={2}>{album.name}</Heading>
          </Link>
        </ChakraLink>
        <Text fontSize="sm" color="app.muted" mb={{ base: 3, sm: 4 }} lineHeight="1.5" lineClamp={2}>{album.artistNames.join(", ") || "Unknown artist"}</Text>

        <Stack gap={2} align="stretch" direction={{ base: "column", md: "row" }} mb={2}>
          <ChakraLink href={spotifyAppUrl} display="inline-block">
            <Button size={{ base: "sm", md: "sm" }} variant="outline" w={{ base: "full", md: "auto" }}>Spotify</Button>
          </ChakraLink>
        </Stack>

        {canAddToCollection ? (
          <Button size={{ base: "sm", md: "sm" }} colorScheme="teal" w="full" onClick={() => onAddToCollection(album)}>
            Add
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
