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
  if (!env.AUTH0_DOMAIN) {
    throw new Error("AUTH0_DOMAIN is required");
  }
  return `https://${env.AUTH0_DOMAIN}${path}`;
}

function requireAuth0Env() {
  if (!env.AUTH0_CLIENT_ID || !env.AUTH0_CLIENT_SECRET || !env.AUTH0_REDIRECT_URI || !env.AUTH0_LOGOUT_RETURN_TO) {
    throw new Error("Missing Auth0 environment variables");
  }

  return {
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    redirectUri: env.AUTH0_REDIRECT_URI,
    logoutReturnTo: env.AUTH0_LOGOUT_RETURN_TO,
  };
}

export function getAuth0AuthorizeUrl(state: string) {
  const auth = requireAuth0Env();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: auth.clientId,
    redirect_uri: auth.redirectUri,
    scope: "openid profile email",
    state,
  });

  return `${auth0Url("/authorize")}?${params.toString()}`;
}

export async function exchangeAuth0CodeForToken(code: string) {
  const auth = requireAuth0Env();
  const response = await fetch(auth0Url("/oauth/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      code,
      redirect_uri: auth.redirectUri,
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
  const auth = requireAuth0Env();
  const params = new URLSearchParams({
    client_id: auth.clientId,
    returnTo: auth.logoutReturnTo,
  });

  return `${auth0Url("/v2/logout")}?${params.toString()}`;
}
