import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { createDevAuthSession, isDevAuthEnabled } from "~/utils/session.server";
import { getUserById, listUsers } from "~/utils/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isDevAuthEnabled()) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const users = await listUsers();

  return data({
    returnTo,
    users: users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      spotifyUserId: user.spotifyUserId
    }))
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (!isDevAuthEnabled()) {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const userId = Number(formData.get("userId"));
  const returnTo = String(formData.get("returnTo") ?? "/");

  if (!Number.isInteger(userId) || userId <= 0) {
    return data({ error: "Pick a valid local user." }, { status: 400 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return data({ error: "That local user no longer exists." }, { status: 404 });
  }

  return createDevAuthSession({
    userId: user.id,
    displayName: user.displayName ?? user.spotifyUserId,
    redirectTo: returnTo
  });
}

export default function DevAuthRoute() {
  const { returnTo, users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Box px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }}>
      <Stack gap={5} maxW="3xl" mx="auto">
        <Box p={{ base: 6, md: 8 }} borderRadius="3xl" bg="app.panel" borderWidth="1px" borderColor="app.border" boxShadow="md">
          <Stack gap={4}>
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="app.muted">
              Local Dev Auth
            </Text>
            <Heading as="h1" size="lg">Sign in with a local database user</Heading>
            <Text color="app.muted">
              This override skips Auth0 in local development and signs you into one of the existing users in your local database, so the app still uses your real test data.
            </Text>

            {users.length > 0 ? (
              <Stack gap={3}>
                {users.map((user) => (
                  <Form key={user.id} method="post">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Box p={4} borderRadius="2xl" bg="app.card" borderWidth="1px" borderColor="app.border">
                      <Stack gap={3} direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} justify="space-between">
                        <Box>
                          <Text fontWeight="semibold">{user.displayName ?? "Unnamed Spotify User"}</Text>
                          <Text fontSize="sm" color="app.muted">
                            Spotify ID: {user.spotifyUserId} / Local user #{user.id}
                          </Text>
                        </Box>
                        <Button type="submit" colorScheme="green" loading={isSubmitting} loadingText="Signing in..." w={{ base: "full", sm: "auto" }}>
                          Continue as This User
                        </Button>
                      </Stack>
                    </Box>
                  </Form>
                ))}
              </Stack>
            ) : (
              <Box p={4} borderRadius="2xl" bg="app.card" borderWidth="1px" borderColor="app.border">
                <Text color="app.muted">
                  No local users were found. Sync or seed a Spotify user into your local database first, then come back to this page.
                </Text>
              </Box>
            )}

            {actionData && "error" in actionData && actionData.error ? (
              <Text color="app.danger">{actionData.error}</Text>
            ) : null}

            <Link to="/" prefetch="intent" viewTransition>
              <Button variant="outline" w={{ base: "full", sm: "auto" }}>
                Back Home
              </Button>
            </Link>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
