import { Form } from "react-router";
import { Box, Heading, Text, Stack, chakra, Input, Button } from "@chakra-ui/react";

export default function Sidebar({
  filters,
  genres,
  selectedCollectionId,
  actionError
}: {
  filters: any;
  genres: string[];
  selectedCollectionId: number | null;
  actionError?: string | null;
}) {
  return (
  <Stack gap={6}>
      <Box p={4} borderRadius="md" bg="white" boxShadow="sm">
        <Heading as="h3" size="md" mb={3}>Filters</Heading>
        <Form method="get">
          <input type="hidden" name="tab" value={filters.tab} />
          <input type="hidden" name="artistsPage" value="1" />
          <input type="hidden" name="albumsPage" value="1" />
          <input type="hidden" name="playlistsPage" value="1" />
          {selectedCollectionId ? <input type="hidden" name="collection" value={String(selectedCollectionId)} /> : null}

          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" mb={1}>Genre</Text>
              <chakra.select name="genre" defaultValue={filters.genre}>
                <option value="">All genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </chakra.select>
            </Box>

            <Box>
              <Text fontSize="sm" mb={1}>Artist name</Text>
              <Input name="artist" defaultValue={filters.artist} placeholder="Filter library by artist" />
            </Box>

            <Button type="submit" colorScheme="teal">Apply</Button>
          </Stack>
        </Form>
      </Box>

      <Box p={4} borderRadius="md" bg="white" boxShadow="sm">
        <Heading as="h3" size="md" mb={3}>Create Collection</Heading>
        <Form method="post">
          <input type="hidden" name="intent" value="create_collection" />
          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" mb={1}>Name</Text>
              <Input name="name" required />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1}>Description</Text>
              <Input name="description" />
            </Box>
            <Button type="submit" colorScheme="blue">Create</Button>
            {actionError ? <Text color="red.500">{actionError}</Text> : null}
          </Stack>
        </Form>
      </Box>
    </Stack>
  );
}
