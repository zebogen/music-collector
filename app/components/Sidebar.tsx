import { Form, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Stack,
  chakra,
  Input,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from "@chakra-ui/react";
import type { Collection } from "~/types";

export default function Sidebar({
  filters,
  genres,
  selectedCollectionId,
  actionError,
  isFiltering,
  isCreatingCollection,
  isSavingCollection,
  isDeletingCollection,
  selectedCollection,
  buildHref,
  placement = "sidebar",
}: {
  filters: any;
  genres: string[];
  selectedCollectionId: number | null;
  actionError?: string | null;
  isFiltering: boolean;
  isCreatingCollection: boolean;
  isSavingCollection: boolean;
  isDeletingCollection: boolean;
  selectedCollection: Collection | null;
  placement?: "sidebar" | "inline";
  buildHref: (overrides?: {
    genre?: string;
    artist?: string;
    tab?: "albums" | "artists" | "playlists" | "collections";
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
    selectedCollectionId?: number | null;
  }) => string;
}) {
  const createFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const updateFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const deleteFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const [mobileSections, setMobileSections] = useState({
    filters: false
  });
  const isInline = placement === "inline";
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const isSubmittingCreate = createFetcher.state !== "idle";
  const createError = createFetcher.data?.error ?? actionError;
  const updateError = updateFetcher.data?.error ?? actionError;
  const deleteError = deleteFetcher.data?.error ?? actionError;
  const showLibraryFilters = filters.tab !== "collections";
  const showCreateCollection = filters.tab === "collections";

  useEffect(() => {
    if (createFetcher.data?.ok) {
      setCreateDialogOpen(false);
    }
  }, [createFetcher.data]);

  function toggleMobileSection(section: keyof typeof mobileSections) {
    setMobileSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <Stack gap={isInline ? 3 : { base: 4, md: 5 }} h={isInline ? "auto" : "100%"} p={isInline ? 0 : { base: 3, md: 4 }}>
      {showLibraryFilters ? (
      <Box pb={isInline ? 0 : { base: 3, md: 4 }} borderBottomWidth={isInline ? "0" : "1px"} borderColor="app.border">
        <Button
          display={{ base: "flex", lg: isInline ? "flex" : "none" }}
          variant="ghost"
          justifyContent="space-between"
          w="full"
          px={isInline ? 3 : 0}
          minH="40px"
          borderWidth={isInline ? "1px" : "0"}
          borderColor="app.border"
          borderRadius={isInline ? "md" : "none"}
          mb={2}
          onClick={() => toggleMobileSection("filters")}
        >
          <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">Filters</Heading>
          <Text color="app.muted">{mobileSections.filters ? "Hide" : "Show"}</Text>
        </Button>
        <Heading display={{ base: "none", lg: "block" }} as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Filters</Heading>
        <Box display={{ base: mobileSections.filters ? "block" : "none", lg: "block" }}>
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
              <Button type="submit" size={{ base: "md", md: "sm" }} loading={isFiltering} loadingText="Applying...">Apply</Button>
            </Stack>
          </Form>
        </Box>
      </Box>
      ) : null}

      {showCreateCollection ? (
        <Box pb={isInline ? 0 : { base: 3, md: 4 }} borderBottomWidth={isInline ? "0" : "1px"} borderColor="app.border">
          {isInline ? (
            <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
              Create Collection
            </Button>
          ) : (
            <Stack direction="row" justify="space-between" align="center" gap={3}>
              <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">Collections</Heading>
              <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                Create
              </Button>
            </Stack>
          )}
        </Box>
      ) : null}

      <DialogRoot
        open={createDialogOpen}
        onOpenChange={(details) => setCreateDialogOpen(details.open)}
        placement="center"
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent mx={4} bg="app.panelSolid" borderWidth="1px" borderColor="app.border" borderRadius="2xl">
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody>
              <createFetcher.Form method="post">
                <input type="hidden" name="intent" value="create_collection" />
                <Stack gap={3}>
                  <Input size="md" name="name" placeholder="Collection name" required />
                  <Input size="md" name="description" placeholder="Description" />
                  {createError ? <Text color="app.danger">{createError}</Text> : null}
                  <DialogFooter px={0} pt={2} display="flex" flexDirection={{ base: "column-reverse", sm: "row" }} gap={2}>
                    <Button type="button" variant="outline" w={{ base: "full", sm: "auto" }} onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" w={{ base: "full", sm: "auto" }} loading={isSubmittingCreate || isCreatingCollection} loadingText="Creating...">
                      Create
                    </Button>
                  </DialogFooter>
                </Stack>
              </createFetcher.Form>
            </DialogBody>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {selectedCollection ? (
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
    </Stack>
  );
}
