import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { env } from "~/utils/env.server";

type DbPool = PgPool | NeonPool;

function isNeonUrl(connectionString: string) {
  return connectionString.includes("neon.tech") || connectionString.includes("neon.database");
}

function createPool(): DbPool {
  if (isNeonUrl(env.DATABASE_URL) || env.NODE_ENV === "production") {
    return new NeonPool({ connectionString: env.DATABASE_URL });
  }

  return new PgPool({ connectionString: env.DATABASE_URL, ssl: false });
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: DbPool | undefined;
}

export const db = global.__dbPool ?? createPool();

if (env.NODE_ENV !== "production") {
  global.__dbPool = db;
}
