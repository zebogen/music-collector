import type { ReactNode } from "react";
import { Form } from "react-router";
import { Flex, Box, Heading, Text, HStack, Button } from "@chakra-ui/react";

export default function Topbar({ user, isSyncing }: { user: { id: string | number; displayName?: string | null } | null; isSyncing: boolean }) {
  return (
    <Flex as="header" align="center" justify="space-between" p={4} bg="white" boxShadow="sm">
      <Box>
        <Heading as="h1" size="md">Spotify Library Organizer</Heading>
        <Text fontSize="sm">{user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}</Text>
      </Box>

      <HStack spacing={3}>
        {user ? (
          <HStack as="nav">
            <Form method="post" action="/?index">
              <input type="hidden" name="intent" value="sync" />
              <Button type="submit" colorScheme="teal" isLoading={isSyncing} loadingText="Syncing...">
                Sync Library
              </Button>
            </Form>
            <Form method="post" action="/logout">
              <Button type="submit" variant="outline">Log out</Button>
            </Form>
          </HStack>
        ) : (
          <HStack as="nav">
            <a href="/auth/spotify">
              <Button colorScheme="green">Connect Spotify</Button>
            </a>
          </HStack>
        )}
      </HStack>
    </Flex>
  );
}
