import { redirect, type LoaderFunctionArgs } from "react-router";
import { createUserSession } from "~/utils/session.server";
import { exchangeCodeForToken, fetchSpotifyProfile } from "~/utils/spotify.server";
import { getUserBySpotifyUserId, upsertSpotifyUser } from "~/utils/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/?error=missing_code");
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const profile = await fetchSpotifyProfile(tokenResponse.access_token);
    const existingUser = await getUserBySpotifyUserId(profile.id);
    const refreshToken = tokenResponse.refresh_token ?? existingUser?.refreshToken ?? "";

    const user = await upsertSpotifyUser({
      spotifyUserId: profile.id,
      displayName: profile.display_name,
      accessToken: tokenResponse.access_token,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
    });

    if (!user.refreshToken) {
      return redirect("/?error=missing_refresh_token");
    }

    return createUserSession(user.id, "/");
  } catch (error) {
    console.error(error);
    return redirect("/?error=spotify_callback_failed");
  }
}
