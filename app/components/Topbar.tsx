import type { ReactNode } from "react";
import { Form } from "react-router";
import { Flex, Box, Heading, Text, HStack, VStack, Button } from "@chakra-ui/react";

export default function Topbar({ user, isSyncing }: { user: { id: string | number; displayName?: string | null } | null; isSyncing: boolean }) {
  return (
    <Flex
      as="header"
      align={{ base: "flex-start", md: "center" }}
      justify="space-between"
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 4 }}
      p={{ base: 4, md: 4 }}
      bg="white"
      boxShadow="sm"
    >
      <Box minW={0}>
        <Heading as="h1" size="md">Spotify Library Organizer</Heading>
        <Text fontSize="sm">{user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}</Text>
      </Box>

      <Box w={{ base: "full", md: "auto" }}>
        {user ? (
          <VStack as="nav" align="stretch" gap={2} w={{ base: "full", md: "auto" }}>
            <Form method="post" action="/?index">
              <input type="hidden" name="intent" value="sync" />
              <Button type="submit" colorScheme="teal" loading={isSyncing} loadingText="Syncing..." w={{ base: "full", sm: "auto" }}>
                Sync Library
              </Button>
            </Form>
            <Form method="post" action="/logout">
              <Button type="submit" variant="outline" w={{ base: "full", sm: "auto" }}>Log out</Button>
            </Form>
          </VStack>
        ) : (
          <VStack as="nav" align="stretch" w={{ base: "full", md: "auto" }}>
            <a href="/auth/spotify">
              <Button colorScheme="green" w={{ base: "full", sm: "auto" }}>Connect Spotify</Button>
            </a>
          </VStack>
        )}
      </Box>
    </Flex>
  );
}
