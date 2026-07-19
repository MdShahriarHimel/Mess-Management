/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

let dbCredentials: any;

if (databaseUrl) {
  dbCredentials = {
    url: databaseUrl,
  };
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;

  if (!sqlHost) {
    throw new Error("SQL_HOST must be set in environment variables when DATABASE_URL is not provided.");
  }
  if (!sqlDbName) {
    throw new Error("SQL_DB_NAME must be set in environment variables when DATABASE_URL is not provided.");
  }
  if (!user) {
    throw new Error("SQL_ADMIN_USER must be set in environment variables when DATABASE_URL is not provided.");
  }
  if (!password) {
    throw new Error("SQL_ADMIN_PASSWORD must be set in environment variables when DATABASE_URL is not provided.");
  }

  dbCredentials = {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
