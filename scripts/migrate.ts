import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.database") ? { rejectUnauthorized: false } : false
  });
  const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/schema.sql");
  const sql = await readFile(schemaPath, "utf-8");

  try {
    await pool.query(sql);
    console.log("Database migration complete.");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
