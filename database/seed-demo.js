/**
 * Demo data: live link / presentation ke liye (asli users ka data nahi).
 *
 *   DEMO_PASSWORD=... npm run seed:demo           -> demo accounts + sample bookings
 *   DEMO_PASSWORD=... npm run seed:demo -- --reset -> pehle purana demo data hatao
 *
 * Saare demo accounts "@demo.urbinohelp.in" par hain. Production ke asli DB par mat chalao.
 */
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { runMigrations } = require("./migrate");

const DOMAIN = "demo.urbinohelp.in";
const RESET = process.argv.includes("--reset");

const CATALOG = {
    "AC Repair": [["AC Service", 499, "Filter + coil cleaning, gas pressure check, cooling test."], ["AC Repair", 599, "Diagnosis and repair of cooling, noise or water leakage."], ["AC Installation", 1499, "Split/window AC installation with stand and pipe fitting."]],
    Electrician: [["Fan Repair", 299, "Ceiling/table fan repair, regulator and capacitor."], ["Switch & Socket Repair", 199, "Replace or repair switches, sockets and boards."], ["Home Wiring", 999, "New points, rewiring and MCB fitting."]],
    Plumber: [["Tap Repair", 199, "Leaking tap, washer and spindle replacement."], ["Pipe Leakage Repair", 399, "Leak detection and pipe joint repair."], ["Bathroom Fitting", 799, "Shower, geyser connection and flush tank fitting."]],
    Cleaning: [["Full Home Cleaning", 1999, "Deep cleaning of rooms, kitchen and bathrooms."], ["Bathroom Cleaning", 399, "Tiles, fittings and floor deep clean."], ["Kitchen Cleaning", 599, "Chimney, slab, tiles and cabinet exteriors."]],
    Painter: [["Room Painting", 2499, "One room, two coats with premium emulsion."], ["Wall Texture", 1499, "Feature wall with stencil or texture."]],
    "Beauty at Home": [["Facial & Cleanup", 799, "Salon-quality facial at home by women professionals."], ["Haircut at Home", 349, "Haircut and styling at home."]],
};

const PEOPLE = {
    admin: { name: "Urbino Admin", email: `admin@${DOMAIN}`, role: "admin" },
    customer: { name: "Priya Verma", email: `customer@${DOMAIN}`, role: "customer" },
    customers: [
        ["Aman Gupta", "aman"], ["Neha Sharma", "neha"], ["Rohit Meena", "rohit"], ["Sana Khan", "sana"], ["Vikas Jain", "vikas"],
    ],
    providers: [
        { key: "sharma", name: "Sharma Cooling Services", area: "Jaipur", lat: 26.9124, lng: 75.7873, exp: 8, cats: ["AC Repair", "Electrician"], bio: "AC and electrical experts serving Jaipur since 2016." },
        { key: "clean", name: "SparkleHome Cleaning", area: "Jaipur", lat: 26.8505, lng: 75.8045, exp: 5, cats: ["Cleaning", "Painter"], bio: "Trained deep-cleaning crews with eco-friendly products." },
        { key: "kota", name: "Kota FixIt Plumbers", area: "Kota", lat: 25.1802, lng: 75.8333, exp: 6, cats: ["Plumber", "Electrician"], bio: "Fast plumbing and electrical fixes across Kota." },
        { key: "glow", name: "Glow Beauty at Home", area: "Jaipur", lat: 26.9196, lng: 75.8235, exp: 4, cats: ["Beauty at Home"], bio: "Certified women beauticians, hygienic single-use kits." },
    ],
    agents: [
        { name: "Ravi Kumar", email: `agent@${DOMAIN}`, provider: "sharma" },
        { name: "Imran Ali", email: `imran@${DOMAIN}`, provider: "sharma" },
        { name: "Pooja Saini", email: `pooja@${DOMAIN}`, provider: "clean" },
        { name: "Mahesh Yadav", email: `mahesh@${DOMAIN}`, provider: "kota" },
        { name: "Kavya Joshi", email: `kavya@${DOMAIN}`, provider: "glow" },
    ],
};

const ADDRESSES = [
    ["Flat 12, Shanti Apartments, Civil Lines, Jaipur", 26.9094, 75.7812],
    ["C-45, Malviya Nagar, Jaipur", 26.8531, 75.8047],
    ["221, Vaishali Nagar, Jaipur", 26.9117, 75.7432],
    ["B-7, Raja Park, Jaipur", 26.8987, 75.8274],
    ["House 18, Mansarovar Sector 5, Jaipur", 26.8697, 75.7647],
    ["4-Ka-12, Talwandi, Kota", 25.1438, 75.8486],
];
const REVIEWS = [
    [5, "Very professional, came on time and explained everything."],
    [5, "Excellent work, the start-code system made me feel safe."],
    [4, "Good service, slightly late but informed me in advance."],
    [5, "Clean work and fair price. Will book again."],
    [4, "Nice job. Price was exactly what the app showed."],
];

const rnd = (arr, i) => arr[i % arr.length];

async function main() {
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 8) {
        console.error("Set DEMO_PASSWORD (8+ characters) - all demo accounts use it.");
        process.exit(1);
    }
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
        console.error("Refusing to seed demo data in production without ALLOW_DEMO_SEED=true.");
        process.exit(1);
    }

    await runMigrations(pool);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT id FROM users WHERE email = $1", [PEOPLE.admin.email]);
        if (existing.rows[0] && !RESET) {
            console.log("Demo data already exists. Use --reset to recreate it.");
            await client.query("ROLLBACK");
            return;
        }
        if (RESET) {
            await client.query("UPDATE provider_verifications SET verified_by = NULL WHERE verified_by IN (SELECT id FROM users WHERE email LIKE $1)", [`%@${DOMAIN}`]);
            const del = await client.query("DELETE FROM users WHERE email LIKE $1", [`%@${DOMAIN}`]);
            console.log(`Removed ${del.rowCount} old demo accounts.`);
        }

        // ---- catalog (sirf missing categories/services jodo) ----
        const serviceIds = {};
        for (const [cat, services] of Object.entries(CATALOG)) {
            const c = await client.query(
                `INSERT INTO categories (name, description) VALUES ($1, $2)
                 ON CONFLICT ((lower(name))) DO UPDATE SET is_active = TRUE RETURNING id`,
                [cat, `${cat} services at home`]
            );
            for (const [name, price, desc] of services) {
                const s = await client.query(
                    `INSERT INTO services (category_id, name, description, base_price) VALUES ($1, $2, $3, $4)
                     ON CONFLICT (category_id, (lower(name))) DO UPDATE SET is_active = TRUE RETURNING id, base_price`,
                    [c.rows[0].id, name, desc, price]
                );
                (serviceIds[cat] ||= []).push({ id: s.rows[0].id, name, price: Number(s.rows[0].base_price) });
            }
        }

        const hash = await bcrypt.hash(password, 10);
        const mkUser = async (name, email, role, daysAgo = 40) =>
            (await client.query(
                `INSERT INTO users (name, email, password, phone, role, created_at)
                 VALUES ($1, $2, $3, $4, $5, now() - ($6 || ' days')::interval) RETURNING id`,
                [name, email, hash, `98${String(crypto.randomInt(10000000, 99999999))}`, role, String(daysAgo)]
            )).rows[0].id;

        const adminId = await mkUser(PEOPLE.admin.name, PEOPLE.admin.email, "admin", 60);
        const customerIds = [await mkUser(PEOPLE.customer.name, PEOPLE.customer.email, "customer", 35)];
        for (const [i, [name, key]] of PEOPLE.customers.entries()) {
            customerIds.push(await mkUser(name, `${key}@${DOMAIN}`, "customer", 30 - i * 5));
        }

        // ---- providers ----
        const providers = {};
        for (const [i, p] of PEOPLE.providers.entries()) {
            const email = i === 0 ? `provider@${DOMAIN}` : `${p.key}@${DOMAIN}`;
            const id = await mkUser(p.name, email, "provider", 50 - i * 3);
            await client.query(
                `INSERT INTO provider_profiles (provider_id, bio, experience_years, skills, service_area, is_verified, latitude, longitude, service_radius_km)
                 VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, 20)`,
                [id, p.bio, p.exp, p.cats.join(", "), p.area, p.lat, p.lng]
            );
            await client.query(
                `INSERT INTO provider_verifications (provider_id, document_type, document_number, document_url, status, verified_by, verified_at)
                 VALUES ($1, 'Aadhaar', 'XXXX-XXXX-' || $2, 'demo/aadhaar.pdf', 'approved', $3, now() - interval '20 days')`,
                [id, String(1000 + i * 1111), adminId]
            );
            const offered = [];
            for (const cat of p.cats) {
                for (const s of serviceIds[cat]) {
                    const price = Math.round(s.price * (0.95 + (i % 3) * 0.05));
                    await client.query("INSERT INTO provider_services (provider_id, service_id, price) VALUES ($1, $2, $3)", [id, s.id, price]);
                    offered.push({ ...s, price });
                }
            }
            for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
                await client.query("INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '19:00')", [id, day]);
            }
            providers[p.key] = { id, offered, agents: [] };
        }

        // ---- agents (team) ----
        for (const [i, a] of PEOPLE.agents.entries()) {
            const id = await mkUser(a.name, a.email, "agent", 45 - i * 4);
            await client.query(
                `INSERT INTO agent_profiles (agent_id, experience_years, skills, service_area, verification_status)
                 VALUES ($1, $2, $3, $4, 'approved')`,
                [id, 3 + i, "Trained by Urbino", rnd(["Jaipur", "Kota"], i)]
            );
            await client.query("INSERT INTO provider_agents (provider_id, agent_id) VALUES ($1, $2)", [providers[a.provider].id, id]);
            providers[a.provider].agents.push(id);
        }

        // ---- 30 din ki bookings (completed + paid + reviewed, kuch cancelled) ----
        const provKeys = Object.keys(providers);
        let made = 0;
        for (let i = 0; i < 46; i++) {
            const pk = rnd(provKeys, i * 7 + (i % 3));
            const prov = providers[pk];
            const svc = rnd(prov.offered, i * 3);
            const agent = rnd(prov.agents, i);
            const cust = rnd(customerIds, i * 5);
            const [addr, lat, lng] = rnd(ADDRESSES, i);
            const daysAgo = 29 - Math.floor((i * 29) / 46);
            const cancelled = i % 9 === 4;
            const hour = 9 + (i % 9);
            const b = await client.query(
                `INSERT INTO bookings (customer_id, provider_id, agent_id, service_id, service_name, address, latitude, longitude,
                    booking_date, booking_time, status, price, created_at,
                    provider_accepted_at, agent_assigned_at, agent_accepted_at, on_the_way_at, started_at, completed_at, cancelled_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                    (now() - ($9 || ' days')::interval)::date, $10, $11, $12, now() - ($9 || ' days')::interval - interval '1 day',
                    now() - ($9 || ' days')::interval - interval '23 hours 40 minutes',
                    now() - ($9 || ' days')::interval - interval '23 hours',
                    now() - ($9 || ' days')::interval - interval '22 hours',
                    CASE WHEN $13::boolean THEN NULL ELSE now() - ($9 || ' days')::interval - interval '35 minutes' END,
                    CASE WHEN $13::boolean THEN NULL ELSE now() - ($9 || ' days')::interval - interval '10 minutes' END,
                    CASE WHEN $13::boolean THEN NULL ELSE now() - ($9 || ' days')::interval + interval '50 minutes' END,
                    CASE WHEN $13::boolean THEN now() - ($9 || ' days')::interval - interval '20 hours' ELSE NULL END)
                 RETURNING id`,
                [cust, prov.id, cancelled ? null : agent, svc.id, svc.name, addr, lat, lng, String(daysAgo), `${String(hour).padStart(2, "0")}:00`, cancelled ? "cancelled" : "completed", svc.price, cancelled]
            );
            const bookingId = b.rows[0].id;
            made++;
            if (cancelled) continue;
            const cash = i % 3 === 0;
            const fee = Math.round(svc.price * 15) / 100;
            await client.query(
                `INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_status, gateway, transaction_id,
                    platform_fee, provider_earning, collected_by, paid_at, created_at)
                 VALUES ($1, $2, $3, $4, 'successful', $5, $6, $7, $8, $9,
                    now() - ($10 || ' days')::interval + interval '55 minutes', now() - ($10 || ' days')::interval - interval '1 day')`,
                [bookingId, cust, svc.price, cash ? "CASH" : "ONLINE", cash ? "cash" : "mock", cash ? null : `pay_demo_${bookingId}`, fee, svc.price - fee, cash ? agent : null, String(daysAgo)]
            );
            if (i % 4 !== 3) {
                const [rating, text] = rnd(REVIEWS, i);
                await client.query(
                    `INSERT INTO reviews (booking_id, customer_id, provider_id, rating, review, created_at)
                     VALUES ($1, $2, $3, $4, $5, now() - ($6 || ' days')::interval + interval '3 hours')`,
                    [bookingId, cust, prov.id, rating, text, String(daysAgo)]
                );
            }
        }

        // ---- aane wali bookings (dashboards par "live" kaam dikhe) ----
        const upcoming = [
            ["pending", "sharma", 1, "11:00"],
            ["provider_accepted", "clean", 1, "15:00"],
            ["agent_assigned", "sharma", 1, "17:00"],
            ["agent_assigned", "kota", 2, "10:00"],
            ["pending", "glow", 2, "12:00"],
        ];
        for (const [i, [status, pk, inDays, time]] of upcoming.entries()) {
            const prov = providers[pk];
            const svc = rnd(prov.offered, i + 1);
            const [addr, lat, lng] = rnd(ADDRESSES, i + 2);
            await client.query(
                `INSERT INTO bookings (customer_id, provider_id, agent_id, service_id, service_name, address, latitude, longitude,
                    booking_date, booking_time, status, price, provider_accepted_at, agent_assigned_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (now() + ($9 || ' days')::interval)::date, $10, $11::text, $12,
                    CASE WHEN $11::text <> 'pending' THEN now() ELSE NULL END,
                    CASE WHEN $11::text = 'agent_assigned' THEN now() ELSE NULL END)`,
                [customerIds[i % 2], prov.id, status === "agent_assigned" ? prov.agents[0] : null, svc.id, svc.name, addr, lat, lng, String(inDays), time, status, svc.price]
            );
            made++;
        }

        // Upcoming bookings: provider ko notification
        await client.query(
            `INSERT INTO notifications (user_id, booking_id, title, message, type)
             SELECT b.provider_id, b.id, 'New booking request', 'New ' || b.service_name || ' booking on ' || b.booking_date || '.', 'booking_update'
             FROM bookings b JOIN users u ON u.id = b.provider_id
             WHERE u.email LIKE $1 AND b.status = 'pending'`,
            [`%@${DOMAIN}`]
        );

        await client.query("COMMIT");
        console.log(`Demo ready: ${Object.keys(providers).length} providers, ${PEOPLE.agents.length} agents, ${customerIds.length} customers, ${made} bookings.`);
        console.log("Logins (password = DEMO_PASSWORD):");
        console.log(`  Admin     admin@${DOMAIN}     -> /admin/login`);
        console.log(`  Customer  customer@${DOMAIN}`);
        console.log(`  Provider  provider@${DOMAIN}`);
        console.log(`  Agent     agent@${DOMAIN}`);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

main()
    .then(() => pool.end())
    .catch((err) => {
        console.error("Demo seed failed:", err.message);
        process.exit(1);
    });
