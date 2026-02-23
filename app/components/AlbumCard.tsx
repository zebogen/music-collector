import { Box, Heading, Text, Image, HStack, chakra, Button, Link as ChakraLink } from "@chakra-ui/react";
import { Form } from "react-router";

export default function AlbumCard({ album, safeCollections, buildHref }: any) {
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden" bg="white">
  <ChakraLink href={buildHref({ selectedAlbumId: album.id })} display="block">
        {album.imageUrl ? (
          <Image src={album.imageUrl} alt={`${album.name} cover`} objectFit="cover" width="100%" maxH="200px" />
        ) : (
          <Box height="200px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
            <Text color="gray.500">No Art</Text>
          </Box>
        )}
      </ChakraLink>

      <Box p={3}>
              <ChakraLink href={buildHref({ selectedAlbumId: album.id })} _hover={{ textDecoration: 'none' }}>
          <Heading as="h3" size="sm" mb={1}>{album.name}</Heading>
        </ChakraLink>
        <Text fontSize="sm" color="gray.600" mb={3}>{album.artistNames.join(", ") || "Unknown artist"}</Text>

        {safeCollections.length > 0 ? (
              <Form method="post">
            <input type="hidden" name="intent" value="add_album_to_collection" />
            <input type="hidden" name="albumId" value={album.id} />
            <HStack gap={2}>
              <chakra.select name="collectionId">
                {safeCollections.map((collection: any) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </chakra.select>
              <Button type="submit" size="sm" colorScheme="teal">Add</Button>
            </HStack>
          </Form>
        ) : null}
      </Box>
    </Box>
  );
}
