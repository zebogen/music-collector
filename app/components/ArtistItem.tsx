import type { Artist as ArtistType, Collection as CollectionType } from "~/types";
import { Box, Heading, Text, HStack, chakra, Button } from "@chakra-ui/react";
import { Form } from "react-router";

export default function ArtistItem({ artist, safeCollections }: { artist: ArtistType; safeCollections: CollectionType[] }) {
  return (
    <HStack justify="space-between" align="center" p={3} bg="white" borderWidth="1px" borderRadius="md" gap={2}>
      <Box>
        <Heading as="h3" size="sm">{artist.name}</Heading>
        <Text fontSize="sm" color="gray.600">{artist.genres.join(", ") || "No genres"}</Text>
      </Box>
      {safeCollections.length > 0 ? (
        <Form method="post">
          <input type="hidden" name="intent" value="add_artist_to_collection" />
          <input type="hidden" name="artistId" value={artist.id} />
            <HStack gap={2}>
            <chakra.select name="collectionId">
              {safeCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>{collection.name}</option>
              ))}
            </chakra.select>
            <Button type="submit" size="sm" colorScheme="teal">Add</Button>
          </HStack>
        </Form>
      ) : null}
    </HStack>
  );
}
