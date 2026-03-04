import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useNavigation } from "react-router";
import { Box, Button, CloseButton, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Topbar from "~/components/Topbar";
import { getToast, getUserId } from "~/utils/session.server";
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
  const { toast, headers } = await getToast(request);

  return data(
    {
      user: user ? { id: user.id, displayName: user.displayName } : null,
      toast
    },
    { headers }
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [visibleToast, setVisibleToast] = useState(data.toast);
  const isSyncing = navigation.state === "submitting" && navigation.formData?.get("intent") === "sync";
  const isLoggingOut = navigation.state === "submitting" && navigation.formAction === "/logout";
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    setVisibleToast(data.toast);
  }, [data.toast]);

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
          <Topbar user={data.user} isSyncing={isSyncing} isLoggingOut={isLoggingOut} />
          {visibleToast ? (
            <Box
              position="fixed"
              top={{ base: 16, md: 4 }}
              right={4}
              zIndex={1001}
              bg={visibleToast.type === "success" ? "green.600" : "red.600"}
              color="white"
              borderRadius="xl"
              boxShadow="lg"
              px={4}
              py={3}
              maxW={{ base: "calc(100vw - 2rem)", md: "360px" }}
            >
              <Box pr={8}>
                <Text fontWeight="semibold">{visibleToast.title}</Text>
                {visibleToast.description ? <Text fontSize="sm" mt={1}>{visibleToast.description}</Text> : null}
              </Box>
              <CloseButton position="absolute" top={2} right={2} onClick={() => setVisibleToast(null)} />
            </Box>
          ) : null}
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
