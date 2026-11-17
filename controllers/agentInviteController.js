const pool = require("../config/db");
const { createNotification } = require("../models/notificationModel");

/**
 * Provider apni team banata hai: agent ko invite bhejta hai, agent accept kare tab hi judta hai.
 * (Pehle provider kisi bhi agent ko bina poochhe jod sakta tha.)
 */

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

async function notify(userId, title, message) {
    try {
        await createNotification(userId, null, title, message, "booking_update");
    } catch (err) {
        console.error("[notify] invite:", err.message);
    }
}

/** Provider ki team: agents + har agent ki verification aur kaam ka haal. */
const listTeam = async (req, res, next) => {
    try {
        const [agents, invites] = await Promise.all([
            pool.query(
                `
                SELECT pa.id, pa.provider_id, pa.agent_id, u.name AS agent_name, u.email AS agent_email, u.phone AS agent_phone,
                       pa.created_at, ap.verification_status, ap.experience_years, ap.skills,
                       (SELECT COUNT(*) FROM bookings b WHERE b.agent_id = u.id AND b.provider_id = $1
                          AND b.status IN ('agent_assigned','agent_accepted','on_the_way','in_progress'))::int AS active_jobs,
                       (SELECT COUNT(*) FROM bookings b WHERE b.agent_id = u.id AND b.provider_id = $1 AND b.status = 'completed')::int AS completed_jobs
                FROM provider_agents pa
                JOIN users u ON u.id = pa.agent_id AND u.role = 'agent' AND u.is_deleted IS NOT TRUE
                LEFT JOIN agent_profiles ap ON ap.agent_id = u.id
                WHERE pa.provider_id = $1
                ORDER BY u.name
                `,
                [req.user.id]
            ),
            pool.query(
                `
                SELECT i.id, i.agent_id, u.name AS agent_name, u.email AS agent_email, u.phone AS agent_phone, i.status, i.created_at
                FROM agent_invites i JOIN users u ON u.id = i.agent_id
                WHERE i.provider_id = $1 AND i.status = 'pending'
                ORDER BY i.created_at DESC
                `,
                [req.user.id]
            ),
        ]);
        res.json({ success: true, agents: agents.rows, invites: invites.rows });
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/provider/agents  { email | phone | agent_id }
 * Agent ko invite bhejo (seedha team mein nahi judta).
 */
const inviteAgent = async (req, res, next) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const phone = String(req.body?.phone || "").replace(/\D/g, "").slice(-10);
        const agentId = Number(req.body?.agent_id) || null;
        if (!email && phone.length !== 10 && !agentId) {
            return bad(res, 400, "Enter the professional's email or 10-digit phone number.");
        }

        const { rows } = await pool.query(
            `
            SELECT id, name, role FROM users
            WHERE is_deleted IS NOT TRUE
              AND (($1 <> '' AND lower(email) = $1)
                OR ($2 <> '' AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = $2)
                OR id = $3)
            ORDER BY (role = 'agent') DESC
            LIMIT 1
            `,
            [email, phone.length === 10 ? phone : "", agentId]
        );
        const a = rows[0];
        if (!a) {
            return bad(res, 404, "No Urbino professional account found. Ask them to sign up as a professional first, then invite again.");
        }
        if (a.role !== "agent") return bad(res, 400, "This account is not a professional (agent) account.");
        if (a.id === req.user.id) return bad(res, 400, "You can't invite yourself.");

        const linked = await pool.query("SELECT 1 FROM provider_agents WHERE provider_id = $1 AND agent_id = $2", [req.user.id, a.id]);
        if (linked.rowCount) return bad(res, 409, `${a.name} is already in your team.`);

        const inv = await pool.query(
            `
            INSERT INTO agent_invites (provider_id, agent_id, message)
            VALUES ($1, $2, $3)
            RETURNING id, agent_id, status, created_at
            `,
            [req.user.id, a.id, String(req.body?.message || "").trim().slice(0, 300) || null]
        );
        const { rows: p } = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
        await notify(a.id, "Team invite", `${p[0]?.name || "A provider"} invited you to join their team on Urbino. Open your jobs app to accept.`);

        res.status(201).json({ success: true, message: `Invite sent to ${a.name}. They'll join once they accept.`, invite: inv.rows[0] });
    } catch (e) {
        if (e.code === "23505") return bad(res, 409, "An invite is already pending for this professional.");
        next(e);
    }
};

/** DELETE /api/provider/agents/invites/:id  (provider cancels a pending invite) */
const cancelInvite = async (req, res, next) => {
    try {
        const r = await pool.query(
            "UPDATE agent_invites SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP WHERE id = $1 AND provider_id = $2 AND status = 'pending' RETURNING id",
            [Number(req.params.id), req.user.id]
        );
        if (!r.rowCount) return bad(res, 404, "Invite not found");
        res.json({ success: true, message: "Invite cancelled." });
    } catch (e) {
        next(e);
    }
};

/** GET /api/agent/invites  (agent) */
const myInvites = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT i.id, i.provider_id, u.name AS provider_name, u.phone AS provider_phone, i.message, i.created_at,
                   pp.service_area, pp.is_verified AS provider_verified,
                   (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.provider_id = u.id) AS provider_rating
            FROM agent_invites i
            JOIN users u ON u.id = i.provider_id
            LEFT JOIN provider_profiles pp ON pp.provider_id = u.id
            WHERE i.agent_id = $1 AND i.status = 'pending'
            ORDER BY i.created_at DESC
            `,
            [req.user.id]
        );
        res.json({ success: true, invites: rows });
    } catch (e) {
        next(e);
    }
};

/** PUT /api/agent/invites/:id/accept | decline  (agent) */
function respond(accept) {
    return async (req, res, next) => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const r = await client.query(
                `
                UPDATE agent_invites SET status = $3, responded_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND agent_id = $2 AND status = 'pending'
                RETURNING provider_id
                `,
                [Number(req.params.id), req.user.id, accept ? "accepted" : "declined"]
            );
            if (!r.rowCount) {
                await client.query("ROLLBACK");
                return bad(res, 404, "Invite not found or already answered.");
            }
            const providerId = r.rows[0].provider_id;
            if (accept) {
                await client.query(
                    "INSERT INTO provider_agents (provider_id, agent_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    [providerId, req.user.id]
                );
            }
            await client.query("COMMIT");

            const { rows: me } = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
            await notify(
                providerId,
                accept ? "Professional joined your team" : "Invite declined",
                accept
                    ? `${me[0]?.name || "A professional"} accepted your invite. You can now assign jobs to them.`
                    : `${me[0]?.name || "A professional"} declined your team invite.`
            );
            res.json({ success: true, message: accept ? "You've joined the team. New jobs will appear here." : "Invite declined." });
        } catch (e) {
            await client.query("ROLLBACK").catch(() => {});
            next(e);
        } finally {
            client.release();
        }
    };
}

module.exports = { listTeam, inviteAgent, cancelInvite, myInvites, acceptInvite: respond(true), declineInvite: respond(false) };
