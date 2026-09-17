import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";

function initDb() {
  if (databaseUrl.includes("neon.tech")) {
    const sql = neon(databaseUrl);
    return drizzleNeon(sql, { schema });
  }
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzlePg(pool, { schema });
}

export const db = initDb() as ReturnType<typeof drizzlePg<typeof schema>>;

