import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { Box, Button, Heading, Image, Input, SimpleGrid, Stack, Text, Link as ChakraLink } from "@chakra-ui/react";
import type { SpotifySearchAlbum } from "~/types";
import { AnimatedItem } from "~/components/Animated";

export default function SpotifySearchSection({
  initialSearch,
  onAdd,
}: {
  initialSearch: string;
  onAdd: (album: SpotifySearchAlbum) => void;
}) {
  const fetcher = useFetcher<{ results: SpotifySearchAlbum[]; error?: string }>();
  const [query, setQuery] = useState(initialSearch);
  const isSearching = fetcher.state !== "idle";
  const results = fetcher.data?.results ?? [];

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      fetcher.load(`/api/spotify-search?q=${encodeURIComponent(query.trim())}`);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [fetcher, query]);

  const showResults = query.trim().length >= 2;
  const clearSearch = () => {
    setQuery("");
  };

  return (
    <Box p={{ base: 4, md: 5 }} borderRadius="2xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="md" backdropFilter="blur(18px)" mb={{ base: 5, md: 6 }}>
      <Stack gap={4}>
        <Box>
          <Heading as="h2" size="md" mb={1}>Search Spotify</Heading>
          <Text color="app.muted">Look up albums and add them directly to one of your collections.</Text>
        </Box>

        <fetcher.Form
          method="get"
          action="/api/spotify-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length < 2) {
              return;
            }
            fetcher.load(`/api/spotify-search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <Stack align="stretch" direction={{ base: "column", md: "row" }}>
            <Input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search Spotify albums"
              size="lg"
            />
            <Button type="submit" colorScheme="teal" size="lg" w={{ base: "full", md: "auto" }} loading={isSearching} loadingText="Searching...">
              Search
            </Button>
            {query ? (
              <Button variant="outline" size="lg" w={{ base: "full", md: "auto" }} onClick={clearSearch}>
                Clear
              </Button>
            ) : null}
          </Stack>
        </fetcher.Form>

        {showResults ? (
          <Box>
            <Text fontSize="sm" color="app.muted" mb={3}>
              Results for "{query.trim()}"
            </Text>
            {results.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={{ base: 4, md: 4 }}>
                {results.map((album, index) => (
                  <AnimatedItem key={album.spotifyId} index={index}>
                    <Box p={{ base: 4, md: 4 }} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="xl">
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
                        <Box height="160px" bg="app.cardAlt" borderRadius="lg" mb={3} display="flex" alignItems="center" justifyContent="center">
                          Album
                        </Box>
                      )}
                      <Text fontWeight="semibold">{album.name}</Text>
                      <Text fontSize="sm" color="app.muted" mb={3}>
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
                  </AnimatedItem>
                ))}
              </SimpleGrid>
            ) : (
              <Box borderWidth="1px" borderColor="app.border" borderRadius="2xl" bg="app.card" p={{ base: 5, md: 6 }}>
                <Stack gap={3} align="center" textAlign="center">
                  <Heading as="h3" size="sm">No Spotify albums found</Heading>
                  <Text color="app.muted">Try a broader title, remove punctuation, or search by artist and album together.</Text>
                  <Button variant="outline" onClick={clearSearch}>Clear Search</Button>
                </Stack>
              </Box>
            )}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
