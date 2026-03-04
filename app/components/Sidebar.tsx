import { Form, useFetcher } from "react-router";
import { Box, Heading, Text, Stack, chakra, Input, Button } from "@chakra-ui/react";

export default function Sidebar({
  filters,
  genres,
  selectedCollectionId,
  actionError,
  isFiltering,
  isCreatingCollection
}: {
  filters: any;
  genres: string[];
  selectedCollectionId: number | null;
  actionError?: string | null;
  isFiltering: boolean;
  isCreatingCollection: boolean;
}) {
  const createFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const isSubmittingCreate = createFetcher.state !== "idle";
  const createError = createFetcher.data?.error ?? actionError;

  return (
    <Stack gap={6}>
      {filters.tab !== "collections" ? (
        <Box p={{ base: 4, md: 4 }} borderRadius="2xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="sm" backdropFilter="blur(18px)">
          <Heading as="h3" size="md" mb={3}>Filters</Heading>
          <Form method="get">
            <input type="hidden" name="tab" value={filters.tab} />
            <input type="hidden" name="artistsPage" value="1" />
            <input type="hidden" name="albumsPage" value="1" />
            <input type="hidden" name="playlistsPage" value="1" />
            {selectedCollectionId ? <input type="hidden" name="collection" value={String(selectedCollectionId)} /> : null}
            {filters.search ? <input type="hidden" name="search" value={filters.search} /> : null}

            <Stack gap={3}>
              <Box>
                <Text fontSize="sm" mb={1} color="app.muted">Genre</Text>
                <chakra.select name="genre" defaultValue={filters.genre}>
                  <option value="">All genres</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </chakra.select>
              </Box>

              <Box>
                <Text fontSize="sm" mb={1} color="app.muted">Artist name</Text>
                <Input name="artist" defaultValue={filters.artist} placeholder="Filter library by artist" />
              </Box>

              <Button type="submit" colorScheme="teal" loading={isFiltering} loadingText="Applying...">Apply</Button>
            </Stack>
          </Form>
        </Box>
      ) : null}

      <Box p={{ base: 4, md: 4 }} borderRadius="2xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="sm" backdropFilter="blur(18px)">
        <Heading as="h3" size="md" mb={3}>Create Collection</Heading>
        <createFetcher.Form method="post">
          <input type="hidden" name="intent" value="create_collection" />
          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" mb={1} color="app.muted">Name</Text>
              <Input name="name" required />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="app.muted">Description</Text>
              <Input name="description" />
            </Box>
            <Button type="submit" colorScheme="blue" loading={isSubmittingCreate || isCreatingCollection} loadingText="Creating...">Create</Button>
            {createError ? <Text color="app.danger">{createError}</Text> : null}
          </Stack>
        </createFetcher.Form>
      </Box>
    </Stack>
  );
}
