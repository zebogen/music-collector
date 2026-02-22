import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getSpotifyAuthUrl } from "~/utils/spotify.server";

export async function loader(_: LoaderFunctionArgs) {
  return redirect(getSpotifyAuthUrl());
}
