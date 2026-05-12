import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { getClientConnectionConfig } from "../src/db/pgConnection";

dotenv.config();

const sqlPath = join(process.cwd(), "db", "migrations", "001_schema.sql");
const sql = readFileSync(sqlPath, "utf8");

async function main() {
  const client = new Client(getClientConnectionConfig());
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 001_schema.sql applied.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
