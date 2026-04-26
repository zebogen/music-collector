import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { exchangeAuth0CodeForToken, fetchAuth0Profile } from "~/utils/auth0.server";
import { consumeAuth0Login, createAuthSession } from "~/utils/session.server";
import { getUserIdByAuth0Sub } from "~/utils/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return redirect("/?error=auth_callback_failed");
  }

  try {
    const tokenResponse = await exchangeAuth0CodeForToken(request, code);
    const profile = await fetchAuth0Profile(tokenResponse.access_token);
    const { returnTo } = await consumeAuth0Login(request, state);
    const userId = await getUserIdByAuth0Sub(profile.sub);

    return createAuthSession({
      auth0Sub: profile.sub,
      auth0Name: profile.name ?? profile.nickname ?? null,
      auth0Email: profile.email ?? null,
      userId,
      redirectTo: returnTo,
    });
  } catch (error) {
    console.error(error);
    return redirect("/?error=auth_callback_failed");
  }
}
