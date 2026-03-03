import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { Form, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useNavigation } from "react-router";
import Topbar from "~/components/Topbar";
import { getUserId } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";
import { Chakra } from "~/chakra";

export const links: LinksFunction = () => [];

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

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Chakra>
          <Topbar user={data.user} isSyncing={isSyncing} />
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
