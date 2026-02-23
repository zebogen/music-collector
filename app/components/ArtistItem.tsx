import type { Artist as ArtistType, Collection as CollectionType } from "~/types";
import { Box, Heading, Text, HStack, Select, Button } from "@chakra-ui/react";
import { Form } from "react-router";

export default function ArtistItem({ artist, safeCollections }: { artist: ArtistType; safeCollections: CollectionType[] }) {
  return (
    <HStack justify="space-between" align="center" p={3} bg="white" borderWidth="1px" borderRadius="md">
      <Box>
        <Heading as="h3" size="sm">{artist.name}</Heading>
        <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
      </Box>
      {safeCollections.length > 0 ? (
        <Form method="post">
          <input type="hidden" name="intent" value="add_artist_to_collection" />
          <input type="hidden" name="artistId" value={artist.id} />
          <HStack>
            <Select name="collectionId" placeholder="Collection" size="sm">
              {safeCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>{collection.name}</option>
              ))}
            </Select>
            <Button type="submit" size="sm" colorScheme="teal">Add</Button>
          </HStack>
        </Form>
      ) : null}
    </HStack>
  );
}
