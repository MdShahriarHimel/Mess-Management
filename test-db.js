import dotenv from "dotenv";
dotenv.config();

import pg from "pg";

const { Client } = pg;

console.log(process.env.DATABASE_URL);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

await client.connect();

console.log("CONNECTED");

const res = await client.query("SELECT NOW();");

console.log(res.rows);

await client.end();