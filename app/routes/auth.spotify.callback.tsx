import { redirect, type LoaderFunctionArgs } from "react-router";
import { attachUserToSession, requireAuth0Sub } from "~/utils/session.server";
import { exchangeCodeForToken, fetchSpotifyProfile } from "~/utils/spotify.server";
import { getUserBySpotifyUserId, getUserIdByAuth0Sub, linkAuth0Identity, upsertSpotifyUser } from "~/utils/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/?error=missing_code");
  }

  try {
    const auth0Sub = await requireAuth0Sub(request);
    const tokenResponse = await exchangeCodeForToken(code);
    const profile = await fetchSpotifyProfile(tokenResponse.access_token);
    const existingUser = await getUserBySpotifyUserId(profile.id);
    const refreshToken = tokenResponse.refresh_token ?? existingUser?.refreshToken ?? "";
    const linkedUserId = await getUserIdByAuth0Sub(auth0Sub);

    const user =
      existingUser ??
      (await upsertSpotifyUser({
        spotifyUserId: profile.id,
        displayName: profile.display_name,
        accessToken: tokenResponse.access_token,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
      }));

    if (existingUser) {
      await upsertSpotifyUser({
        spotifyUserId: profile.id,
        displayName: profile.display_name,
        accessToken: tokenResponse.access_token,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
      });
    }

    if (linkedUserId && linkedUserId !== user.id) {
      return redirect("/?error=spotify_account_already_linked");
    }

    if (!user.refreshToken) {
      return redirect("/?error=missing_refresh_token");
    }

    await linkAuth0Identity(auth0Sub, user.id);
    return attachUserToSession(request, user.id, "/");
  } catch (error) {
    console.error(error);
    return redirect("/?error=spotify_callback_failed");
  }
}
