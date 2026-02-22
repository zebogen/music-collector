import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getSpotifyAuthUrl } from "~/utils/spotify.server";

export async function loader(_: LoaderFunctionArgs) {
  return redirect(getSpotifyAuthUrl());
}
