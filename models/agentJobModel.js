const crypto = require("crypto");
const pool = require("../config/db");

/**
 * Agent ke job ki har step ek hi atomic UPDATE se. Galat status se aage nahi badhta.
 *   agent_assigned -> agent_accepted (OTP banta hai) -> on_the_way -> in_progress (OTP chahiye) -> completed
 *   agent_assigned / agent_accepted -> decline (wapas provider ke paas)
 */
const FLOW = {
    accept: { from: ["agent_assigned"], to: "agent_accepted", stamp: "agent_accepted_at" },
    on_the_way: { from: ["agent_accepted"], to: "on_the_way", stamp: "on_the_way_at" },
    start: { from: ["on_the_way"], to: "in_progress", stamp: "started_at" },
    complete: { from: ["in_progress"], to: "completed", stamp: "completed_at" },
};

const JOB_SELECT = `
    SELECT
        b.id, b.status, b.service_name, b.address, b.booking_date, b.booking_time, b.price,
        b.customer_id, c.name AS customer_name, c.phone AS customer_phone,
        b.provider_id, p.name AS provider_name, p.phone AS provider_phone,
        b.provider_accepted_at, b.agent_assigned_at, b.agent_accepted_at, b.on_the_way_at, b.started_at, b.completed_at,
        b.created_at,
        pay.payment_status, pay.payment_method
    FROM bookings b
    JOIN users c ON c.id = b.customer_id
    LEFT JOIN users p ON p.id = b.provider_id
    LEFT JOIN LATERAL (
        SELECT payment_status, payment_method FROM payments
        WHERE booking_id = b.id
        ORDER BY (payment_status = 'successful') DESC, created_at DESC, id DESC
        LIMIT 1
    ) pay ON TRUE
`;

const GROUPS = {
    new: ["agent_assigned"],
    active: ["agent_accepted", "on_the_way", "in_progress"],
    done: ["completed"],
};

/** Agent ki jobs: group = new | active | done | all */
const listAgentJobs = async (agentId, { group, search, page, limit }) => {
    const values = [agentId];
    let where = "WHERE b.agent_id = $1";
    if (GROUPS[group]) {
        values.push(GROUPS[group]);
        where += ` AND b.status = ANY($${values.length}::text[])`;
    }
    if (search) {
        values.push(`%${search}%`);
        where += ` AND (c.name ILIKE $${values.length} OR b.service_name ILIKE $${values.length} OR b.address ILIKE $${values.length})`;
    }
    // Naye aur active jobs: sabse paas wala time pehle. Done: latest pehle.
    const order = group === "done" ? "b.completed_at DESC NULLS LAST" : "b.booking_date ASC, b.booking_time ASC";
    const [rows, total] = await Promise.all([
        pool.query(
            `${JOB_SELECT} ${where} ORDER BY ${order}, b.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
            [...values, limit, (page - 1) * limit]
        ),
        pool.query(
            `SELECT COUNT(*)::int AS n FROM bookings b JOIN users c ON c.id = b.customer_id ${where}`,
            values
        ),
    ]);
    return { jobs: rows.rows, total: total.rows[0].n };
};

const getAgentJob = async (agentId, bookingId) => {
    const r = await pool.query(`${JOB_SELECT} WHERE b.id = $1 AND b.agent_id = $2`, [bookingId, agentId]);
    return r.rows[0];
};

const agentSummary = async (agentId) => {
    const r = await pool.query(
        `
        SELECT
            COUNT(*) FILTER (WHERE status = 'agent_assigned')::int AS new,
            COUNT(*) FILTER (WHERE status IN ('agent_accepted', 'on_the_way', 'in_progress'))::int AS active,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE)::int AS completed_today,
            COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND booking_date = CURRENT_DATE)::int AS today,
            (SELECT ROUND(AVG(rv.rating)::numeric, 1)::float FROM reviews rv JOIN bookings bb ON bb.id = rv.booking_id WHERE bb.agent_id = $1) AS rating
        FROM bookings
        WHERE agent_id = $1
        `,
        [agentId]
    );
    return r.rows[0];
};

/** Ek step aage badhao. Accept par 4-digit start OTP banta hai. */
const advanceJob = async (agentId, bookingId, action) => {
    const f = FLOW[action];
    const otp = action === "accept" ? String(crypto.randomInt(1000, 10000)) : null;
    const r = await pool.query(
        `
        UPDATE bookings
        SET status = $3,
            ${f.stamp} = CURRENT_TIMESTAMP,
            start_otp = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE start_otp END,
            start_otp_attempts = CASE WHEN $4::text IS NOT NULL THEN 0 ELSE start_otp_attempts END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND agent_id = $2 AND status = ANY($5::text[])
        RETURNING id, status, customer_id, provider_id, service_name, booking_date, booking_time
        `,
        [bookingId, agentId, f.to, otp, f.from]
    );
    return r.rows[0];
};

/**
 * Start OTP check. Galat OTP par attempts badhte hain; 5 galat ke baad lock.
 * Return: "ok" | "wrong" | "locked" | "not_found"
 */
const checkStartOtp = async (agentId, bookingId, otp) => {
    const r = await pool.query(
        "SELECT start_otp, start_otp_attempts, status FROM bookings WHERE id = $1 AND agent_id = $2",
        [bookingId, agentId]
    );
    const b = r.rows[0];
    if (!b || b.status !== "on_the_way") return "not_found";
    if (!b.start_otp) return "ok"; // purani bookings jinka OTP nahi bana
    if (b.start_otp_attempts >= 5) return "locked";
    if (String(otp || "").trim() === b.start_otp) return "ok";
    await pool.query("UPDATE bookings SET start_otp_attempts = start_otp_attempts + 1 WHERE id = $1", [bookingId]);
    return "wrong";
};

/** Agent job mana kare: booking wapas provider ke paas (provider_accepted). */
const declineJob = async (agentId, bookingId, reason) => {
    const r = await pool.query(
        `
        UPDATE bookings
        SET status = 'provider_accepted',
            agent_id = NULL,
            agent_assigned_at = NULL,
            agent_accepted_at = NULL,
            start_otp = NULL,
            agent_declined_reason = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND agent_id = $2 AND status IN ('agent_assigned', 'agent_accepted')
        RETURNING id, customer_id, provider_id, service_name, booking_date, booking_time
        `,
        [bookingId, agentId, reason]
    );
    return r.rows[0];
};

module.exports = { FLOW, listAgentJobs, getAgentJob, agentSummary, advanceJob, checkStartOtp, declineJob };
