import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";
const client = new pg.Client({
  connectionString: process.argv.includes("--test")
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL,
});
await client.connect();
try {
  await client.query(await readFile(new URL("../migrations/0001.sql", import.meta.url), "utf8"));
} finally {
  await client.end();
}
