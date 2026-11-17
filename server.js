require("dotenv").config();

// ---------- Required config check ----------
const REQUIRED = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}. See .env.example`);
    process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters in production.");
    process.exit(1);
}

const app = require("./app");
const pool = require("./config/db");
const redisClient = require("./config/redis");
const { runMigrations } = require("./database/migrate");

const PORT = Number(process.env.PORT) || 5500;
let server;

async function start() {
    try {
        await pool.query("SELECT 1");
        console.log("[db] PostgreSQL connected");

        if (process.env.RUN_MIGRATIONS !== "false") {
            await runMigrations(pool);
        }

        server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
    } catch (err) {
        console.error("[startup] failed:", err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    console.log(`${signal} received, shutting down...`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    if (server) await new Promise((r) => server.close(r));
    await redisClient.quit();
    await pool.end().catch(() => {});
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
});

start();
