import type { ActionFunctionArgs } from "react-router";
import { destroyUserSession } from "~/utils/session.server";
import { getAuth0LogoutUrl } from "~/utils/auth0.server";

export async function action({ request }: ActionFunctionArgs) {
  const response = await destroyUserSession(request);
  const location = response.headers.get("Location");
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": response.headers.get("Set-Cookie") ?? "",
      Location: location === "/" ? getAuth0LogoutUrl(request) : location ?? getAuth0LogoutUrl(request),
    }
  });
}
