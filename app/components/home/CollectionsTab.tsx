import { Form, Link, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Heading,
  HStack,
  Image,
  Input,
  Link as ChakraLink,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import type { Collection } from "~/types";
import EmptyState from "~/components/EmptyState";
import { AnimatedItem } from "~/components/Animated";

export default function CollectionsTab({
  collections,
  selectedCollection,
  selectedCollectionAlbums,
  selectedCollectionArtists,
  buildHref,
  pendingAlbumId,
  pendingArtistId,
  pendingIntent,
  isSavingCollection,
  isDeletingCollection,
  actionError,
}: {
  collections: Collection[];
  selectedCollection: Collection | null;
  selectedCollectionAlbums: Collection["albums"];
  selectedCollectionArtists: Collection["artists"];
  buildHref: (overrides?: {
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
  }) => string;
  pendingAlbumId: number;
  pendingArtistId: number;
  pendingIntent: FormDataEntryValue | null | undefined;
  isSavingCollection: boolean;
  isDeletingCollection: boolean;
  actionError?: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [optimisticAlbumIds, setOptimisticAlbumIds] = useState<number[]>([]);
  const [optimisticArtistIds, setOptimisticArtistIds] = useState<number[]>([]);
  const updateFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const deleteFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const removeAlbumFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const removeArtistFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const activeError =
    updateFetcher.data?.error ??
    deleteFetcher.data?.error ??
    removeAlbumFetcher.data?.error ??
    removeArtistFetcher.data?.error ??
    actionError;

  useEffect(() => {
    if (deleteFetcher.data?.ok) {
      setConfirmOpen(false);
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    setOptimisticAlbumIds([]);
  }, [selectedCollectionAlbums]);

  useEffect(() => {
    setOptimisticArtistIds([]);
  }, [selectedCollectionArtists]);

  useEffect(() => {
    if (removeAlbumFetcher.data?.error) {
      const albumId = Number(removeAlbumFetcher.formData?.get("albumId"));
      if (albumId) {
        setOptimisticAlbumIds((current) => current.filter((id) => id !== albumId));
      }
    }
  }, [removeAlbumFetcher.data, removeAlbumFetcher.formData]);

  useEffect(() => {
    if (removeArtistFetcher.data?.error) {
      const artistId = Number(removeArtistFetcher.formData?.get("artistId"));
      if (artistId) {
        setOptimisticArtistIds((current) => current.filter((id) => id !== artistId));
      }
    }
  }, [removeArtistFetcher.data, removeArtistFetcher.formData]);

  const visibleAlbums = selectedCollectionAlbums.filter((album) => !optimisticAlbumIds.includes(album.id));
  const visibleArtists = selectedCollectionArtists.filter((artist) => !optimisticArtistIds.includes(artist.id));

  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
        <Heading as="h2" size="lg">Collections</Heading>
        <Text color="app.muted">{collections.length} total</Text>
      </HStack>

      {collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Create a collection from the sidebar, then use album or artist actions to organize what you want to revisit."
        />
      ) : (
        <>
          <Stack gap={2} mb={5} direction={{ base: "column", md: "row" }} wrap="wrap">
            {collections.map((collection) => (
              <ChakraLink key={collection.id} asChild>
                <Link prefetch="intent" to={buildHref({ tab: "collections", selectedCollectionId: collection.id })} viewTransition>
                <Button size="sm" variant={selectedCollection?.id === collection.id ? "solid" : "ghost"} w={{ base: "full", md: "auto" }}>
                  {collection.name}
                </Button>
                </Link>
              </ChakraLink>
            ))}
          </Stack>

          {selectedCollection ? (
            <Box>
              <Heading as="h3" size="md">{selectedCollection.name}</Heading>
              <Text color="app.muted" mb={4}>{selectedCollection.description || "No description"}</Text>

              <Box borderWidth="1px" borderColor="app.border" borderRadius="2xl" bg="app.panel" p={{ base: 4, md: 5 }} mb={6}>
                <Heading as="h4" size="sm" mb={3}>Manage Collection</Heading>
                <updateFetcher.Form method="post">
                  <input type="hidden" name="intent" value="update_collection" />
                  <input type="hidden" name="collectionId" value={selectedCollection.id} />
                  <input type="hidden" name="redirectTo" value={buildHref()} />
                  <Stack gap={3}>
                    <Input name="name" defaultValue={selectedCollection.name} required />
                    <Input name="description" defaultValue={selectedCollection.description ?? ""} placeholder="Description" />
                    <HStack align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }}>
                      <Button type="submit" colorScheme="blue" loading={updateFetcher.state !== "idle" || isSavingCollection} loadingText="Saving...">
                        Save Changes
                      </Button>
                    </HStack>
                  </Stack>
                </updateFetcher.Form>

                <Form method="post" style={{ marginTop: "1rem" }}>
                  <Button type="button" variant="outline" colorScheme="red" onClick={() => setConfirmOpen(true)}>
                    Delete Collection
                  </Button>
                </Form>

                {activeError ? <Text color="app.danger" mt={3}>{activeError}</Text> : null}
              </Box>

              <DialogRoot open={confirmOpen} onOpenChange={(details) => setConfirmOpen(details.open)} placement="center">
                <DialogBackdrop />
                <DialogPositioner>
                  <DialogContent mx={4} bg="app.panelSolid" borderWidth="1px" borderColor="app.border" borderRadius="2xl">
                    <DialogHeader>
                      <DialogTitle>Delete Collection</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                      <Text>
                        Delete "{selectedCollection.name}"? This removes the collection container, but leaves the underlying albums and artists in your library.
                      </Text>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                      <deleteFetcher.Form method="post">
                        <input type="hidden" name="intent" value="delete_collection" />
                        <input type="hidden" name="collectionId" value={selectedCollection.id} />
                        <input type="hidden" name="redirectTo" value={buildHref({ selectedCollectionId: null })} />
                        <Button type="submit" colorScheme="red" loading={deleteFetcher.state !== "idle" || isDeletingCollection} loadingText="Deleting...">
                          Delete
                        </Button>
                      </deleteFetcher.Form>
                    </DialogFooter>
                  </DialogContent>
                </DialogPositioner>
              </DialogRoot>

              <Heading as="h4" size="sm" mt={4} mb={2}>Albums</Heading>
              {visibleAlbums.length > 0 ? (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 4, md: 3 }} mb={5}>
                  {visibleAlbums.map((album, index) => (
                    <AnimatedItem key={album.id} index={index}>
                      <Box p={2} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="md">
                        {album.imageUrl ? (
                          <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="140px" mb={2} />
                        ) : (
                          <Box height="100px" bg="app.cardAlt" mb={2} display="flex" alignItems="center" justifyContent="center">Album</Box>
                        )}
                        <Text fontWeight="semibold">{album.name}</Text>
                        <Text fontSize="sm" color="app.muted" mb={2}>{album.artistNames.join(", ") || "Unknown artist"}</Text>
                        <Stack gap={2} direction={{ base: "column", sm: "row" }}>
                          <ChakraLink href={`spotify:album:${album.spotifyId}`}>
                            <Button size="xs">Open in App</Button>
                          </ChakraLink>
                          <removeAlbumFetcher.Form method="post">
                            <input type="hidden" name="intent" value="remove_album_from_collection" />
                            <input type="hidden" name="collectionId" value={selectedCollection.id} />
                            <input type="hidden" name="albumId" value={album.id} />
                            <input type="hidden" name="redirectTo" value={buildHref()} />
                            <Button
                              type="submit"
                              size="xs"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => setOptimisticAlbumIds((current) => (current.includes(album.id) ? current : [...current, album.id]))}
                              loading={
                                (removeAlbumFetcher.state !== "idle" &&
                                  Number(removeAlbumFetcher.formData?.get("albumId")) === album.id) ||
                                (pendingIntent === "remove_album_from_collection" && pendingAlbumId === album.id)
                              }
                              loadingText="Removing..."
                            >
                              Remove
                            </Button>
                          </removeAlbumFetcher.Form>
                        </Stack>
                      </Box>
                    </AnimatedItem>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="app.muted">No albums in this collection yet.</Text>
              )}

              <Heading as="h4" size="sm" mt={4} mb={2}>Artists</Heading>
              {visibleArtists.length > 0 ? (
                <Stack gap={2}>
                  {visibleArtists.map((artist, index) => (
                    <AnimatedItem key={artist.id} index={index}>
                      <Box p={2} bg="app.card" borderWidth="1px" borderColor="app.border" borderRadius="md">
                        <Text fontWeight="semibold">{artist.name}</Text>
                        <Text fontSize="sm" color="app.muted">{artist.genres.join(", ") || "No genres"}</Text>
                        <removeArtistFetcher.Form method="post">
                          <input type="hidden" name="intent" value="remove_artist_from_collection" />
                          <input type="hidden" name="collectionId" value={selectedCollection.id} />
                          <input type="hidden" name="artistId" value={artist.id} />
                          <input type="hidden" name="redirectTo" value={buildHref()} />
                          <Button
                            type="submit"
                            size="xs"
                            variant="outline"
                            colorScheme="red"
                            mt={2}
                            onClick={() => setOptimisticArtistIds((current) => (current.includes(artist.id) ? current : [...current, artist.id]))}
                            loading={
                              (removeArtistFetcher.state !== "idle" &&
                                Number(removeArtistFetcher.formData?.get("artistId")) === artist.id) ||
                              (pendingIntent === "remove_artist_from_collection" && pendingArtistId === artist.id)
                            }
                            loadingText="Removing..."
                          >
                            Remove
                          </Button>
                        </removeArtistFetcher.Form>
                      </Box>
                    </AnimatedItem>
                  ))}
                </Stack>
              ) : (
                <Text color="app.muted">No artists in this collection yet.</Text>
              )}
            </Box>
          ) : null}
        </>
      )}
    </>
  );
}
