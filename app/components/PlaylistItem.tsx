import type { Playlist as PlaylistType } from "~/types";
import { Box, Heading, Text } from "@chakra-ui/react";

export default function PlaylistItem({ playlist }: { playlist: PlaylistType }) {
  return (
    <Box p={3} bg="white" borderWidth="1px" borderRadius="md">
      <Heading as="h3" size="sm">{playlist.name}</Heading>
      <Text fontSize="sm" color="gray.600">{playlist.tracksTotal} tracks</Text>
    </Box>
  );
}
