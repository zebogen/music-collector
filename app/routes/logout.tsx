import type { ActionFunctionArgs } from "react-router";
import { destroyUserSession } from "~/utils/session.server";
import { getAuthSession, isDevAuthSub } from "~/utils/session.server";
import { getAuth0LogoutUrl } from "~/utils/auth0.server";

export async function action({ request }: ActionFunctionArgs) {
  const auth = await getAuthSession(request);
  const response = await destroyUserSession(request);
  const location = response.headers.get("Location");
  const redirectTarget = isDevAuthSub(auth.auth0Sub)
    ? (location ?? "/")
    : (location === "/" ? getAuth0LogoutUrl() : location ?? getAuth0LogoutUrl());

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": response.headers.get("Set-Cookie") ?? "",
      Location: redirectTarget,
    }
  });
}
