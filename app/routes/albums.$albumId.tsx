import type { LoaderFunctionArgs } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { Box, Button, Heading, HStack, Image, Stack, Text } from "@chakra-ui/react";
import { getAlbumById } from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";
import { ensureValidAccessToken, fetchSpotifyAlbumDetails } from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const albumId = Number(params.albumId);

  if (!Number.isInteger(albumId) || albumId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const album = await getAlbumById(userId, albumId);
  if (!album) {
    throw data("Not found", { status: 404 });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw data("Missing user", { status: 400 });
  }

  const accessToken = await ensureValidAccessToken(user);
  const spotifyAlbum = await fetchSpotifyAlbumDetails(accessToken, album.spotifyId);

  return data({ album, spotifyAlbum });
}

export default function AlbumDetailRoute() {
  const { album, spotifyAlbum } = useLoaderData<typeof loader>();

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
      <Link to="/?tab=albums" prefetch="intent" viewTransition>Back to Albums</Link>

      <HStack mt={3} mb={4} align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4}>
        {spotifyAlbum.images?.[0]?.url ? (
          <Image src={spotifyAlbum.images[0].url} alt={`${spotifyAlbum.name} cover`} boxSize={{ base: "180px", md: "220px" }} borderRadius="lg" objectFit="cover" />
        ) : null}
        <Box>
          <Heading as="h1" size="lg">{spotifyAlbum.name}</Heading>
          <Text color="app.muted">{(spotifyAlbum.artists ?? []).map((artist: any) => artist.name).join(", ") || "Unknown artist"}</Text>
          <Text color="app.muted">
            {spotifyAlbum.release_date || "Unknown date"} • {spotifyAlbum.total_tracks ?? 0} tracks • Popularity {spotifyAlbum.popularity ?? "n/a"}
          </Text>
          <Text color="app.muted">Label: {spotifyAlbum.label || "Unknown label"}</Text>
          <HStack mt={2}>
            <a href={`spotify:album:${spotifyAlbum.id}`}>
              <Button size="sm">Open in Spotify App</Button>
            </a>
            {spotifyAlbum.external_urls?.spotify ? (
              <a href={spotifyAlbum.external_urls.spotify} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">Open on Spotify Web</Button>
              </a>
            ) : null}
          </HStack>
        </Box>
      </HStack>

      <Heading as="h2" size="md" mb={3}>Tracks</Heading>
      <Stack gap={2} mb={6}>
        {(spotifyAlbum.tracks?.items ?? []).map((track: any, index: number) => (
          <HStack key={track.id ?? `${track.name}-${index}`} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={3} justify="space-between">
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>{index + 1}. {track.name}</Text>
              <Text fontSize="sm" color="app.muted" lineClamp={1}>
                {(track.artists ?? []).map((artist: any) => artist.name).join(", ") || "Unknown artist"}
              </Text>
            </Box>
            <Text fontSize="sm" color="app.muted">{formatDuration(track.duration_ms ?? 0)}</Text>
          </HStack>
        ))}
      </Stack>

      <details>
        <summary>Raw Spotify album payload</summary>
        <Box as="pre" mt={2} p={3} borderWidth="1px" borderColor="app.border" borderRadius="md" bg="app.card" overflowX="auto" fontSize="xs">
          {JSON.stringify(spotifyAlbum, null, 2)}
        </Box>
      </details>

      <Text mt={6} color="app.muted" fontSize="sm">
        Library record: {album.name} ({album.releaseDate || "Unknown date"})
      </Text>
    </Box>
  );
}
