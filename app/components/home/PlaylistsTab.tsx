import { Link } from "react-router";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import type { Playlist } from "~/types";
import PaginationControls from "~/components/PaginationControls";
import EmptyState from "~/components/EmptyState";
import { AnimatedItem } from "~/components/Animated";

export default function PlaylistsTab({
  playlists,
  totalItems,
  page,
  totalPages,
  buildHref,
  hasPlaylists,
}: {
  playlists: Playlist[];
  totalItems: number;
  page: number;
  totalPages: number;
  buildHref: (overrides?: {
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  hasPlaylists: boolean;
}) {
  return (
    <>
      <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} mb={{ base: 5, md: 5 }} gap={1}>
        <Heading as="h2" size="md">Playlists</Heading>
        <Text color="app.muted">{totalItems} total</Text>
      </Stack>

      {hasPlaylists ? (
        <>
          <Stack gap={4} mb={5}>
            {playlists.map((playlist, index) => (
              <AnimatedItem key={playlist.id} index={index}>
                <Link to={`/playlists/${playlist.id}`} prefetch="intent" viewTransition>
                  <Box p={{ base: 4, md: 3 }} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="xl">
                    <Heading as="h3" size="sm">{playlist.name}</Heading>
                    <Text fontSize="sm" color="app.muted" mt={1}>{playlist.tracksTotal} tracks</Text>
                  </Box>
                </Link>
              </AnimatedItem>
            ))}
          </Stack>

          <PaginationControls
            list="playlists"
            currentPage={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      ) : (
        <EmptyState
          title="No playlists yet"
          description="Create a playlist in Spotify or sync again after adding some. This view only shows playlists tied to your account."
        />
      )}
    </>
  );
}
