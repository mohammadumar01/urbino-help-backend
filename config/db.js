const { Pool, types } = require("pg");

// DATE column ko "YYYY-MM-DD" string hi rehne do. Warna JS Date banta hai aur
// timezone ki wajah se date ek din peeche dikh sakti hai (IST vs UTC).
types.setTypeParser(1082, (value) => value);

/**
 * Connection pool: ek hi waqt mein max itne DB connections.
 * 1000 active users ke liye ek Node process ko ~20 connections kaafi hain
 * (queries milliseconds mein khatam hoti hain). Zyada instances chalao to
 * DB_POOL_MAX ko Postgres ke max_connections ke hisaab se rakho.
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 10000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  // Idle client ka error poore process ko crash na kare
  console.error("[db] idle client error:", err.message);
});

module.exports = pool;
