const pool = require("../config/db");

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** IST mein aaj ki date (YYYY-MM-DD) */
function todayIst(offsetDays = 0) {
    return new Date(Date.now() + 5.5 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD   (default: last 30 days, IST)
 * Business report: bookings, revenue, commission, speed of service, top services/providers.
 */
const getReport = async (req, res, next) => {
    try {
        const to = ISO.test(String(req.query.to)) ? String(req.query.to) : todayIst();
        const from = ISO.test(String(req.query.from)) ? String(req.query.from) : todayIst(-29);
        if (from > to) return res.status(400).json({ success: false, message: "'from' must be before 'to'" });
        const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
        if (days > 366) return res.status(400).json({ success: false, message: "Choose a range of at most one year" });

        // DB timestamps IST local time mein hain (config/db.js SET TIME ZONE)
        const range = [from, to];
        const inRange = (col) => `${col} >= $1::date AND ${col} < ($2::date + 1)`;

        const [totals, daily, byStatus, services, providers, methods, speed] = await Promise.all([
            pool.query(
                `
                SELECT
                    (SELECT COUNT(*) FROM bookings b WHERE ${inRange("b.created_at")})::int AS bookings,
                    (SELECT COUNT(*) FROM bookings b WHERE ${inRange("b.created_at")} AND b.status = 'completed')::int AS completed,
                    (SELECT COUNT(*) FROM bookings b WHERE ${inRange("b.created_at")} AND b.status = 'cancelled')::int AS cancelled,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.payment_status = 'successful' AND ${inRange("p.paid_at")})::float AS revenue,
                    (SELECT COALESCE(SUM(p.platform_fee), 0) FROM payments p WHERE p.payment_status = 'successful' AND ${inRange("p.paid_at")})::float AS commission,
                    (SELECT COUNT(*) FROM payments p WHERE p.payment_status = 'successful' AND ${inRange("p.paid_at")})::int AS paid_orders,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.payment_status IN ('refunded', 'refund_pending') AND ${inRange("COALESCE(p.refunded_at, p.updated_at)")})::float AS refunds,
                    (SELECT COUNT(*) FROM users u WHERE u.role IN ('customer', 'user') AND ${inRange("u.created_at")})::int AS new_customers,
                    (SELECT COUNT(*) FROM users u WHERE u.role = 'provider' AND ${inRange("u.created_at")})::int AS new_providers,
                    (SELECT COUNT(DISTINCT b.provider_id) FROM bookings b WHERE ${inRange("b.created_at")} AND b.provider_id IS NOT NULL)::int AS active_providers,
                    (SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE ${inRange("r.created_at")})::float AS avg_rating,
                    (SELECT COUNT(*) FROM reviews r WHERE ${inRange("r.created_at")})::int AS reviews,
                    (SELECT COUNT(*) FROM service_claims sc WHERE ${inRange("sc.created_at")})::int AS guarantee_claims,
                    (SELECT COUNT(*) FROM support_tickets t WHERE ${inRange("t.created_at")})::int AS support_tickets
                `,
                range
            ),
            pool.query(
                `
                WITH d AS (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day)
                SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
                       COALESCE(b.bookings, 0)::int AS bookings,
                       COALESCE(b.completed, 0)::int AS completed,
                       COALESCE(p.revenue, 0)::float AS revenue
                FROM d
                LEFT JOIN (
                    SELECT created_at::date AS day,
                           COUNT(*) AS bookings, COUNT(*) FILTER (WHERE status = 'completed') AS completed
                    FROM bookings GROUP BY 1
                ) b ON b.day = d.day
                LEFT JOIN (
                    SELECT paid_at::date AS day, SUM(amount) AS revenue
                    FROM payments WHERE payment_status = 'successful' GROUP BY 1
                ) p ON p.day = d.day
                ORDER BY d.day
                `,
                range
            ),
            pool.query(
                `SELECT status, COUNT(*)::int AS count FROM bookings b WHERE ${inRange("b.created_at")} GROUP BY status ORDER BY count DESC`,
                range
            ),
            pool.query(
                `
                SELECT b.service_name AS name, COUNT(*)::int AS bookings,
                       COUNT(*) FILTER (WHERE b.status = 'completed')::int AS completed,
                       COALESCE(SUM(p.amount), 0)::float AS revenue
                FROM bookings b
                LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'successful'
                WHERE ${inRange("b.created_at")}
                GROUP BY b.service_name ORDER BY bookings DESC, revenue DESC LIMIT 8
                `,
                range
            ),
            pool.query(
                `
                SELECT u.id, u.name, COUNT(b.id)::int AS bookings,
                       COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed,
                       COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::int AS cancelled,
                       COALESCE(SUM(p.provider_earning), 0)::float AS earnings,
                       (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.provider_id = u.id)::float AS rating
                FROM bookings b
                JOIN users u ON u.id = b.provider_id
                LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'successful'
                WHERE ${inRange("b.created_at")}
                GROUP BY u.id, u.name ORDER BY completed DESC, bookings DESC LIMIT 8
                `,
                range
            ),
            pool.query(
                `
                SELECT CASE WHEN upper(payment_method) = 'CASH' THEN 'Cash' ELSE 'Online' END AS method,
                       COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::float AS amount
                FROM payments p WHERE p.payment_status = 'successful' AND ${inRange("p.paid_at")}
                GROUP BY 1 ORDER BY amount DESC
                `,
                range
            ),
            pool.query(
                `
                SELECT
                    ROUND(AVG(EXTRACT(EPOCH FROM (b.provider_accepted_at - b.created_at)) / 60)
                          FILTER (WHERE b.provider_accepted_at > b.created_at))::int AS accept_minutes,
                    ROUND(AVG(EXTRACT(EPOCH FROM (b.started_at - b.on_the_way_at)) / 60)
                          FILTER (WHERE b.started_at > b.on_the_way_at))::int AS travel_minutes,
                    ROUND(AVG(EXTRACT(EPOCH FROM (b.completed_at - b.started_at)) / 60)
                          FILTER (WHERE b.completed_at > b.started_at))::int AS job_minutes
                FROM bookings b WHERE ${inRange("b.created_at")}
                `,
                range
            ),
        ]);

        const t = totals.rows[0];
        res.json({
            success: true,
            range: { from, to, days },
            totals: {
                ...t,
                completion_rate: t.bookings ? Math.round((t.completed / t.bookings) * 1000) / 10 : 0,
                cancel_rate: t.bookings ? Math.round((t.cancelled / t.bookings) * 1000) / 10 : 0,
                avg_order_value: t.paid_orders ? Math.round((t.revenue / t.paid_orders) * 100) / 100 : 0,
            },
            speed: speed.rows[0],
            daily: daily.rows,
            by_status: byStatus.rows,
            top_services: services.rows,
            top_providers: providers.rows,
            payment_methods: methods.rows,
        });
    } catch (e) {
        next(e);
    }
};

module.exports = { getReport };
