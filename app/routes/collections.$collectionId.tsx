import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { Box, Button, Heading, HStack, Image, SimpleGrid, Stack, Text, chakra } from "@chakra-ui/react";
import { getCollectionById, removeAlbumFromCollection, removeArtistFromCollection } from "~/utils/library.server";
import { requireUserId } from "~/utils/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const collectionId = Number(params.collectionId);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const collection = await getCollectionById(userId, collectionId);
  if (!collection) {
    throw data("Not found", { status: 404 });
  }

  return data({ collection });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const collectionId = Number(params.collectionId);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    throw data("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "remove_album") {
    const albumId = Number(formData.get("albumId"));
    if (Number.isInteger(albumId) && albumId > 0) {
      await removeAlbumFromCollection({ userId, collectionId, albumId });
      return data({ ok: true, removedAlbumIds: [albumId], removedArtistIds: [] });
    }
    return data({ error: "Invalid album ID" }, { status: 400 });
  }

  if (intent === "remove_artist") {
    const artistId = Number(formData.get("artistId"));
    if (Number.isInteger(artistId) && artistId > 0) {
      await removeArtistFromCollection({ userId, collectionId, artistId });
      return data({ ok: true, removedAlbumIds: [], removedArtistIds: [artistId] });
    }
    return data({ error: "Invalid artist ID" }, { status: 400 });
  }

  if (intent === "bulk_remove") {
    const rawAlbumIds = String(formData.get("albumIds") ?? "[]");
    const rawArtistIds = String(formData.get("artistIds") ?? "[]");
    const albumIds = (JSON.parse(rawAlbumIds) as unknown[]).map(Number).filter((id) => Number.isInteger(id) && id > 0);
    const artistIds = (JSON.parse(rawArtistIds) as unknown[]).map(Number).filter((id) => Number.isInteger(id) && id > 0);

    await Promise.all([
      ...albumIds.map((albumId) => removeAlbumFromCollection({ userId, collectionId, albumId })),
      ...artistIds.map((artistId) => removeArtistFromCollection({ userId, collectionId, artistId }))
    ]);

    return data({ ok: true, removedAlbumIds: albumIds, removedArtistIds: artistIds });
  }

  return data({ error: "Unsupported action" }, { status: 400 });
}

export default function CollectionDetailRoute() {
  const { collection } = useLoaderData<typeof loader>();
  const mutationFetcher = useFetcher<{ ok?: boolean; error?: string; removedAlbumIds?: number[]; removedArtistIds?: number[] }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<number[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<number[]>([]);
  const [optimisticRemovedAlbumIds, setOptimisticRemovedAlbumIds] = useState<number[]>([]);
  const [optimisticRemovedArtistIds, setOptimisticRemovedArtistIds] = useState<number[]>([]);
  const albumSort = searchParams.get("albumSort") ?? "name-asc";
  const artistSort = searchParams.get("artistSort") ?? "name-asc";

  useEffect(() => {
    if (mutationFetcher.data?.error) {
      setOptimisticRemovedAlbumIds([]);
      setOptimisticRemovedArtistIds([]);
    }
  }, [mutationFetcher.data]);

  const albums = useMemo(() => {
    const visible = collection.albums.filter((album) => !optimisticRemovedAlbumIds.includes(album.id));
    if (albumSort === "name-desc") {
      return [...visible].sort((a, b) => b.name.localeCompare(a.name));
    }
    if (albumSort === "release-desc") {
      return [...visible].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    }
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [collection.albums, optimisticRemovedAlbumIds, albumSort]);

  const artists = useMemo(() => {
    const visible = collection.artists.filter((artist) => !optimisticRemovedArtistIds.includes(artist.id));
    if (artistSort === "name-desc") {
      return [...visible].sort((a, b) => b.name.localeCompare(a.name));
    }
    if (artistSort === "genres-desc") {
      return [...visible].sort((a, b) => b.genres.length - a.genres.length || a.name.localeCompare(b.name));
    }
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [collection.artists, optimisticRemovedArtistIds, artistSort]);

  function updateSort(key: "albumSort" | "artistSort", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  function toggleAlbumSelection(albumId: number) {
    setSelectedAlbumIds((prev) => (prev.includes(albumId) ? prev.filter((id) => id !== albumId) : [...prev, albumId]));
  }

  function toggleArtistSelection(artistId: number) {
    setSelectedArtistIds((prev) => (prev.includes(artistId) ? prev.filter((id) => id !== artistId) : [...prev, artistId]));
  }

  function removeOneAlbum(albumId: number) {
    setOptimisticRemovedAlbumIds((prev) => (prev.includes(albumId) ? prev : [...prev, albumId]));
    mutationFetcher.submit({ intent: "remove_album", albumId: String(albumId) }, { method: "post" });
  }

  function removeOneArtist(artistId: number) {
    setOptimisticRemovedArtistIds((prev) => (prev.includes(artistId) ? prev : [...prev, artistId]));
    mutationFetcher.submit({ intent: "remove_artist", artistId: String(artistId) }, { method: "post" });
  }

  function removeSelected() {
    if (selectedAlbumIds.length === 0 && selectedArtistIds.length === 0) {
      return;
    }
    setOptimisticRemovedAlbumIds((prev) => [...new Set([...prev, ...selectedAlbumIds])]);
    setOptimisticRemovedArtistIds((prev) => [...new Set([...prev, ...selectedArtistIds])]);
    mutationFetcher.submit(
      {
        intent: "bulk_remove",
        albumIds: JSON.stringify(selectedAlbumIds),
        artistIds: JSON.stringify(selectedArtistIds)
      },
      { method: "post" }
    );
    setSelectedAlbumIds([]);
    setSelectedArtistIds([]);
  }

  return (
    <Box px={{ base: 3, md: 6, lg: 8 }} py={{ base: 4, md: 5 }}>
      <Link to="/collections?tab=collections" prefetch="intent" viewTransition>Back to Collections</Link>
      <Heading as="h1" size="lg" mt={3}>{collection.name}</Heading>
      <Text color="app.muted" mb={5}>{collection.description || "No description"}</Text>

      <Stack direction={{ base: "column", md: "row" }} justify="space-between" mb={4} align={{ base: "stretch", md: "center" }}>
        <Text color="app.muted">
          {selectedAlbumIds.length + selectedArtistIds.length} selected
        </Text>
        <Button
          size={{ base: "md", md: "sm" }}
          colorScheme="red"
          variant="outline"
          onClick={removeSelected}
          loading={mutationFetcher.state !== "idle"}
          disabled={selectedAlbumIds.length + selectedArtistIds.length === 0}
        >
          Remove Selected
        </Button>
      </Stack>

      <Heading as="h2" size="md" mb={3}>Albums</Heading>
      <HStack mb={3}>
        <Text color="app.muted" fontSize="sm">Sort</Text>
        <chakra.select value={albumSort} onChange={(event) => updateSort("albumSort", event.currentTarget.value)} style={{ maxWidth: "220px" }}>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="release-desc">Newest release</option>
        </chakra.select>
      </HStack>
      {albums.length > 0 ? (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4} mb={6}>
          {albums.map((album) => (
            <Box key={album.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" overflow="hidden">
              {album.imageUrl ? (
                <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" w="100%" h="160px" />
              ) : (
                <Box h="160px" bg="app.cardAlt" display="flex" alignItems="center" justifyContent="center">Album</Box>
              )}
              <Box p={3}>
                <HStack justify="space-between" mb={2}>
                  <chakra.input
                    type="checkbox"
                    checked={selectedAlbumIds.includes(album.id)}
                    onChange={() => toggleAlbumSelection(album.id)}
                    aria-label={`Select album ${album.name}`}
                  />
                  <Button size="xs" variant="ghost" colorScheme="red" onClick={() => removeOneAlbum(album.id)}>
                    Remove
                  </Button>
                </HStack>
                <Text fontWeight="semibold">{album.name}</Text>
                <Text fontSize="sm" color="app.muted">{album.artistNames.join(", ") || "Unknown artist"}</Text>
                <Link to={`/albums/${album.id}`} prefetch="intent" viewTransition>
                  <Button size="xs" mt={2} variant="outline">Details</Button>
                </Link>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <Text color="app.muted" mb={6}>No albums in this collection.</Text>
      )}

      <Heading as="h2" size="md" mb={3}>Artists</Heading>
      <HStack mb={3}>
        <Text color="app.muted" fontSize="sm">Sort</Text>
        <chakra.select value={artistSort} onChange={(event) => updateSort("artistSort", event.currentTarget.value)} style={{ maxWidth: "220px" }}>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="genres-desc">Most genres</option>
        </chakra.select>
      </HStack>
      {artists.length > 0 ? (
        <Stack gap={2}>
          {artists.map((artist) => (
            <Box key={artist.id} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.card" p={3}>
              <HStack justify="space-between" mb={2}>
                <chakra.input
                  type="checkbox"
                  checked={selectedArtistIds.includes(artist.id)}
                  onChange={() => toggleArtistSelection(artist.id)}
                  aria-label={`Select artist ${artist.name}`}
                />
                <Button size="xs" variant="ghost" colorScheme="red" onClick={() => removeOneArtist(artist.id)}>
                  Remove
                </Button>
              </HStack>
              <Text fontWeight="semibold">{artist.name}</Text>
              <Text fontSize="sm" color="app.muted">{artist.genres.join(", ") || "No genres"}</Text>
              <Link to={`/artists/${artist.id}`} prefetch="intent" viewTransition>
                <Button size="xs" mt={2} variant="outline">Details</Button>
              </Link>
            </Box>
          ))}
        </Stack>
      ) : (
        <Text color="app.muted">No artists in this collection.</Text>
      )}

      {mutationFetcher.data?.error ? <Text color="app.danger" mt={3}>{mutationFetcher.data.error}</Text> : null}
    </Box>
  );
}
