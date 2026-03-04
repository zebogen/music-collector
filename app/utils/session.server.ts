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

export async function requireUserId(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/");
  }
  return userId;
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
