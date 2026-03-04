import { Form } from "react-router";
import { useState } from "react";
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

  return (
    <>
      <HStack justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} mb={{ base: 5, md: 4 }} gap={1}>
        <Heading as="h2" size="lg">Collections</Heading>
        <Text color="gray.500">{collections.length} total</Text>
      </HStack>

      {collections.length === 0 ? (
        <Text color="gray.500">Create a collection from the sidebar to get started.</Text>
      ) : (
        <>
          <Stack gap={2} mb={5} direction={{ base: "column", md: "row" }} wrap="wrap">
            {collections.map((collection) => (
              <ChakraLink key={collection.id} href={buildHref({ tab: "collections", selectedCollectionId: collection.id })}>
                <Button size="sm" variant={selectedCollection?.id === collection.id ? "solid" : "ghost"} w={{ base: "full", md: "auto" }}>
                  {collection.name}
                </Button>
              </ChakraLink>
            ))}
          </Stack>

          {selectedCollection ? (
            <Box>
              <Heading as="h3" size="md">{selectedCollection.name}</Heading>
              <Text color="gray.500" mb={4}>{selectedCollection.description || "No description"}</Text>

              <Box borderWidth="1px" borderRadius="xl" p={{ base: 4, md: 5 }} mb={6}>
                <Heading as="h4" size="sm" mb={3}>Manage Collection</Heading>
                <Form method="post">
                  <input type="hidden" name="intent" value="update_collection" />
                  <input type="hidden" name="collectionId" value={selectedCollection.id} />
                  <input type="hidden" name="redirectTo" value={buildHref()} />
                  <Stack gap={3}>
                    <Input name="name" defaultValue={selectedCollection.name} required />
                    <Input name="description" defaultValue={selectedCollection.description ?? ""} placeholder="Description" />
                    <HStack align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }}>
                      <Button type="submit" colorScheme="blue" loading={isSavingCollection} loadingText="Saving...">
                        Save Changes
                      </Button>
                    </HStack>
                  </Stack>
                </Form>

                <Form method="post" style={{ marginTop: "1rem" }}>
                  <Button type="button" variant="outline" colorScheme="red" onClick={() => setConfirmOpen(true)}>
                    Delete Collection
                  </Button>
                </Form>

                {actionError ? <Text color="red.500" mt={3}>{actionError}</Text> : null}
              </Box>

              <DialogRoot open={confirmOpen} onOpenChange={(details) => setConfirmOpen(details.open)} placement="center">
                <DialogBackdrop />
                <DialogPositioner>
                  <DialogContent mx={4}>
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
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete_collection" />
                        <input type="hidden" name="collectionId" value={selectedCollection.id} />
                        <input type="hidden" name="redirectTo" value={buildHref({ selectedCollectionId: null })} />
                        <Button type="submit" colorScheme="red" loading={isDeletingCollection} loadingText="Deleting...">
                          Delete
                        </Button>
                      </Form>
                    </DialogFooter>
                  </DialogContent>
                </DialogPositioner>
              </DialogRoot>

              <Heading as="h4" size="sm" mt={4} mb={2}>Albums</Heading>
              {selectedCollectionAlbums.length > 0 ? (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={{ base: 4, md: 3 }} mb={5}>
                  {selectedCollectionAlbums.map((album) => (
                    <Box key={album.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                      {album.imageUrl ? (
                        <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="140px" mb={2} />
                      ) : (
                        <Box height="100px" bg="gray.100" mb={2} display="flex" alignItems="center" justifyContent="center">Album</Box>
                      )}
                      <Text fontWeight="semibold">{album.name}</Text>
                      <Text fontSize="sm" color="gray.600" mb={2}>{album.artistNames.join(", ") || "Unknown artist"}</Text>
                      <Stack gap={2} direction={{ base: "column", sm: "row" }}>
                        <ChakraLink href={`spotify:album:${album.spotifyId}`}>
                          <Button size="xs">Open in App</Button>
                        </ChakraLink>
                        <Form method="post">
                          <input type="hidden" name="intent" value="remove_album_from_collection" />
                          <input type="hidden" name="collectionId" value={selectedCollection.id} />
                          <input type="hidden" name="albumId" value={album.id} />
                          <input type="hidden" name="redirectTo" value={buildHref()} />
                          <Button
                            type="submit"
                            size="xs"
                            variant="outline"
                            colorScheme="red"
                            loading={pendingIntent === "remove_album_from_collection" && pendingAlbumId === album.id}
                            loadingText="Removing..."
                          >
                            Remove
                          </Button>
                        </Form>
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500">No albums in this collection yet.</Text>
              )}

              <Heading as="h4" size="sm" mt={4} mb={2}>Artists</Heading>
              {selectedCollectionArtists.length > 0 ? (
                <Stack gap={2}>
                  {selectedCollectionArtists.map((artist) => (
                    <Box key={artist.id} p={2} bg="white" borderWidth="1px" borderRadius="md">
                      <Text fontWeight="semibold">{artist.name}</Text>
                      <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
                      <Form method="post">
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
                          loading={pendingIntent === "remove_artist_from_collection" && pendingArtistId === artist.id}
                          loadingText="Removing..."
                        >
                          Remove
                        </Button>
                      </Form>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Text color="gray.500">No artists in this collection yet.</Text>
              )}
            </Box>
          ) : null}
        </>
      )}
    </>
  );
}
