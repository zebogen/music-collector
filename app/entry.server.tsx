import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { EntryContext, ServerRouter } from "react-router";
import { renderToPipeableStream } from "react-dom/server";
import { env } from "~/utils/env.server";

const ABORT_DELAY = 5_000;

function unauthorizedResponse() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Protected"'
    }
  });
}

function isAuthorized(request: Request) {
  if (env.NODE_ENV !== "production") {
    return true;
  }

  if (!env.BASIC_AUTH_USERNAME || !env.BASIC_AUTH_PASSWORD) {
    return true;
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return false;
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const [username, password] = decoded.split(":");

  return username === env.BASIC_AUTH_USERNAME && password === env.BASIC_AUTH_PASSWORD;
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _loadContext: unknown
) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  return new Promise((resolve, reject) => {
    let didError = false;
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function safeResolve(response: Response) {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resolve(response);
    }

    function safeReject(error: unknown) {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    }

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          safeResolve(
            new Response(stream, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          safeReject(error);
        },
        onError(error: unknown) {
          didError = true;
          console.error(error);
        }
      }
    );

    timeoutId = setTimeout(() => {
      abort();
      console.error(`SSR timeout after ${ABORT_DELAY}ms for ${request.url}`);
      safeResolve(
        new Response("Request timed out while rendering.", {
          status: 504,
          headers: { "Content-Type": "text/plain" }
        })
      );
    }, ABORT_DELAY);
  });
}
