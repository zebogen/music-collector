import { randomBytes } from "node:crypto";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getAuth0AuthorizeUrl } from "~/utils/auth0.server";
import { beginAuth0Login } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const state = randomBytes(16).toString("hex");
  const { headers } = await beginAuth0Login(request, { state, returnTo });

  return redirect(getAuth0AuthorizeUrl(request, state), { headers });
}
