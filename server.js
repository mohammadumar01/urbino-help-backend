require("dotenv").config({ quiet: true });

const cluster = require("cluster");
const os = require("os");

// ---------- Required config check ----------
// Cloud par ek DATABASE_URL kaafi hai; local par DB_* chahiye
const REQUIRED = process.env.DATABASE_URL ? ["JWT_SECRET"] : ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}. See .env.example`);
    process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters in production.");
    process.exit(1);
}

/**
 * WEB_CONCURRENCY = kitne worker processes (har CPU core ke liye ek).
 *   1 (default)  -> single process (development)
 *   "auto"       -> jitne CPU cores
 * Primary process migrations chalata hai, phir workers start karta hai.
 */
const raw = process.env.WEB_CONCURRENCY || "1";
const WORKERS = raw === "auto" ? os.availableParallelism() : Math.max(1, Number(raw) || 1);

if (WORKERS > 1 && cluster.isPrimary) {
    startPrimary();
} else {
    startWorker();
}

async function startPrimary() {
    const pool = require("./config/db");
    const { runMigrations } = require("./database/migrate");
    try {
        await pool.query("SELECT 1");
        if (process.env.RUN_MIGRATIONS !== "false") await runMigrations(pool);
        await pool.end();
    } catch (err) {
        console.error("[startup] failed:", err.message);
        process.exit(1);
    }

    console.log(`[cluster] starting ${WORKERS} workers`);
    for (let i = 0; i < WORKERS; i++) cluster.fork({ RUN_MIGRATIONS: "false" });

    let stopping = false;
    cluster.on("exit", (worker, code) => {
        if (stopping) return;
        console.error(`[cluster] worker ${worker.process.pid} exited (${code}), restarting`);
        cluster.fork({ RUN_MIGRATIONS: "false" });
    });
    const stop = (signal) => {
        stopping = true;
        console.log(`${signal} received, stopping workers...`);
        for (const w of Object.values(cluster.workers)) w.process.kill("SIGTERM");
        setTimeout(() => process.exit(0), 11000).unref();
    };
    process.on("SIGINT", () => stop("SIGINT"));
    process.on("SIGTERM", () => stop("SIGTERM"));
}

function startWorker() {
    const app = require("./app");
    const pool = require("./config/db");
    const redisClient = require("./config/redis");
    const { runMigrations } = require("./database/migrate");

    const PORT = Number(process.env.PORT) || 5500;
    let server;

    (async () => {
        try {
            await pool.query("SELECT 1");
            if (process.env.RUN_MIGRATIONS !== "false") await runMigrations(pool);

            server = app.listen(PORT, "0.0.0.0", () => {
                const tag = cluster.isWorker ? ` [worker ${process.pid}]` : "";
                console.log(`Server running on http://localhost:${PORT}${tag}`);
            });
            server.keepAliveTimeout = 65000;
            server.headersTimeout = 66000;
        } catch (err) {
            console.error("[startup] failed:", err.message);
            process.exit(1);
        }
    })();

    async function shutdown(signal) {
        if (!cluster.isWorker) console.log(`${signal} received, shutting down...`);
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
}
