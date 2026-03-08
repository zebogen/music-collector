import { useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";
import { Box, Button, Heading, Image, Input, SimpleGrid, Stack, Text, Link as ChakraLink } from "@chakra-ui/react";
import type { SpotifySearchAlbum } from "~/types";
import { AnimatedItem } from "~/components/Animated";

export default function SpotifySearchSection({
  initialSearch,
  onAdd,
  compact = false,
}: {
  initialSearch: string;
  onAdd: (album: SpotifySearchAlbum) => void;
  compact?: boolean;
}) {
  const fetcher = useFetcher<{ results: SpotifySearchAlbum[]; error?: string }>();
  const [query, setQuery] = useState(initialSearch);
  const [results, setResults] = useState<SpotifySearchAlbum[]>([]);
  const lastRequestedQueryRef = useRef("");
  const isSearching = fetcher.state !== "idle";

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (fetcher.data?.results) {
      setResults(fetcher.data.results);
    }
  }, [fetcher.data]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      lastRequestedQueryRef.current = "";
      return;
    }
    if (trimmed === lastRequestedQueryRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastRequestedQueryRef.current = trimmed;
      fetcher.load(`/api/spotify-search?q=${encodeURIComponent(trimmed)}`);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const showResults = query.trim().length >= 2;
  const clearSearch = () => {
    setQuery("");
    setResults([]);
    lastRequestedQueryRef.current = "";
  };

  return (
    <Box p={compact ? { base: 2, md: 2 } : { base: 4, md: 5 }} borderRadius={compact ? "md" : "2xl"} bg={compact ? "transparent" : "app.panel"} borderWidth={compact ? "0" : "1px"} borderColor="app.border" boxShadow={compact ? "none" : "md"} backdropFilter={compact ? "none" : "blur(18px)"} mb={compact ? 0 : { base: 5, md: 6 }}>
      <Stack gap={compact ? 2 : 4}>
        <Box>
          <Heading as="h2" size={compact ? "sm" : "md"} mb={1}>Search Spotify</Heading>
          {compact ? null : <Text color="app.muted">Look up albums and add them directly to one of your collections.</Text>}
        </Box>

        <fetcher.Form
          method="get"
          action="/api/spotify-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length < 2) {
              return;
            }
            // The debounced effect above performs the request.
          }}
        >
          <Stack align="stretch" direction={{ base: "column", md: "row" }}>
            <Input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search Spotify albums"
              size={compact ? "sm" : "lg"}
            />
            <Button type="submit" colorScheme="teal" size={compact ? "sm" : "lg"} w={{ base: "full", md: "auto" }} loading={isSearching} loadingText="Searching...">
              Search
            </Button>
            {query ? (
              <Button variant="outline" size={compact ? "sm" : "lg"} w={{ base: "full", md: "auto" }} onClick={clearSearch}>
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
              <SimpleGrid columns={compact ? { base: 1 } : { base: 1, md: 2, xl: 3 }} gap={{ base: 3, md: 4 }}>
                {results.map((album) => (
                  <Box key={album.spotifyId}>
                    <Box p={{ base: 3, md: 3 }} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="lg">
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
                  </Box>
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
