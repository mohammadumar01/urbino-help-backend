const pool = require("../config/db");
const { createNotification } = require("../models/notificationModel");
const { clearCustomerBookingCache } = require("../utils/cacheUtils");
const { invalidatePublic } = require("../middleware/cacheMiddleware");

/**
 * Urbino Service Guarantee: kaam complete hone ke 7 din ke andar customer free rework maang sakta hai.
 *  requested -> accepted (provider ne free rework booking banayi)
 *  requested -> escalated (provider ne mana kiya -> support team dekhegi)
 */
const GUARANTEE_DAYS = 7;

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

async function notify(userId, bookingId, title, message) {
    if (!userId) return;
    try {
        await createNotification(userId, bookingId, title, message, "booking_update");
    } catch (err) {
        console.error("[notify] claim:", err.message);
    }
}

function istToday() {
    return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** POST /api/claims { booking_id, reason, preferred_date?, preferred_time? }  (customer) */
const createClaim = async (req, res, next) => {
    try {
        const bookingId = Number(req.body?.booking_id);
        const reason = String(req.body?.reason || "").trim().slice(0, 1000);
        if (!bookingId) return bad(res, 400, "booking_id is required");
        if (reason.length < 10) return bad(res, 400, "Please tell us what went wrong (at least 10 characters).");

        const pd = req.body?.preferred_date ? String(req.body.preferred_date) : null;
        const pt = req.body?.preferred_time ? String(req.body.preferred_time).slice(0, 5) : null;
        if (pd && (!/^\d{4}-\d{2}-\d{2}$/.test(pd) || pd < istToday())) return bad(res, 400, "Preferred date must be today or later.");
        if (pt && !/^([01]\d|2[0-3]):[0-5]\d$/.test(pt)) return bad(res, 400, "Preferred time must be HH:MM.");

        const { rows } = await pool.query(
            `
            SELECT id, customer_id, provider_id, status, completed_at, service_name, rework_of,
                   (completed_at >= NOW() - ($2 || ' days')::interval) AS within_window
            FROM bookings WHERE id = $1
            `,
            [bookingId, String(GUARANTEE_DAYS)]
        );
        const b = rows[0];
        if (!b || b.customer_id !== req.user.id) return bad(res, 404, "Booking not found");
        if (b.status !== "completed") return bad(res, 400, "You can ask for a rework only after the job is completed.");
        if (b.rework_of) return bad(res, 400, "This was already a free rework. Please contact support from Help.");
        if (!b.within_window) return bad(res, 400, `The service guarantee covers ${GUARANTEE_DAYS} days after completion. Please contact support.`);

        const ins = await pool.query(
            `
            INSERT INTO service_claims (booking_id, customer_id, provider_id, reason, preferred_date, preferred_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [b.id, req.user.id, b.provider_id, reason, pd, pt]
        );

        await notify(
            b.provider_id,
            b.id,
            "Rework requested",
            `Customer asked for a free rework on booking #${b.id} (${b.service_name}): ${reason.slice(0, 120)}`
        );
        await clearCustomerBookingCache(req.user.id);

        res.status(201).json({
            success: true,
            message: "Request sent. Your provider will schedule a free fix, usually within 24 hours.",
            claim: ins.rows[0],
        });
    } catch (e) {
        if (e.code === "23505") return bad(res, 409, "You already raised a request for this booking.");
        next(e);
    }
};

/** GET /api/claims/provider?status=requested|accepted|escalated|all  (provider) */
const providerClaims = async (req, res, next) => {
    try {
        const status = ["requested", "accepted", "escalated"].includes(req.query.status) ? req.query.status : null;
        const values = [req.user.id];
        let where = "WHERE c.provider_id = $1";
        if (status) {
            values.push(status);
            where += " AND c.status = $2";
        }
        const { rows } = await pool.query(
            `
            SELECT c.*, b.service_name, b.address, b.booking_date AS original_date, b.completed_at,
                   cu.name AS customer_name, cu.phone AS customer_phone, ag.name AS agent_name,
                   rb.booking_date AS rework_date, left(rb.booking_time, 5) AS rework_time, rb.status AS rework_status
            FROM service_claims c
            JOIN bookings b ON b.id = c.booking_id
            JOIN users cu ON cu.id = c.customer_id
            LEFT JOIN users ag ON ag.id = b.agent_id
            LEFT JOIN bookings rb ON rb.id = c.rework_booking_id
            ${where}
            ORDER BY (c.status = 'requested') DESC, c.created_at DESC
            LIMIT 100
            `,
            values
        );
        res.json({ success: true, claims: rows });
    } catch (e) {
        next(e);
    }
};

async function loadOwnClaim(claimId, providerId) {
    const { rows } = await pool.query(
        `
        SELECT c.*, b.service_id, b.service_name, b.address
        FROM service_claims c JOIN bookings b ON b.id = c.booking_id
        WHERE c.id = $1 AND c.provider_id = $2
        `,
        [claimId, providerId]
    );
    return rows[0];
}

/** PUT /api/claims/:id/accept { booking_date, booking_time, note? }  (provider) -> free rework booking */
const acceptClaim = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const date = String(req.body?.booking_date || "");
        const time = String(req.body?.booking_time || "").slice(0, 5);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < istToday()) return bad(res, 400, "Pick a date from today onwards.");
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return bad(res, 400, "Pick a valid time (HH:MM).");
        const note = String(req.body?.note || "").trim().slice(0, 500) || null;

        const c = await loadOwnClaim(Number(req.params.id), req.user.id);
        if (!c) return bad(res, 404, "Request not found");
        if (c.status !== "requested") return bad(res, 409, "This request has already been handled.");

        await client.query("BEGIN");
        const rb = await client.query(
            `
            INSERT INTO bookings (customer_id, service_id, service_name, address, booking_date, booking_time,
                                  provider_id, price, status, provider_accepted_at, rework_of)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'provider_accepted', CURRENT_TIMESTAMP, $8)
            RETURNING id
            `,
            [c.customer_id, c.service_id, `${c.service_name} (free rework)`, c.address, date, time, req.user.id, c.booking_id]
        );
        const upd = await client.query(
            `
            UPDATE service_claims
            SET status = 'accepted', provider_note = $2, rework_booking_id = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'requested'
            RETURNING *
            `,
            [c.id, note, rb.rows[0].id]
        );
        if (!upd.rows[0]) {
            await client.query("ROLLBACK");
            return bad(res, 409, "This request has already been handled.");
        }
        await client.query("COMMIT");

        await clearCustomerBookingCache(c.customer_id);
        await invalidatePublic("slots");
        await notify(
            c.customer_id,
            rb.rows[0].id,
            "Free rework scheduled",
            `Your provider will fix booking #${c.booking_id} for free on ${date} at ${time}.${note ? ` Note: ${note}` : ""}`
        );

        res.json({
            success: true,
            message: "Free rework booked. Assign a professional from your bookings.",
            claim: upd.rows[0],
            rework_booking_id: rb.rows[0].id,
        });
    } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        next(e);
    } finally {
        client.release();
    }
};

/** PUT /api/claims/:id/reject { note }  (provider) -> Urbino support reviews it */
const rejectClaim = async (req, res, next) => {
    try {
        const note = String(req.body?.note || "").trim().slice(0, 500);
        if (note.length < 10) return bad(res, 400, "Please explain why (at least 10 characters). Our team will review it.");

        const c = await loadOwnClaim(Number(req.params.id), req.user.id);
        if (!c) return bad(res, 404, "Request not found");
        if (c.status !== "requested") return bad(res, 409, "This request has already been handled.");

        const { rows: u } = await pool.query("SELECT name, phone FROM users WHERE id = $1", [c.customer_id]);
        const t = await pool.query(
            `
            INSERT INTO support_tickets (user_id, name, phone, booking_id, category, message)
            VALUES ($1, $2, $3, $4, 'professional', $5)
            RETURNING id
            `,
            [
                c.customer_id,
                u[0]?.name || null,
                u[0]?.phone || null,
                c.booking_id,
                `Service guarantee dispute on booking #${c.booking_id}.\nCustomer: ${c.reason}\nProvider declined: ${note}`,
            ]
        );
        const upd = await pool.query(
            `
            UPDATE service_claims
            SET status = 'escalated', provider_note = $2, support_ticket_id = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'requested'
            RETURNING *
            `,
            [c.id, note, t.rows[0].id]
        );

        await clearCustomerBookingCache(c.customer_id);
        await notify(
            c.customer_id,
            c.booking_id,
            "We're reviewing your request",
            `Your provider couldn't take the rework for booking #${c.booking_id}. Urbino support will call you within 24 hours.`
        );

        res.json({ success: true, message: "Sent to Urbino support for review.", claim: upd.rows[0] });
    } catch (e) {
        next(e);
    }
};

module.exports = { createClaim, providerClaims, acceptClaim, rejectClaim, GUARANTEE_DAYS };
