import { env } from "~/utils/env.server";

type Auth0TokenResponse = {
  access_token: string;
  id_token?: string;
  token_type: string;
};

export type Auth0Profile = {
  sub: string;
  name?: string;
  nickname?: string;
  email?: string;
};

function auth0Url(path: string) {
  return `https://${env.AUTH0_DOMAIN}${path}`;
}

export function getAuth0AuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.AUTH0_CLIENT_ID,
    redirect_uri: env.AUTH0_REDIRECT_URI,
    scope: "openid profile email",
    state,
  });

  return `${auth0Url("/authorize")}?${params.toString()}`;
}

export async function exchangeAuth0CodeForToken(code: string) {
  const response = await fetch(auth0Url("/oauth/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: env.AUTH0_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error("Auth0 token exchange failed");
  }

  return (await response.json()) as Auth0TokenResponse;
}

export async function fetchAuth0Profile(accessToken: string) {
  const response = await fetch(auth0Url("/userinfo"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Auth0 profile");
  }

  return (await response.json()) as Auth0Profile;
}

export function getAuth0LogoutUrl() {
  const params = new URLSearchParams({
    client_id: env.AUTH0_CLIENT_ID,
    returnTo: env.AUTH0_LOGOUT_RETURN_TO,
  });

  return `${auth0Url("/v2/logout")}?${params.toString()}`;
}
