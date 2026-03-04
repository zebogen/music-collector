import { Form } from "react-router";
import { Box, Button, Heading, Image, Input, SimpleGrid, Stack, Text, Link as ChakraLink } from "@chakra-ui/react";
import type { SpotifySearchAlbum } from "~/types";
import EmptyState from "~/components/EmptyState";

export default function SpotifySearchSection({
  search,
  results,
  hiddenFields,
  isSearching,
  clearHref,
  onAdd,
}: {
  search: string;
  results: SpotifySearchAlbum[];
  hiddenFields: Record<string, string>;
  isSearching: boolean;
  clearHref: string;
  onAdd: (album: SpotifySearchAlbum) => void;
}) {
  return (
    <Box p={{ base: 4, md: 5 }} borderRadius="xl" bg="white" boxShadow="sm" mb={{ base: 5, md: 6 }}>
      <Stack gap={4}>
        <Box>
          <Heading as="h2" size="md" mb={1}>Search Spotify</Heading>
          <Text color="gray.500">Look up albums and add them directly to one of your collections.</Text>
        </Box>

        <Form method="get">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Stack align="stretch" direction={{ base: "column", md: "row" }}>
            <Input name="search" defaultValue={search} placeholder="Search Spotify albums" size="lg" />
            <Button type="submit" colorScheme="teal" size="lg" w={{ base: "full", md: "auto" }} loading={isSearching} loadingText="Searching...">
              Search
            </Button>
            {search ? (
              <ChakraLink href={clearHref}>
                <Button variant="outline" size="lg" w={{ base: "full", md: "auto" }}>
                  Clear
                </Button>
              </ChakraLink>
            ) : null}
          </Stack>
        </Form>

        {search ? (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Results for "{search}"
            </Text>
            {results.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={{ base: 4, md: 4 }}>
                {results.map((album) => (
                  <Box key={album.spotifyId} p={{ base: 4, md: 4 }} bg="gray.50" borderWidth="1px" borderRadius="xl">
                    {album.imageUrl ? (
                      <Image
                        src={album.imageUrl}
                        alt={`${album.name} cover`}
                        objectFit="cover"
                        width="100%"
                        maxH="200px"
                        borderRadius="lg"
                        mb={3}
                      />
                    ) : (
                      <Box height="160px" bg="gray.100" borderRadius="lg" mb={3} display="flex" alignItems="center" justifyContent="center">
                        Album
                      </Box>
                    )}
                    <Text fontWeight="semibold">{album.name}</Text>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      {album.artistNames.join(", ") || "Unknown artist"}
                    </Text>
                    <Stack gap={2} mb={3} direction={{ base: "column", sm: "row" }}>
                      <ChakraLink href={`spotify:album:${album.spotifyId}`}>
                        <Button size="sm">Open in Spotify App</Button>
                      </ChakraLink>
                      <Button size="sm" colorScheme="teal" onClick={() => onAdd(album)}>
                        Add to Collection
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <EmptyState
                title="No Spotify albums found"
                description="Try a broader title, remove punctuation, or search by artist and album together."
                actionLabel="Clear Search"
                actionHref={clearHref}
              />
            )}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
