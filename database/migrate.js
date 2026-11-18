/**
 * Chhota migration runner.
 * database/migrations/*.sql ko naam ke order mein chalata hai, har file ek
 * baar. Jo chal chuki hai woh schema_migrations table mein likhi jaati hai.
 *
 *   npm run migrate        -> sirf migrations chalao
 *   server start           -> automatically chalti hain (RUN_MIGRATIONS=false se band)
 */
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const LOCK_ID = 727272; // ek hi waqt mein do instances migration na chalayein
const BASELINE_FILE = path.join(__dirname, "baseline.sql");
// baseline.sql is migration tak ka schema rakhta hai (baseline dobara banao to ise badlo)
const BASELINE_INCLUDES = "010_service_catalog.sql";

async function runMigrations(pool) {
    const client = await pool.connect();
    try {
        await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const done = new Set(
            (await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name)
        );

        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith(".sql"))
            .sort();

        // Khaali DB (naya cloud database): baseline se poora schema ek baar mein banao,
        // aur jo migrations baseline mein shaamil hain unhe "done" maan lo.
        const hasUsers = (await client.query("SELECT to_regclass('public.users') IS NOT NULL AS ok")).rows[0].ok;
        if (!hasUsers && done.size === 0) {
            console.log("[migrate] empty database: applying baseline schema");
            const sql = fs.readFileSync(BASELINE_FILE, "utf8");
            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query("SET search_path TO public");
                for (const f of files.filter((name) => name <= BASELINE_INCLUDES)) {
                    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
                    done.add(f);
                }
                await client.query("COMMIT");
            } catch (err) {
                await client.query("ROLLBACK");
                throw new Error(`Baseline schema failed: ${err.message}`);
            }
        }

        for (const file of files) {
            if (done.has(file)) continue;
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
            console.log(`[migrate] applying ${file}`);
            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
                await client.query("COMMIT");
            } catch (err) {
                await client.query("ROLLBACK");
                throw new Error(`Migration ${file} failed: ${err.message}`);
            }
        }
    } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
        client.release();
    }
}

module.exports = { runMigrations };

if (require.main === module) {
    require("dotenv").config();
    const pool = require("../config/db");
    runMigrations(pool)
        .then(() => {
            console.log("[migrate] done");
            return pool.end();
        })
        .catch((err) => {
            console.error(err.message);
            process.exit(1);
        });
}
