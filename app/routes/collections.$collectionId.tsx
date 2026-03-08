import type { LoaderFunctionArgs } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { Box, Heading, Image, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { getCollectionById } from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const collectionId = Number(params.collectionId);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const collection = await getCollectionById(userId, collectionId);
  if (!collection) {
    throw data("Not found", { status: 404 });
  }

  return data({ collection });
}

export default function CollectionDetailRoute() {
  const { collection } = useLoaderData<typeof loader>();

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
      <Link to="/?tab=collections" prefetch="intent" viewTransition>Back to Collections</Link>
      <Heading as="h1" size="lg" mt={3}>{collection.name}</Heading>
      <Text color="app.muted" mb={5}>{collection.description || "No description"}</Text>

      <Heading as="h2" size="md" mb={3}>Albums</Heading>
      {collection.albums.length > 0 ? (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4} mb={6}>
          {collection.albums.map((album) => (
            <Box key={album.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" overflow="hidden">
              {album.imageUrl ? (
                <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" w="100%" h="160px" />
              ) : (
                <Box h="160px" bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">Album</Box>
              )}
              <Box p={3}>
                <Text fontWeight="semibold">{album.name}</Text>
                <Text fontSize="sm" color="app.muted">{album.artistNames.join(", ") || "Unknown artist"}</Text>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <Text color="app.muted" mb={6}>No albums in this collection.</Text>
      )}

      <Heading as="h2" size="md" mb={3}>Artists</Heading>
      {collection.artists.length > 0 ? (
        <Stack gap={2}>
          {collection.artists.map((artist) => (
            <Box key={artist.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={3}>
              <Text fontWeight="semibold">{artist.name}</Text>
              <Text fontSize="sm" color="app.muted">{artist.genres.join(", ") || "No genres"}</Text>
            </Box>
          ))}
        </Stack>
      ) : (
        <Text color="app.muted">No artists in this collection.</Text>
      )}
    </Box>
  );
}
