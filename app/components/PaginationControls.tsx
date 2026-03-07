import { Link } from "react-router";
import { Button, HStack, Stack, Text, Link as ChakraLink } from "@chakra-ui/react";

export default function PaginationControls({
  list,
  currentPage,
  totalPages,
  buildHref,
}: {
  list: "albums" | "artists" | "playlists";
  currentPage: number;
  totalPages: number;
  buildHref: (overrides?: {
    artistsPage?: number;
    albumsPage?: number;
    playlistsPage?: number;
    selectedAlbumId?: number | null;
  }) => string;
}) {
  function getPageItems(): Array<number | "ellipsis"> {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const validPages = Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);

    const items: Array<number | "ellipsis"> = [];
    for (let index = 0; index < validPages.length; index += 1) {
      const page = validPages[index];
      const previous = validPages[index - 1];
      if (index > 0 && previous && page - previous > 1) {
        items.push("ellipsis");
      }
      items.push(page);
    }

    return items;
  }

  const pageItems = getPageItems();

  function href(page: number) {
    if (list === "albums") {
      return buildHref({ albumsPage: page, selectedAlbumId: null });
    }
    if (list === "artists") {
      return buildHref({ artistsPage: page });
    }
    return buildHref({ playlistsPage: page });
  }

  return (
    <Stack gap={3} align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }}>
      <ChakraLink asChild>
        <Link prefetch="intent" to={href(Math.max(1, currentPage - 1))} viewTransition>
        <Button variant="outline" size={{ base: "md", md: "sm" }} disabled={currentPage <= 1}>Previous</Button>
        </Link>
      </ChakraLink>

      <HStack gap={2} wrap="wrap" justify={{ base: "center", md: "flex-start" }}>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <Text key={`${list}-ellipsis-${index}`}>…</Text>
          ) : (
            <ChakraLink key={`${list}-${item}`} asChild>
              <Link prefetch="intent" to={href(item)} viewTransition>
              <Button size={{ base: "md", md: "sm" }} minW={{ base: "44px", md: "36px" }} variant={item === currentPage ? "solid" : "ghost"} aria-current={item === currentPage ? "page" : undefined}>
                {item}
              </Button>
              </Link>
            </ChakraLink>
          )
        )}
      </HStack>

      <ChakraLink asChild>
        <Link prefetch="intent" to={href(Math.min(totalPages, currentPage + 1))} viewTransition>
        <Button variant="outline" size={{ base: "md", md: "sm" }} disabled={currentPage >= totalPages}>Next</Button>
        </Link>
      </ChakraLink>
    </Stack>
  );
}
