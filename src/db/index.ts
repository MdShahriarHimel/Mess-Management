/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema.ts";

export const createPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 3000, // Close idle connections after 3 seconds of inactivity so Neon Postgres compute can sleep
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 5,
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });
};

export const pool = createPool();

pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});

export const db = drizzle(pool, { schema });

