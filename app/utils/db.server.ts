import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import type { PoolClient, QueryResult } from "pg";
import { env } from "~/utils/env.server";

type QueryArgs = [string] | [string, any[]];

type DbClient = {
  query: (...args: QueryArgs) => Promise<QueryResult<any>>;
  release: () => void;
};

type DbPool = {
  query: (...args: QueryArgs) => Promise<QueryResult<any>>;
  connect: () => Promise<DbClient>;
};

function isNeonUrl(connectionString: string) {
  return connectionString.includes("neon.tech") || connectionString.includes("neon.database");
}

function normalizeQueryArgs(args: QueryArgs) {
  const [text, values] = args;
  return { text, values };
}

function wrapPgPool(pool: PgPool): DbPool {
  return {
    query: (...args) => {
      const { text, values } = normalizeQueryArgs(args);
      return values ? pool.query(text, values) : pool.query(text);
    },
    connect: async () => pool.connect()
  };
}

function wrapNeonPool(pool: InstanceType<typeof NeonPool>): DbPool {
  return {
    query: (...args) => {
      const { text, values } = normalizeQueryArgs(args);
      return values ? pool.query(text, values) : pool.query(text);
    },
    connect: async () => {
      const client = (await pool.connect()) as PoolClient;
      return {
        query: (...args: QueryArgs) => {
          const { text, values } = normalizeQueryArgs(args);
          return values ? client.query(text, values) : client.query(text);
        },
        release: () => client.release()
      };
    }
  };
}

function createPool(): DbPool {
  if (isNeonUrl(env.DATABASE_URL) || env.NODE_ENV === "production") {
    return wrapNeonPool(new NeonPool({ connectionString: env.DATABASE_URL }));
  }

  return wrapPgPool(new PgPool({ connectionString: env.DATABASE_URL, ssl: false }));
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: DbPool | undefined;
}

export const db = global.__dbPool ?? createPool();

if (env.NODE_ENV !== "production") {
  global.__dbPool = db;
}
