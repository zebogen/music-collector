import { Link } from "react-router";
import { Box, Heading, Image, SimpleGrid, Text, Link as ChakraLink } from "@chakra-ui/react";

export type CollectionSummaryCard = {
  id: number;
  name: string;
  description: string | null;
  albumsCount: number;
  artistsCount: number;
  coverImageUrl: string | null;
};

export default function CollectionsTab({
  collections,
}: {
  collections: CollectionSummaryCard[];
}) {
  if (collections.length === 0) {
    return (
      <Box p={6} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card">
        <Heading as="h3" size="sm" mb={1}>No collections yet</Heading>
        <Text color="app.muted">Create a collection from the sidebar to get started.</Text>
      </Box>
    );
  }

  return (
    <>
      <Heading as="h2" size="md" mb={4}>Collections</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>
        {collections.map((collection) => (
          <ChakraLink key={collection.id} asChild _hover={{ textDecoration: "none" }}>
            <Link to={`/collections/${collection.id}`} prefetch="intent" viewTransition>
              <Box borderWidth="1px" borderColor="app.border" borderRadius="lg" overflow="hidden" bg="app.card" h="100%">
                {collection.coverImageUrl ? (
                  <Image src={collection.coverImageUrl} alt={`${collection.name} cover`} objectFit="cover" w="100%" h="160px" />
                ) : (
                  <Box h="160px" bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">
                    <Text color="app.muted">Collection</Text>
                  </Box>
                )}
                <Box p={4}>
                  <Heading as="h3" size="sm" mb={1}>{collection.name}</Heading>
                  <Text fontSize="sm" color="app.muted" lineClamp={2} mb={2}>
                    {collection.description || "No description"}
                  </Text>
                  <Text fontSize="sm" color="app.muted">
                    {collection.albumsCount} albums / {collection.artistsCount} artists
                  </Text>
                </Box>
              </Box>
            </Link>
          </ChakraLink>
        ))}
      </SimpleGrid>
    </>
  );
}
