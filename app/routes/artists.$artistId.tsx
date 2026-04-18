import type { LoaderFunctionArgs } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { Box, Button, Heading, HStack, Image, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { getArtistById } from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";
import { ensureValidAccessToken, fetchSpotifyArtistAlbums, fetchSpotifyArtistDetails } from "~/utils/spotify.server";
import { getUserById } from "~/utils/user.server";

const PAGE_SIZE = 20;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const artistId = Number(params.artistId);
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? "1"));

  if (!Number.isInteger(artistId) || artistId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const artist = await getArtistById(userId, artistId);
  if (!artist) {
    throw data("Not found", { status: 404 });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw data("Missing user", { status: 400 });
  }

  const accessToken = await ensureValidAccessToken(user);
  const [spotifyArtist, artistAlbums] = await Promise.all([
    fetchSpotifyArtistDetails(accessToken, artist.spotifyId),
    fetchSpotifyArtistAlbums(accessToken, artist.spotifyId, page, PAGE_SIZE)
  ]);

  return data({ artist, spotifyArtist, artistAlbums });
}

export default function ArtistDetailRoute() {
  const { artist, spotifyArtist, artistAlbums } = useLoaderData<typeof loader>();
  const buildPageHref = (page: number) => `/artists/${artist.id}?page=${page}`;

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
      <Link to="/collections?tab=artists" prefetch="intent" viewTransition>Back to Artists</Link>

      <HStack mt={3} mb={4} align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4}>
        {spotifyArtist.images?.[0]?.url ? (
          <Image src={spotifyArtist.images[0].url} alt={`${spotifyArtist.name} photo`} boxSize={{ base: "96px", md: "120px" }} borderRadius="full" objectFit="cover" />
        ) : null}
        <Box>
          <Heading as="h1" size="lg">{spotifyArtist.name}</Heading>
          <Text color="app.muted">
            {spotifyArtist.followers?.total?.toLocaleString?.() ?? "0"} followers • Popularity {spotifyArtist.popularity ?? "n/a"}
          </Text>
          <Text color="app.muted">{(spotifyArtist.genres ?? []).join(", ") || "No genres"}</Text>
          <HStack mt={2}>
            <a href={`spotify:artist:${spotifyArtist.id}`}>
              <Button size="sm">Open in Spotify App</Button>
            </a>
            {spotifyArtist.external_urls?.spotify ? (
              <a href={spotifyArtist.external_urls.spotify} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">Open on Spotify Web</Button>
              </a>
            ) : null}
          </HStack>
        </Box>
      </HStack>

      <Heading as="h2" size="md" mb={3}>Albums and Releases</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4} mb={5}>
        {artistAlbums.items.map((album: any) => (
          <Box key={album.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" overflow="hidden">
            {album.images?.[0]?.url ? (
              <Image src={album.images[0].url} alt={`${album.name} cover`} objectFit="cover" w="100%" h="160px" />
            ) : (
              <Box h="160px" bg="app.cardAlt" />
            )}
            <Box p={3}>
              <Text fontWeight="semibold" lineClamp={1}>{album.name}</Text>
              <Text fontSize="sm" color="app.muted">{album.album_type} • {album.release_date || "Unknown date"}</Text>
              <HStack mt={2}>
                <a href={`spotify:album:${album.id}`}>
                  <Button size="xs">Play</Button>
                </a>
                <a href={album.external_urls?.spotify} target="_blank" rel="noreferrer">
                  <Button size="xs" variant="outline">Web</Button>
                </a>
              </HStack>
            </Box>
          </Box>
        ))}
      </SimpleGrid>

      <HStack justify="space-between" mb={6}>
        <Link to={buildPageHref(Math.max(1, artistAlbums.page - 1))} prefetch="intent" viewTransition>
          <Button variant="outline" disabled={artistAlbums.page <= 1}>Previous</Button>
        </Link>
        <Text color="app.muted">Page {artistAlbums.page} of {artistAlbums.totalPages}</Text>
        <Link to={buildPageHref(Math.min(artistAlbums.totalPages, artistAlbums.page + 1))} prefetch="intent" viewTransition>
          <Button variant="outline" disabled={artistAlbums.page >= artistAlbums.totalPages}>Next</Button>
        </Link>
      </HStack>

      <details>
        <summary>Raw Spotify artist payload</summary>
        <Box as="pre" mt={2} p={3} borderWidth="1px" borderColor="app.border" borderRadius="md" bg="app.card" overflowX="auto" fontSize="xs">
          {JSON.stringify(spotifyArtist, null, 2)}
        </Box>
      </details>
    </Box>
  );
}
