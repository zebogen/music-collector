import { Link } from "react-router";
import { Box, Heading, HStack, Image, SimpleGrid, Stack, Text, Link as ChakraLink } from "@chakra-ui/react";

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
      <Stack direction={{ base: "row", md: "row" }} justify="space-between" align="center" mb={3}>
        <Heading as="h2" size="md">Collections</Heading>
        <Text color="app.muted" fontSize="sm">{collections.length} total</Text>
      </Stack>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={{ base: 3, md: 4 }}>
        {collections.map((collection) => (
          <ChakraLink key={collection.id} asChild _hover={{ textDecoration: "none" }} display="block" w="full">
            <Link to={`/collections/${collection.id}`} prefetch="intent" viewTransition style={{ display: "block", width: "100%" }}>
              <Box
                borderWidth="1px"
                borderColor="app.border"
                borderRadius="lg"
                overflow="hidden"
                bg="app.card"
                h="100%"
                display={{ base: "grid", md: "block" }}
                gridTemplateColumns={{ base: "72px minmax(0, 1fr)", md: "1fr" }}
                alignItems="stretch"
              >
                {collection.coverImageUrl ? (
                  <Image
                    src={collection.coverImageUrl}
                    alt={`${collection.name} cover`}
                    objectFit="cover"
                    w="100%"
                    h={{ base: "100%", md: "160px" }}
                    minH={{ base: "92px", md: "auto" }}
                  />
                ) : (
                  <Box h={{ base: "100%", md: "160px" }} minH={{ base: "92px", md: "auto" }} bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">
                    <Text color="app.muted" fontSize={{ base: "xs", md: "sm" }}>Collection</Text>
                  </Box>
                )}
                <Box p={{ base: 3, md: 4 }} minW={0}>
                  <HStack justify="space-between" align="start" gap={3} mb={1}>
                    <Heading as="h3" size="sm" lineClamp={2}>{collection.name}</Heading>
                    <Text display={{ base: "block", md: "none" }} fontSize="xs" color="app.muted" flexShrink={0}>
                      Open
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="app.muted" lineClamp={{ base: 1, md: 2 }} mb={{ base: 1, md: 2 }}>
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
