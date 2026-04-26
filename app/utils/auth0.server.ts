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
  if (!env.AUTH0_CLIENT_ID || !env.AUTH0_CLIENT_SECRET) {
    throw new Error("Missing Auth0 environment variables");
  }

  return {
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
  };
}

function resolveOriginFromRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto ?? requestUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

function getAuth0AppOrigin(request: Request) {
  if (env.AUTH0_APP_BASE_URL) {
    return env.AUTH0_APP_BASE_URL;
  }

  if (env.VERCEL_ENV === "preview" && env.VERCEL_BRANCH_URL) {
    return `https://${env.VERCEL_BRANCH_URL}`;
  }

  return resolveOriginFromRequest(request);
}

function getAuth0RedirectUri(request: Request) {
  if (env.AUTH0_REDIRECT_URI) {
    return env.AUTH0_REDIRECT_URI;
  }

  return `${getAuth0AppOrigin(request)}/auth/callback`;
}

function getAuth0LogoutReturnTo(request: Request) {
  if (env.AUTH0_LOGOUT_RETURN_TO) {
    return env.AUTH0_LOGOUT_RETURN_TO;
  }

  return getAuth0AppOrigin(request);
}

export function getAuth0AuthorizeUrl(request: Request, state: string) {
  const auth = requireAuth0Env();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: auth.clientId,
    redirect_uri: getAuth0RedirectUri(request),
    scope: "openid profile email",
    state,
  });

  return `${auth0Url("/authorize")}?${params.toString()}`;
}

export async function exchangeAuth0CodeForToken(request: Request, code: string) {
  const auth = requireAuth0Env();
  const response = await fetch(auth0Url("/oauth/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      code,
      redirect_uri: getAuth0RedirectUri(request),
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

export function getAuth0LogoutUrl(request: Request) {
  const auth = requireAuth0Env();
  const params = new URLSearchParams({
    client_id: auth.clientId,
    returnTo: getAuth0LogoutReturnTo(request),
  });

  return `${auth0Url("/v2/logout")}?${params.toString()}`;
}
