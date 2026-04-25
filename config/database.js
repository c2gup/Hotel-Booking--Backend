import pkg from "pg";
const { Pool } = pkg;

import dotenv from "dotenv";
dotenv.config();

console.log("----->>>", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("connect", () => {
  console.log("Database connected!");
});

export const query = (text, params) => pool.query(text, params);
