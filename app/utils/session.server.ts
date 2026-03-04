import { createCookieSessionStorage, redirect } from "react-router";
import { env } from "~/utils/env.server";

const storage = createCookieSessionStorage({
  cookie: {
    name: "music_collector_session",
    secure: env.NODE_ENV === "production",
    secrets: [env.SESSION_SECRET],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30
  }
});

const USER_SESSION_KEY = "userId";
const TOAST_SESSION_KEY = "toast";
const AUTH0_SUB_SESSION_KEY = "auth0Sub";
const AUTH0_NAME_SESSION_KEY = "auth0Name";
const AUTH0_EMAIL_SESSION_KEY = "auth0Email";
const AUTH0_STATE_SESSION_KEY = "auth0State";
const AUTH0_RETURN_TO_SESSION_KEY = "auth0ReturnTo";

export type AppToast = {
  type: "success" | "error";
  title: string;
  description?: string;
};

export async function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getToast(request: Request) {
  const session = await getSession(request);
  const toast = session.get(TOAST_SESSION_KEY) as AppToast | undefined;

  return {
    toast: toast ?? null,
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  };
}

export async function redirectWithToast(request: Request, redirectTo: string, toast: AppToast) {
  const session = await getSession(request);
  session.flash(TOAST_SESSION_KEY, toast);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  });
}

export async function getUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);
  return typeof userId === "number" ? userId : null;
}

export async function getAuthSession(request: Request) {
  const session = await getSession(request);

  return {
    auth0Sub: (session.get(AUTH0_SUB_SESSION_KEY) as string | undefined) ?? null,
    auth0Name: (session.get(AUTH0_NAME_SESSION_KEY) as string | undefined) ?? null,
    auth0Email: (session.get(AUTH0_EMAIL_SESSION_KEY) as string | undefined) ?? null,
    userId: (session.get(USER_SESSION_KEY) as number | undefined) ?? null,
  };
}

export async function requireUserId(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/");
  }
  return userId;
}

export async function requireAuth0Sub(request: Request) {
  const auth = await getAuthSession(request);
  if (!auth.auth0Sub) {
    throw redirect("/auth/login");
  }
  return auth.auth0Sub;
}

export async function createAuthSession(input: {
  auth0Sub: string;
  auth0Name?: string | null;
  auth0Email?: string | null;
  userId?: number | null;
  redirectTo: string;
}) {
  const session = await storage.getSession();
  session.set(AUTH0_SUB_SESSION_KEY, input.auth0Sub);
  session.set(AUTH0_NAME_SESSION_KEY, input.auth0Name ?? null);
  session.set(AUTH0_EMAIL_SESSION_KEY, input.auth0Email ?? null);
  if (input.userId) {
    session.set(USER_SESSION_KEY, input.userId);
  } else {
    session.unset(USER_SESSION_KEY);
  }

  return redirect(input.redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  });
}

export async function attachUserToSession(request: Request, userId: number, redirectTo: string) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  });
}

export async function beginAuth0Login(request: Request, input: { state: string; returnTo: string }) {
  const session = await getSession(request);
  session.set(AUTH0_STATE_SESSION_KEY, input.state);
  session.set(AUTH0_RETURN_TO_SESSION_KEY, input.returnTo);

  return {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  };
}

export async function consumeAuth0Login(request: Request, state: string) {
  const session = await getSession(request);
  const expectedState = session.get(AUTH0_STATE_SESSION_KEY);
  const returnTo = (session.get(AUTH0_RETURN_TO_SESSION_KEY) as string | undefined) ?? "/";

  if (!expectedState || expectedState !== state) {
    throw new Error("Invalid Auth0 state");
  }

  session.unset(AUTH0_STATE_SESSION_KEY);
  session.unset(AUTH0_RETURN_TO_SESSION_KEY);

  return {
    returnTo,
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  };
}

export async function createUserSession(userId: number, redirectTo: string) {
  const session = await storage.getSession();
  session.set(USER_SESSION_KEY, userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  });
}

export async function destroyUserSession(request: Request) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await storage.destroySession(session)
    }
  });
}
