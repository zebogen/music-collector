import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getSpotifyAuthUrl } from "~/utils/spotify.server";
import { requireAuth0Sub } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth0Sub(request);
  return redirect(getSpotifyAuthUrl());
}
