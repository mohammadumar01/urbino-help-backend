/**
 * Load test: ~1000 registered customers using the app at the same time.
 *
 *   1. Backend ko high rate limit ke saath chalao (load sab ek hi IP se aata hai):
 *        RATE_LIMIT_PER_MIN=1000000 npm start
 *   2. npm run test:load            (API_URL, CONNECTIONS, DURATION env se badal sakte ho)
 *
 * Kya karta hai: 1000 test customers + 5000 bookings banata hai (@load.test),
 * mixed traffic chalata hai (browse, discovery, slots, my bookings, notifications),
 * latency/throughput report karta hai, phir sab test data delete karta hai.
 * Sirf local/dev database par chalao.
 */
require("dotenv").config({ quiet: true });
const autocannon = require("autocannon");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const B = process.env.API_URL || `http://localhost:${process.env.PORT || 5500}`;
const CONNECTIONS = Number(process.env.CONNECTIONS) || 200;
const DURATION = Number(process.env.DURATION) || 30;
const USERS = 1000;

if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run load test with NODE_ENV=production");
    process.exit(1);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function seed() {
    const { rows: [svc] } = await pool.query(`
        SELECT ps.service_id, ps.provider_id FROM provider_services ps
        JOIN users u ON u.id = ps.provider_id AND u.is_deleted IS NOT TRUE
        WHERE ps.is_active ORDER BY ps.id LIMIT 1
    `);
    if (!svc) throw new Error("Need at least one provider offering a service to run the load test.");

    // bcrypt hash of "loadtest123" (login is not exercised; tokens are signed directly)
    const hash = "$2b$10$abcdefghijklmnopqrstuuJ5Vq7sW2c0w1Pp2v6Q0u1Hf8m0p3Xyq";
    const { rows: users } = await pool.query(
        `
        INSERT INTO users (name, email, password, phone, role)
        SELECT 'Load User ' || g, 'load' || g || '@load.test', $1, '9000000000', 'customer'
        FROM generate_series(1, $2) g
        RETURNING id
        `,
        [hash, USERS]
    );
    await pool.query(
        `
        INSERT INTO bookings (customer_id, service_id, service_name, address, booking_date, booking_time, provider_id, price, status)
        SELECT u.id, $2, s.name, 'Load test address', CURRENT_DATE + (g % 20), lpad((8 + g % 10)::text, 2, '0') || ':00',
               $3, 500, (ARRAY['pending','provider_accepted','completed','cancelled'])[1 + g % 4]
        FROM unnest($1::int[]) AS u(id)
        CROSS JOIN generate_series(1, 5) g
        CROSS JOIN services s WHERE s.id = $2
        `,
        [users.map((u) => u.id), svc.service_id, svc.provider_id]
    );
    return { userIds: users.map((u) => u.id), serviceId: svc.service_id, providerId: svc.provider_id };
}

async function cleanup() {
    const r = await pool.query("DELETE FROM users WHERE email LIKE '%@load.test'");
    console.log(`Cleaned up ${r.rowCount} load-test users (their bookings are removed with them).`);
}

function run({ userIds, serviceId, providerId }) {
    const tokens = userIds.map((id, i) =>
        jwt.sign({ id, email: `load${i + 1}@load.test`, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "1h" })
    );
    const date = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const auth = () => ({ Authorization: `Bearer ${pick(tokens)}` });

    // Weighted mix, roughly what real users do
    const mix = [
        [30, () => ({ path: `/api/services?page=1&limit=12` })],
        [10, () => ({ path: `/api/services/${serviceId}` })],
        [15, () => ({ path: `/api/service-discovery/providers?service_id=${serviceId}` })],
        [10, () => ({ path: `/api/provider-availability/slots?provider_id=${providerId}&date=${date}` })],
        [20, () => ({ path: `/api/booking/my-bookings?page=1&limit=10`, headers: auth() })],
        [10, () => ({ path: `/api/notifications`, headers: auth() })],
        [5, () => ({ path: `/api/categories` })],
    ];
    const total = mix.reduce((s, [w]) => s + w, 0);
    const next = () => {
        let x = Math.random() * total;
        for (const [w, f] of mix) if ((x -= w) < 0) return f();
        return mix[0][1]();
    };

    return new Promise((resolve, reject) => {
        const inst = autocannon(
            {
                url: B,
                connections: CONNECTIONS,
                duration: DURATION,
                requests: [
                    {
                        setupRequest: (req) => {
                            const n = next();
                            return { ...req, method: "GET", path: n.path, headers: n.headers || {} };
                        },
                    },
                ],
            },
            (err, res) => (err ? reject(err) : resolve(res))
        );
        autocannon.track(inst, { renderProgressBar: false, renderResultsTable: false, renderLatencyTable: false });
    });
}

(async () => {
    console.log(`Seeding ${USERS} customers and ${USERS * 5} bookings…`);
    const data = await seed();
    try {
        console.log(`Running ${DURATION}s with ${CONNECTIONS} concurrent connections against ${B}…`);
        const r = await run(data);
        const ok = r["2xx"];
        const errors = r.errors + r.timeouts + r.non2xx;
        console.log("\n=== Load test result ===");
        console.log(`Requests:   ${r.requests.total} total, ${r.requests.average.toFixed(0)} req/s average`);
        console.log(`Latency:    p50 ${r.latency.p50} ms, p90 ${r.latency.p90} ms, p99 ${r.latency.p99} ms, max ${r.latency.max} ms`);
        console.log(`Responses:  ${ok} ok, ${r.non2xx} non-2xx, ${r.errors} errors, ${r.timeouts} timeouts`);
        const pass = errors === 0 && r.latency.p99 < 1000;
        console.log(pass ? "PASS: no errors and p99 under 1 second" : "FAIL: errors or p99 >= 1 second");
        process.exitCode = pass ? 0 : 1;
    } finally {
        await cleanup();
        await pool.end();
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
