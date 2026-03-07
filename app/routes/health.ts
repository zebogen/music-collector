import { data, type LoaderFunctionArgs } from "react-router";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const start = Date.now();
  const url = new URL(request.url);
  const includeDb = url.searchParams.get("db") === "1";

  if (!includeDb) {
    return data({
      ok: true,
      service: "music-collector",
      runtimeMs: Date.now() - start,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const dbStart = Date.now();
    const result = await db.query("SELECT NOW() AS now");
    return data({
      ok: true,
      service: "music-collector",
      runtimeMs: Date.now() - start,
      dbRuntimeMs: Date.now() - dbStart,
      dbNow: result.rows[0]?.now ?? null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health DB check failed", error);
    return data(
      {
        ok: false,
        service: "music-collector",
        runtimeMs: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

