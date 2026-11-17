const pool = require("../config/db");
const { createNotification } = require("../models/notificationModel");

const CATEGORIES = ["booking", "payment", "refund", "professional", "safety", "account", "other"];

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/**
 * POST /api/support/tickets   (login optional)
 * { message, category?, booking_id?, name?, phone?, transcript? }
 */
const createTicket = async (req, res, next) => {
    try {
        const message = String(req.body?.message || "").trim().slice(0, 2000);
        if (message.length < 5) return bad(res, 400, "Please describe the problem in a few words.");
        const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "other";

        let name = String(req.body?.name || "").trim().slice(0, 100) || null;
        let phone = String(req.body?.phone || "").replace(/[^\d+]/g, "").slice(0, 15) || null;
        let userId = null;
        let bookingId = Number(req.body?.booking_id) || null;

        if (req.user) {
            userId = req.user.id;
            const { rows } = await pool.query("SELECT name, phone FROM users WHERE id = $1", [userId]);
            name = name || rows[0]?.name || null;
            phone = phone || rows[0]?.phone || null;
            if (bookingId) {
                // Sirf apni booking attach ho sakti hai
                const own = await pool.query(
                    "SELECT 1 FROM bookings WHERE id = $1 AND (customer_id = $2 OR provider_id = $2 OR agent_id = $2)",
                    [bookingId, userId]
                );
                if (!own.rowCount) bookingId = null;
            }
        } else {
            bookingId = null;
            if (!phone || phone.replace(/\D/g, "").length < 10) {
                return bad(res, 400, "Please share a phone number so our team can call you back.");
            }
        }

        const transcript = Array.isArray(req.body?.transcript)
            ? req.body.transcript.slice(-20).map((m) => ({ role: String(m.role).slice(0, 10), content: String(m.content).slice(0, 1000) }))
            : null;

        const { rows } = await pool.query(
            `
            INSERT INTO support_tickets (user_id, name, phone, booking_id, category, message, chat_transcript)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, status, created_at
            `,
            [userId, name, phone, bookingId, category, message, transcript ? JSON.stringify(transcript) : null]
        );

        res.status(201).json({
            success: true,
            message: `Request #${rows[0].id} received. Our team will contact you within 2 hours (9 AM - 9 PM).`,
            ticket: rows[0],
        });
    } catch (e) {
        next(e);
    }
};

/** GET /api/support/my-tickets */
const myTickets = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, category, message, status, admin_note, booking_id, created_at, updated_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
            [req.user.id]
        );
        res.json({ success: true, tickets: rows });
    } catch (e) {
        next(e);
    }
};

/** GET /api/support/tickets?status=open|in_progress|resolved|all&page=&limit=  (admin) */
const listTickets = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const status = ["open", "in_progress", "resolved"].includes(req.query.status) ? req.query.status : null;
        const values = [];
        let where = "";
        if (status) {
            values.push(status);
            where = "WHERE t.status = $1";
        }
        const [rows, total, counts] = await Promise.all([
            pool.query(
                `
                SELECT t.*, u.email AS user_email, u.role AS user_role
                FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
                ${where}
                ORDER BY (t.status = 'resolved'), t.created_at ASC
                LIMIT $${values.length + 1} OFFSET $${values.length + 2}
                `,
                [...values, limit, (page - 1) * limit]
            ),
            pool.query(`SELECT COUNT(*)::int AS n FROM support_tickets t ${where}`, values),
            pool.query(`
                SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open,
                       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
                       COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
                FROM support_tickets
            `),
        ]);
        res.json({
            success: true,
            currentPage: page,
            totalTickets: total.rows[0].n,
            totalPages: Math.max(1, Math.ceil(total.rows[0].n / limit)),
            counts: counts.rows[0],
            tickets: rows.rows,
        });
    } catch (e) {
        next(e);
    }
};

/** PATCH /api/support/tickets/:id  { status, admin_note? }  (admin) */
const updateTicket = async (req, res, next) => {
    try {
        const status = req.body?.status;
        if (!["open", "in_progress", "resolved"].includes(status)) return bad(res, 400, "Invalid status");
        const note = req.body?.admin_note == null ? null : String(req.body.admin_note).trim().slice(0, 1000);
        const { rows } = await pool.query(
            `
            UPDATE support_tickets
            SET status = $2::VARCHAR(20), admin_note = COALESCE($3::TEXT, admin_note),
                resolved_by = CASE WHEN $2::VARCHAR(20) = 'resolved' THEN $4::INTEGER ELSE resolved_by END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [Number(req.params.id), status, note, req.user.id]
        );
        const t = rows[0];
        if (!t) return bad(res, 404, "Ticket not found");
        if (t.user_id && status === "resolved") {
            await createNotification(
                t.user_id,
                t.booking_id,
                `Support request #${t.id} resolved`,
                t.admin_note ? `Our team says: ${t.admin_note}` : "Our team has resolved your request. Reply in Help if you still need anything.",
                "booking_update"
            ).catch(() => {});
        }
        res.json({ success: true, message: "Ticket updated", ticket: t });
    } catch (e) {
        next(e);
    }
};

module.exports = { createTicket, myTickets, listTickets, updateTicket, CATEGORIES };
