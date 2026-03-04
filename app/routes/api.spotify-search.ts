import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireUserId } from "~/utils/session.server";
import { getUserById } from "~/utils/user.server";
import { ensureValidAccessToken, searchSpotifyAlbums } from "~/utils/spotify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return data({ results: [] });
  }

  const user = await getUserById(userId);
  if (!user) {
    return data({ results: [], error: "Missing user" }, { status: 400 });
  }

  const accessToken = await ensureValidAccessToken(user);
  const results = await searchSpotifyAlbums(accessToken, query);

  return data({ results });
}
