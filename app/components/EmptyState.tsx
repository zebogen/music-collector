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
    <Box borderWidth="1px" borderRadius="xl" bg="gray.50" px={{ base: 5, md: 6 }} py={{ base: 6, md: 8 }} textAlign="center">
      <Stack gap={3} align="center">
        <Heading as="h3" size="md">{title}</Heading>
        <Text color="gray.600" maxW="32rem">{description}</Text>
        {actionLabel && actionHref ? (
          <ChakraLink href={actionHref}>
            <Button variant="outline">{actionLabel}</Button>
          </ChakraLink>
        ) : null}
      </Stack>
    </Box>
  );
}
