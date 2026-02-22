import { Pool } from "pg";
import { env } from "~/utils/env.server";

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

export const db =
  global.__dbPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

if (env.NODE_ENV !== "production") {
  global.__dbPool = db;
}
