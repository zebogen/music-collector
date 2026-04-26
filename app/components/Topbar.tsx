import { Form, Link, useFetcher, useLocation } from "react-router";
import {
  Flex,
  Box,
  Text,
  Button,
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
  HStack
} from "@chakra-ui/react";
import { TABS, type TabKey } from "~/routes/index-helpers";

export default function Topbar({
  user,
  isLoggingOut
}: {
  user: { id: string | number; displayName?: string | null; spotifyConnected?: boolean } | null;
  isLoggingOut: boolean;
}) {
  const syncFetcher = useFetcher<{ ok?: boolean; toast?: { type: "success" | "error"; title: string } }>();
  const isSyncing = syncFetcher.state !== "idle";
  const location = useLocation();
  const currentTab = location.pathname === "/collections"
    ? ((new URLSearchParams(location.search).get("tab") as TabKey | null) ?? "collections")
    : null;
  const onCollections = location.pathname === "/collections";
  const onDiscover = location.pathname.startsWith("/discover");

  function tabHref(tab: TabKey) {
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);

    // Clear state that is only relevant to specific tabs.
    params.delete("album");
    if (tab !== "collections") {
      params.delete("collection");
    }

    // Keep only the active tab's page index.
    if (tab === "albums") {
      params.set("albumsPage", params.get("albumsPage") ?? "1");
      params.delete("artistsPage");
      params.delete("playlistsPage");
    } else if (tab === "artists") {
      params.set("artistsPage", params.get("artistsPage") ?? "1");
      params.delete("albumsPage");
      params.delete("playlistsPage");
    } else if (tab === "playlists") {
      params.set("playlistsPage", params.get("playlistsPage") ?? "1");
      params.delete("artistsPage");
      params.delete("albumsPage");
    } else {
      params.delete("artistsPage");
      params.delete("albumsPage");
      params.delete("playlistsPage");
    }

    return `/collections?${params.toString()}`;
  }

  return (
    <Flex
      as="header"
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      direction={{ base: "column", lg: "row" }}
      gap={{ base: 2, md: 3 }}
      px={{ base: 3, md: 5 }}
      py={{ base: 3, md: 3 }}
      bg="app.panelSolid"
      borderBottomWidth="1px"
      borderColor="app.border"
      borderRadius="0"
    >
      <Box minW={0}>
        <Link to="/" prefetch="intent" viewTransition aria-label="Go to homepage">
          <Flex align="center" gap={2}>
            <Box
              w="30px"
              h="30px"
              borderRadius="full"
              bg="green.500"
              color="white"
              fontSize="xs"
              fontWeight="bold"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              MC
            </Box>
            <Text fontSize="sm" fontWeight="semibold">Music Collector</Text>
          </Flex>
        </Link>
        <Text display={{ base: "none", md: "block" }} fontSize="xs" color="app.muted" mt={1}>
          {user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}
        </Text>
      </Box>

      {user ? (
        <HStack as="nav" gap={2} wrap="wrap" align="center">
          <Link to={tabHref("collections")} prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={4} variant={onCollections && currentTab === "collections" ? "solid" : "ghost"}>
              Collections
            </Button>
          </Link>
          <Link to="/discover" prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={4} variant={onDiscover ? "solid" : "ghost"}>
              Discover
            </Button>
          </Link>
        </HStack>
      ) : null}

      <Box w={{ base: "full", md: "auto" }}>
        {user ? (
          <Flex as="nav" justify={{ base: "flex-end", md: "flex-start" }} gap={2}>
            <MenuRoot positioning={{ placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <Button aria-label="Open account menu" variant="outline" size="sm">
                  Menu
                </Button>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent minW="200px">
                  {TABS.filter((tab) => tab !== "collections").map((tab) => (
                    <MenuItem asChild key={tab} value={tab}>
                      <Link to={tabHref(tab)} prefetch="intent" viewTransition style={{ width: "100%", textTransform: "capitalize" }}>
                        {tab}
                      </Link>
                    </MenuItem>
                  ))}
                  {user.spotifyConnected ? (
                    <syncFetcher.Form method="post" action="/collections">
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
                  ) : null}
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
          <Flex as="nav" w={{ base: "full", md: "auto" }} gap={2} justify={{ base: "flex-start", md: "flex-end" }}>
            <Link to="/auth/login" prefetch="intent" viewTransition>
              <Button colorScheme="green" size="sm" w={{ base: "auto", sm: "auto" }}>Log In</Button>
            </Link>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
