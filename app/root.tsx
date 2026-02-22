import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import stylesheet from "~/styles/app.css?url";
import { getUserId } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = userId ? await getUserById(userId) : null;

  return json({
    user: user ? { id: user.id, displayName: user.displayName } : null,
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <header className="topbar">
          <h1>Spotify Library Organizer</h1>
          {data.user ? <p>Signed in as {data.user.displayName ?? "Spotify User"}</p> : null}
        </header>
        <main className="container">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
