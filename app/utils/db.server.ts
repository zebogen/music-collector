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

function shouldUseNeonServerlessPool() {
  return process.env.DB_DRIVER === "neon";
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
  if (shouldUseNeonServerlessPool()) {
    return wrapNeonPool(
      new NeonPool({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 10_000,
        max: 5
      })
    );
  }

  return wrapPgPool(
    new PgPool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      max: 10
    })
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: DbPool | undefined;
}

export const db = global.__dbPool ?? createPool();

if (env.NODE_ENV !== "production") {
  global.__dbPool = db;
}
