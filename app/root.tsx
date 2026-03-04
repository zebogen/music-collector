import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useNavigation } from "react-router";
import { Box, Spinner } from "@chakra-ui/react";
import Topbar from "~/components/Topbar";
import { getUserId } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";
import { Chakra } from "~/chakra";

export const links: LinksFunction = () => [];
export const meta = () => [
  { title: "Spotify Library Organizer" },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }
];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = userId ? await getUserById(userId) : null;

  return {
    user: user ? { id: user.id, displayName: user.displayName } : null
  };
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSyncing = navigation.state === "submitting" && navigation.formData?.get("intent") === "sync";
  const isLoggingOut = navigation.state === "submitting" && navigation.formAction === "/logout";
  const isNavigating = navigation.state !== "idle";

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Chakra>
          <Topbar user={data.user} isSyncing={isSyncing} isLoggingOut={isLoggingOut} />
          {isNavigating ? (
            <Box position="fixed" top={4} right={4} zIndex={1000} bg="white" borderRadius="full" boxShadow="md" p={2}>
              <Spinner size="sm" color="teal.500" />
            </Box>
          ) : null}
          <main>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0.75rem" }}>
              <Outlet />
            </div>
          </main>
          <ScrollRestoration />
          <Scripts />
        </Chakra>
      </body>
    </html>
  );
}
