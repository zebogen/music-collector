import { Form, Link, useFetcher } from "react-router";
import { Box, Heading, Text, Stack, chakra, Input, Button } from "@chakra-ui/react";
import type { Collection, SpotifySearchAlbum } from "~/types";
import SpotifySearchSection from "~/components/SpotifySearchSection";

export default function Sidebar({
  filters,
  genres,
  selectedCollectionId,
  actionError,
  isFiltering,
  isCreatingCollection,
  isSavingCollection,
  isDeletingCollection,
  collections,
  selectedCollection,
  buildHref,
  onAddSpotifyAlbum,
}: {
  filters: any;
  genres: string[];
  selectedCollectionId: number | null;
  actionError?: string | null;
  isFiltering: boolean;
  isCreatingCollection: boolean;
  isSavingCollection: boolean;
  isDeletingCollection: boolean;
  collections: Collection[];
  selectedCollection: Collection | null;
  buildHref: (overrides?: {
    genre?: string;
    artist?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
    search?: string;
  }) => string;
  onAddSpotifyAlbum: (album: SpotifySearchAlbum) => void;
}) {
  const createFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const updateFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const deleteFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const isSubmittingCreate = createFetcher.state !== "idle";
  const createError = createFetcher.data?.error ?? actionError;
  const updateError = updateFetcher.data?.error ?? actionError;
  const deleteError = deleteFetcher.data?.error ?? actionError;

  return (
    <Stack gap={{ base: 4, md: 5 }} h="100%" p={{ base: 3, md: 4 }}>
      <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
        <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Filters</Heading>
        <Form method="get">
          <input type="hidden" name="tab" value={filters.tab} />
          <input type="hidden" name="artistsPage" value="1" />
          <input type="hidden" name="albumsPage" value="1" />
          <input type="hidden" name="playlistsPage" value="1" />
          {selectedCollectionId ? <input type="hidden" name="collection" value={String(selectedCollectionId)} /> : null}

          <Stack gap={2}>
            <chakra.select name="genre" defaultValue={filters.genre}>
              <option value="">All genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </chakra.select>
            <Input size="sm" name="artist" defaultValue={filters.artist} placeholder="Artist filter" />
            <Input size="sm" name="search" defaultValue={filters.search} placeholder="Search Spotify albums" />
            <Button type="submit" size={{ base: "md", md: "sm" }} loading={isFiltering} loadingText="Applying...">Apply</Button>
          </Stack>
        </Form>
      </Box>

      {filters.tab === "collections" ? (
        <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
          <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Collections</Heading>
          <Stack gap={1} maxH="220px" overflowY="auto" pr={1}>
            {collections.map((collection) => (
              <Link key={collection.id} to={buildHref({ tab: "collections", selectedCollectionId: collection.id })} prefetch="intent" viewTransition>
                <Button size={{ base: "md", md: "sm" }} px={3} variant={selectedCollection?.id === collection.id ? "solid" : "ghost"} w="full" justifyContent="flex-start">
                  {collection.name}
                </Button>
              </Link>
            ))}
          </Stack>
        </Box>
      ) : null}

      <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
        <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Create Collection</Heading>
        <createFetcher.Form method="post">
          <input type="hidden" name="intent" value="create_collection" />
          <Stack gap={2}>
            <Input size="sm" name="name" placeholder="Collection name" required />
            <Input size="sm" name="description" placeholder="Description" />
            <Button type="submit" size={{ base: "md", md: "sm" }} loading={isSubmittingCreate || isCreatingCollection} loadingText="Creating...">Create</Button>
            {createError ? <Text color="app.danger">{createError}</Text> : null}
          </Stack>
        </createFetcher.Form>
      </Box>

      {filters.tab === "collections" && selectedCollection ? (
        <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
          <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Edit Collection</Heading>
          <updateFetcher.Form method="post">
            <input type="hidden" name="intent" value="update_collection" />
            <input type="hidden" name="collectionId" value={selectedCollection.id} />
            <input type="hidden" name="redirectTo" value={buildHref()} />
            <Stack gap={2}>
              <Input size="sm" name="name" defaultValue={selectedCollection.name} required />
              <Input size="sm" name="description" defaultValue={selectedCollection.description ?? ""} placeholder="Description" />
              <Button type="submit" size={{ base: "md", md: "sm" }} loading={updateFetcher.state !== "idle" || isSavingCollection} loadingText="Saving...">
                Save
              </Button>
              {updateError ? <Text color="app.danger">{updateError}</Text> : null}
            </Stack>
          </updateFetcher.Form>
          <deleteFetcher.Form method="post" style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="intent" value="delete_collection" />
            <input type="hidden" name="collectionId" value={selectedCollection.id} />
            <input type="hidden" name="redirectTo" value={buildHref({ selectedCollectionId: null })} />
            <Button type="submit" size={{ base: "md", md: "sm" }} variant="outline" loading={deleteFetcher.state !== "idle" || isDeletingCollection} loadingText="Deleting...">
              Delete Collection
            </Button>
            {deleteError ? <Text color="app.danger" mt={2}>{deleteError}</Text> : null}
          </deleteFetcher.Form>
        </Box>
      ) : null}

      {filters.tab === "collections" ? (
        <SpotifySearchSection compact initialSearch={filters.search} onAdd={onAddSpotifyAlbum} />
      ) : null}
    </Stack>
  );
}
