import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import type { Playlist } from "~/types";
import PaginationControls from "~/components/PaginationControls";
import EmptyState from "~/components/EmptyState";

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
    search?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  hasPlaylists: boolean;
}) {
  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
        <Heading as="h2" size="lg">Playlists</Heading>
        <Text color="gray.500">{totalItems} total</Text>
      </HStack>

      {hasPlaylists ? (
        <>
          <Stack gap={4} mb={5}>
            {playlists.map((playlist) => (
              <Box key={playlist.id} p={{ base: 4, md: 3 }} bg="white" borderWidth="1px" borderRadius="xl">
                <Heading as="h3" size="sm">{playlist.name}</Heading>
                <Text fontSize="sm" color="gray.600" mt={1}>{playlist.tracksTotal} tracks</Text>
              </Box>
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
