import type { LoaderFunctionArgs } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { Box, Heading, HStack, Image, Stack, Text } from "@chakra-ui/react";
import PaginationControls from "~/components/PaginationControls";
import { getPlaylistById } from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";
import { ensureValidAccessToken, fetchSpotifyPlaylistTracks } from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

const PAGE_SIZE = 20;

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const playlistId = Number(params.playlistId);
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? "1"));

  if (!Number.isInteger(playlistId) || playlistId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const playlist = await getPlaylistById(userId, playlistId);
  if (!playlist) {
    throw data("Not found", { status: 404 });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw data("Missing user", { status: 400 });
  }

  const accessToken = await ensureValidAccessToken(user);
  const tracksPage = await fetchSpotifyPlaylistTracks(accessToken, playlist.spotifyId, page, PAGE_SIZE);

  return data({ playlist, tracksPage });
}

export default function PlaylistDetailRoute() {
  const { playlist, tracksPage } = useLoaderData<typeof loader>();

  const buildHref = (page: number) => `/playlists/${playlist.id}?page=${page}`;

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
      <Link to="/collections?tab=playlists" prefetch="intent" viewTransition>Back to Playlists</Link>
      <Heading as="h1" size="lg" mt={3}>{playlist.name}</Heading>
      <Text color="app.muted" mb={5}>{playlist.description || "No description"}</Text>

      <Stack gap={2} mb={5}>
        {tracksPage.items.map((track) => (
          <HStack key={track.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={3} gap={3} align="center">
            {track.albumImageUrl ? (
              <Image src={track.albumImageUrl} alt={`${track.albumName} cover`} boxSize="52px" objectFit="cover" borderRadius="md" />
            ) : (
              <Box boxSize="52px" bg="app.cardAlt" borderRadius="md" />
            )}
            <Box minW={0} flex="1">
              <Text fontWeight="semibold" lineClamp={1}>{track.name}</Text>
              <Text fontSize="sm" color="app.muted" lineClamp={1}>
                {track.artists.join(", ") || "Unknown artist"} / {track.albumName}
              </Text>
            </Box>
            <Text fontSize="sm" color="app.muted">{formatDuration(track.durationMs)}</Text>
          </HStack>
        ))}
      </Stack>

      <PaginationControls
        list="playlists"
        currentPage={tracksPage.page}
        totalPages={tracksPage.totalPages}
        buildHref={(overrides) => buildHref(overrides?.playlistsPage ?? tracksPage.page)}
      />
    </Box>
  );
}
