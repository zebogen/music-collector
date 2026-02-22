import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { Form, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useNavigation } from "react-router";
import stylesheet from "~/styles/app.css?url";
import { getUserId } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

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
        <header className="topbar">
          <div>
            <h1>Spotify Library Organizer</h1>
            {data.user ? <p>Signed in as {data.user.displayName ?? "Spotify User"}</p> : <p>Not connected</p>}
          </div>
          {data.user ? (
            <nav className="topbar-actions">
              <Form method="post" action="/?index">
                <input type="hidden" name="intent" value="sync" />
                <button className="button" type="submit" disabled={isSyncing}>
                  {isSyncing ? "Syncing..." : "Sync Library"}
                </button>
              </Form>
              <Form method="post" action="/logout">
                <button type="submit" className="button secondary nav-button">
                  Log out
                </button>
              </Form>
            </nav>
          ) : (
            <nav className="topbar-actions">
              <a className="button" href="/auth/spotify">
                Connect Spotify
              </a>
            </nav>
          )}
        </header>
        <main className="container">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
