const { Pool, types } = require("pg");

// DATE column ko "YYYY-MM-DD" string hi rehne do. Warna JS Date banta hai aur
// timezone ki wajah se date ek din peeche dikh sakti hai (IST vs UTC).
types.setTypeParser(1082, (value) => value);

/**
 * Connection pool: ek hi waqt mein max itne DB connections.
 * 1000 active users ke liye ek Node process ko ~20 connections kaafi hain
 * (queries milliseconds mein khatam hoti hain). Zyada instances chalao to
 * DB_POOL_MAX ko Postgres ke max_connections ke hisaab se rakho.
 *
 * Cloud (Neon / Render / Railway) ek DATABASE_URL deta hai; local par alag DB_* variables.
 */
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

const pool = new Pool({
  ...connection,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000,
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 10000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// Timezone: migration 011 database ka default timezone Asia/Kolkata set karti hai,
// isliye local aur cloud DB dono par timestamps IST mein rehte hain.

pool.on("error", (err) => {
  // Idle client ka error poore process ko crash na kare
  console.error("[db] idle client error:", err.message);
});

module.exports = pool;
