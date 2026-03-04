import { Form, Link, useFetcher } from "react-router";
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  IconButton,
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuTrigger
} from "@chakra-ui/react";

export default function Topbar({
  user,
  isLoggingOut
}: {
  user: { id: string | number; displayName?: string | null } | null;
  isLoggingOut: boolean;
}) {
  const syncFetcher = useFetcher<{ ok?: boolean; toast?: { type: "success" | "error"; title: string } }>();
  const isSyncing = syncFetcher.state !== "idle";

  return (
    <Flex
      as="header"
      align={{ base: "flex-start", md: "center" }}
      justify="space-between"
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 4 }}
      p={{ base: 4, md: 4 }}
      bg="app.panel"
      borderWidth="1px"
      borderColor="app.border"
      borderRadius="2xl"
      boxShadow="md"
      backdropFilter="blur(18px)"
    >
      <Box minW={0}>
        <Heading as="h1" size="md">Spotify Library Organizer</Heading>
        <Text fontSize="sm" color="app.muted">{user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}</Text>
      </Box>

      <Box w={{ base: "full", md: "auto" }}>
        {user ? (
          <Flex as="nav" justify={{ base: "flex-end", md: "flex-start" }}>
            <MenuRoot positioning={{ placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <IconButton aria-label="Open account menu" variant="outline" size="sm">
                  &#8942;
                </IconButton>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent minW="180px">
                  <syncFetcher.Form method="post" action="/?index">
                    <input type="hidden" name="intent" value="sync" />
                    <MenuItem asChild value="sync">
                      <Button
                        type="submit"
                        justifyContent="flex-start"
                        variant="ghost"
                        w="full"
                        loading={isSyncing}
                        loadingText="Syncing..."
                      >
                        Sync Library
                      </Button>
                    </MenuItem>
                  </syncFetcher.Form>
                  <Form method="post" action="/logout">
                    <MenuItem asChild value="logout">
                      <Button
                        type="submit"
                        justifyContent="flex-start"
                        variant="ghost"
                        w="full"
                        loading={isLoggingOut}
                        loadingText="Logging out..."
                      >
                        Log out
                      </Button>
                    </MenuItem>
                  </Form>
                </MenuContent>
              </MenuPositioner>
            </MenuRoot>
          </Flex>
        ) : (
          <Box as="nav" w={{ base: "full", md: "auto" }}>
            <Link to="/auth/spotify" prefetch="intent" viewTransition>
              <Button colorScheme="green" w={{ base: "full", sm: "auto" }}>Connect Spotify</Button>
            </Link>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
