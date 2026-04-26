import { Form, Link, useFetcher, useLocation } from "react-router";
import {
  Flex,
  Box,
  Heading,
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
        <Heading as="h1" size="sm" lineHeight="1.2">Spotify Library Organizer</Heading>
        <Text display={{ base: "none", md: "block" }} fontSize="xs" color="app.muted" mt={1}>
          {user ? `Signed in as ${user.displayName ?? "Spotify User"}` : "Not connected"}
        </Text>
      </Box>

      {user ? (
        <HStack
          as="nav"
          gap={2}
          wrap="nowrap"
          align="center"
          overflowX="auto"
          pb={{ base: 1, md: 0 }}
          css={{ scrollbarWidth: "none" }}
          display={{ base: "none", md: "flex" }}
        >
          <Link to="/" prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={4} variant={onHome ? "solid" : "ghost"}>
              Home
            </Button>
          </Link>
          <Link to={tabHref("collections")} prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={4} variant={onCollections && currentTab === "collections" ? "solid" : "ghost"}>
              Collections
            </Button>
          </Link>
          {TABS.map((tab) => (
            tab === "collections" ? null : (
            <Link key={tab} to={tabHref(tab)} prefetch="intent" viewTransition>
              <Button size="sm" minH="40px" px={4} variant={onCollections && currentTab === tab ? "solid" : "ghost"} textTransform="capitalize">
                {tab}
              </Button>
            </Link>
            )
          ))}
          <Link to="/discover" prefetch="intent" viewTransition>
            <Button size="sm" minH="40px" px={4} variant={onDiscover ? "solid" : "ghost"}>
              Discover
            </Button>
          </Link>
        </HStack>
      ) : null}

      {user ? (
        <HStack display={{ base: "flex", md: "none" }} gap={2} wrap="wrap">
          <Link to="/" prefetch="intent" viewTransition>
            <Button size="sm" minH="38px" px={3} variant={onHome ? "solid" : "ghost"}>
              Home
            </Button>
          </Link>
          <Link to={libraryHref} prefetch="intent" viewTransition>
            <Button size="sm" minH="38px" px={3} variant={onCollections ? "solid" : "ghost"}>
              Library
            </Button>
          </Link>
          <Link to="/discover" prefetch="intent" viewTransition>
            <Button size="sm" minH="38px" px={3} variant={onDiscover ? "solid" : "ghost"}>
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
                <MenuContent minW="180px">
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
