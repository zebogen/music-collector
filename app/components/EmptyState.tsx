import { Link } from "react-router";
import { Box, Button, Heading, Link as ChakraLink, Stack, Text } from "@chakra-ui/react";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Box borderWidth="1px" borderColor="app.border" borderRadius="2xl" bg="app.panel" boxShadow="sm" px={{ base: 5, md: 6 }} py={{ base: 6, md: 8 }} textAlign="center">
      <Stack gap={3} align="center">
        <Heading as="h3" size="md">{title}</Heading>
        <Text color="app.muted" maxW="32rem">{description}</Text>
        {actionLabel && actionHref ? (
          <ChakraLink asChild>
            <Link prefetch="intent" to={actionHref} viewTransition>
            <Button variant="outline">{actionLabel}</Button>
            </Link>
          </ChakraLink>
        ) : null}
      </Stack>
    </Box>
  );
}
