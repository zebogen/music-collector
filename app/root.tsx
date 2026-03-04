import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration, useFetchers, useLoaderData, useNavigation } from "react-router";
import { Box, CloseButton, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Topbar from "~/components/Topbar";
import { getAuthSession, getToast } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";
import { Chakra } from "~/chakra";

export const links: LinksFunction = () => [];
export const meta = () => [
  { title: "Spotify Library Organizer" },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }
];

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthSession(request);
  const user = auth.userId ? await getUserById(auth.userId) : null;
  const { toast, headers } = await getToast(request);

  return data(
    {
      user: auth.auth0Sub
        ? {
            id: auth.userId ?? auth.auth0Sub,
            displayName: auth.auth0Name ?? user?.displayName ?? "User",
            spotifyConnected: Boolean(user),
          }
        : null,
      toast
    },
    { headers }
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const fetchers = useFetchers();
  const navigation = useNavigation();
  const [visibleToast, setVisibleToast] = useState(data.toast);
  const [lastToastKey, setLastToastKey] = useState("");
  const isLoggingOut = navigation.state === "submitting" && navigation.formAction === "/logout";
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    setVisibleToast(data.toast);
  }, [data.toast]);

  useEffect(() => {
    for (const fetcher of fetchers) {
      const toast = fetcher.data?.toast as { type: "success" | "error"; title: string; description?: string } | undefined;
      if (!toast) {
        continue;
      }

      const key = `${toast.type}:${toast.title}:${toast.description ?? ""}`;
      if (key !== lastToastKey) {
        setVisibleToast(toast);
        setLastToastKey(key);
      }
    }
  }, [fetchers, lastToastKey]);

  useEffect(() => {
    if (!visibleToast) {
      return;
    }

    const timeout = window.setTimeout(() => setVisibleToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [visibleToast]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Chakra>
          <Topbar user={data.user} isLoggingOut={isLoggingOut} />
          {visibleToast ? (
            <Box
              position="fixed"
              top={{ base: 16, md: 4 }}
              right={4}
              zIndex={1001}
              bg="app.panelSolid"
              color="app.text"
              borderWidth="1px"
              borderColor={visibleToast.type === "success" ? "app.success" : "app.danger"}
              borderRadius="xl"
              boxShadow="lg"
              px={4}
              py={3}
              maxW={{ base: "calc(100vw - 2rem)", md: "360px" }}
            >
              <Box pr={8}>
                <Text fontWeight="semibold" color={visibleToast.type === "success" ? "app.success" : "app.danger"}>{visibleToast.title}</Text>
                {visibleToast.description ? <Text fontSize="sm" mt={1} color="app.muted">{visibleToast.description}</Text> : null}
              </Box>
              <CloseButton position="absolute" top={2} right={2} onClick={() => setVisibleToast(null)} />
            </Box>
          ) : null}
          {isNavigating ? (
            <Box position="fixed" top={4} right={4} zIndex={1000} bg="app.panelSolid" borderWidth="1px" borderColor="app.border" borderRadius="full" boxShadow="md" p={2}>
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
