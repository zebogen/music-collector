import { Form, useFetcher, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Box, Heading, Text, Stack, chakra, Input, Button } from "@chakra-ui/react";
import type { Collection } from "~/types";

type FilterPreset = {
  id: string;
  name: string;
  genre: string;
  artist: string;
};

const FILTER_PRESETS_KEY = "music-collector.filter-presets.v1";

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
  const navigate = useNavigate();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetsReady, setPresetsReady] = useState(false);
  const [mobileSections, setMobileSections] = useState({
    filters: false,
    presets: false,
    create: false
  });
  const isSubmittingCreate = createFetcher.state !== "idle";
  const createError = createFetcher.data?.error ?? actionError;
  const updateError = updateFetcher.data?.error ?? actionError;
  const deleteError = deleteFetcher.data?.error ?? actionError;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILTER_PRESETS_KEY);
      if (!raw) {
        setPresetsReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as FilterPreset[];
      setPresets(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPresets([]);
    } finally {
      setPresetsReady(true);
    }
  }, []);

  function persistPresets(next: FilterPreset[]) {
    setPresets(next);
    window.localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(next));
  }

  function saveCurrentFiltersAsPreset() {
    const name = window.prompt("Preset name");
    if (!name) {
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    const next: FilterPreset[] = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmedName,
        genre: filters.genre ?? "",
        artist: filters.artist ?? ""
      },
      ...presets
    ].slice(0, 12);
    persistPresets(next);
  }

  function applyPreset(preset: FilterPreset) {
    navigate(
      buildHref({
        genre: preset.genre,
        artist: preset.artist,
        artistsPage: 1,
        albumsPage: 1,
        playlistsPage: 1,
        selectedAlbumId: null
      })
    );
  }

  function removePreset(id: string) {
    persistPresets(presets.filter((preset) => preset.id !== id));
  }

  function toggleMobileSection(section: keyof typeof mobileSections) {
    setMobileSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <Stack gap={{ base: 4, md: 5 }} h="100%" p={{ base: 3, md: 4 }}>
      <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
        <Button
          display={{ base: "flex", lg: "none" }}
          variant="ghost"
          justifyContent="space-between"
          w="full"
          px={0}
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

      {presetsReady ? (
        <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
          <Button
            display={{ base: "flex", lg: "none" }}
            variant="ghost"
            justifyContent="space-between"
            w="full"
            px={0}
            mb={2}
            onClick={() => toggleMobileSection("presets")}
          >
            <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">Saved Filters</Heading>
            <Text color="app.muted">{mobileSections.presets ? "Hide" : "Show"}</Text>
          </Button>
          <Heading display={{ base: "none", lg: "block" }} as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Saved Filters</Heading>
          <Box display={{ base: mobileSections.presets ? "block" : "none", lg: "block" }}>
            <Stack gap={2}>
              <Button size={{ base: "md", md: "sm" }} variant="outline" onClick={saveCurrentFiltersAsPreset}>
                Save Current Filters
              </Button>
              {presets.length > 0 ? (
                presets.map((preset) => (
                  <Stack key={preset.id} direction="row" gap={2}>
                    <Button size={{ base: "md", md: "sm" }} variant="ghost" onClick={() => applyPreset(preset)} flex="1" justifyContent="flex-start">
                      {preset.name}
                    </Button>
                    <Button
                      size={{ base: "md", md: "sm" }}
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removePreset(preset.id)}
                      aria-label={`Delete preset ${preset.name}`}
                    >
                      Delete
                    </Button>
                  </Stack>
                ))
              ) : (
                <Text color="app.muted" fontSize="sm">No saved presets yet.</Text>
              )}
            </Stack>
          </Box>
        </Box>
      ) : null}

      <Box pb={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="app.border">
        <Button
          display={{ base: "flex", lg: "none" }}
          variant="ghost"
          justifyContent="space-between"
          w="full"
          px={0}
          mb={2}
          onClick={() => toggleMobileSection("create")}
        >
          <Heading as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">Create Collection</Heading>
          <Text color="app.muted">{mobileSections.create ? "Hide" : "Show"}</Text>
        </Button>
        <Heading display={{ base: "none", lg: "block" }} as="h3" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>Create Collection</Heading>
        <Box display={{ base: mobileSections.create ? "block" : "none", lg: "block" }}>
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
      </Box>

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
