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
  const onHome = location.pathname === "/";
  const onCollections = location.pathname === "/collections";
  const onDiscover = location.pathname.startsWith("/discover");
  const libraryHref = onCollections && currentTab && currentTab !== "collections" ? tabHref(currentTab) : tabHref("collections");

  function tabHref(tab: TabKey) {
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);

    params.delete("album");
    if (tab !== "collections") {
      params.delete("collection");
    }

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
      align="center"
      justify="space-between"
      direction="row"
      gap={3}
      flexWrap="nowrap"
      px={{ base: 3, md: 5 }}
      py={{ base: 2, md: 3 }}
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
            <Text fontSize="sm" fontWeight="semibold" lineHeight="1.2">Music Collector</Text>
          </Flex>
        </Link>
        <Text display={{ base: "none", md: "block" }} fontSize="xs" color="app.muted" mt={1}>
          {user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}
        </Text>
      </Box>

      {user ? (
        <HStack as="nav" gap={2} align="center" display={{ base: "none", md: "flex" }}>
          <Link to={tabHref("collections")} prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={3} variant={onCollections && currentTab === "collections" ? "solid" : "ghost"}>
              Collections
            </Button>
          </Link>
          <Link to="/discover" prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={3} variant={onDiscover ? "solid" : "ghost"}>
              Discover
            </Button>
          </Link>
        </HStack>
      ) : null}

      <Box w={{ base: "auto", md: "auto" }}>
        {user ? (
          <Flex as="nav" justify="flex-end" gap={2}>
            <MenuRoot positioning={{ placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <Button aria-label="Open account menu" variant="outline" size="sm" minH="40px" px={3}>
                  Menu
                </Button>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent minW="200px">
                  <Box display={{ base: "block", md: "none" }} px={2} py={2}>
                    <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="app.muted" mb={2}>
                      Library Views
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      {TABS.map((tab) => (
                        <Link key={tab} to={tabHref(tab)} prefetch="intent" viewTransition>
                          <Button size="xs" variant={onCollections && currentTab === tab ? "solid" : "outline"} textTransform="capitalize">
                            {tab}
                          </Button>
                        </Link>
                      ))}
                    </HStack>
                  </Box>
                  {TABS.filter((tab) => tab !== "collections").map((tab) => (
                    <MenuItem asChild key={tab} value={tab} display={{ base: "none", md: "flex" }}>
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
          <Flex as="nav" gap={2} justify="flex-end">
            <Link to="/auth/login" prefetch="intent" viewTransition>
              <Button colorScheme="green" size="sm" w={{ base: "auto", sm: "auto" }}>Log In</Button>
            </Link>
          </Flex>
        )}
      </Box>

      {user ? (
        <HStack
          as="nav"
          display={{ base: "flex", md: "none" }}
          position="fixed"
          left={3}
          right={3}
          bottom="calc(env(safe-area-inset-bottom) + 10px)"
          zIndex={1000}
          gap={2}
          p={2}
          bg="app.panelSolid"
          borderWidth="1px"
          borderColor="app.border"
          borderRadius="2xl"
          boxShadow="md"
        >
          <Link to="/" prefetch="intent" viewTransition style={{ flex: 1 }}>
            <Button size="sm" minH="44px" px={3} w="full" variant={onHome ? "solid" : "ghost"}>
              Home
            </Button>
          </Link>
          <Link to={libraryHref} prefetch="intent" viewTransition style={{ flex: 1 }}>
            <Button size="sm" minH="44px" px={3} w="full" variant={onCollections ? "solid" : "ghost"}>
              Library
            </Button>
          </Link>
          <Link to="/discover" prefetch="intent" viewTransition style={{ flex: 1 }}>
            <Button size="sm" minH="44px" px={3} w="full" variant={onDiscover ? "solid" : "ghost"}>
              Discover
            </Button>
          </Link>
        </HStack>
      ) : null}
    </Flex>
  );
}
