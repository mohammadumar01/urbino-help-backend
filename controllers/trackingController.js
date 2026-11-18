const pool = require("../config/db");
const { haversineKm, etaMinutes, readLatLng } = require("../utils/geo");

const SHARE_STATUSES = ["on_the_way", "in_progress"];
const STALE_SECONDS = 120;

/**
 * POST /api/agent/jobs/:id/location { latitude, longitude, accuracy?, heading? }
 * Agent ka phone har ~15 sec location bhejta hai jab woh "on the way" ya kaam par ho.
 */
const updateAgentLocation = async (req, res, next) => {
    try {
        const bookingId = Number(req.params.id);
        const p = readLatLng(req.body);
        if (!p) return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
        const accuracy = Number.isFinite(Number(req.body.accuracy)) ? Math.min(100000, Math.round(Number(req.body.accuracy))) : null;
        const heading = Number.isFinite(Number(req.body.heading)) ? Math.round(Number(req.body.heading)) % 360 : null;

        const r = await pool.query(
            `
            INSERT INTO booking_tracking (booking_id, agent_id, latitude, longitude, accuracy_m, heading, updated_at)
            SELECT b.id, b.agent_id, $3, $4, $5, $6, CURRENT_TIMESTAMP
            FROM bookings b
            WHERE b.id = $1 AND b.agent_id = $2 AND b.status = ANY($7)
            ON CONFLICT (booking_id) DO UPDATE SET
                latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                accuracy_m = EXCLUDED.accuracy_m, heading = EXCLUDED.heading,
                agent_id = EXCLUDED.agent_id, updated_at = CURRENT_TIMESTAMP
            RETURNING booking_id, updated_at
            `,
            [bookingId, req.user.id, p.lat, p.lng, accuracy, heading, SHARE_STATUSES]
        );
        if (!r.rows[0]) {
            return res.status(409).json({ success: false, message: "Location is shared only while you are on the way or working on this job." });
        }
        res.json({ success: true, updated_at: r.rows[0].updated_at });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/tracking/:bookingId
 * Customer (apni booking), provider (apni booking), assigned agent, ya admin.
 * Customer ko agent ki location sirf "on the way" ke dauraan dikhti hai.
 */
const getTracking = async (req, res, next) => {
    try {
        const bookingId = Number(req.params.bookingId);
        if (!Number.isInteger(bookingId) || bookingId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid booking id" });
        }
        const r = await pool.query(
            `
            SELECT b.id, b.status, b.address, b.latitude::float AS latitude, b.longitude::float AS longitude,
                   b.customer_id, b.provider_id, b.agent_id, b.on_the_way_at, b.started_at,
                   a.name AS agent_name, a.phone AS agent_phone,
                   t.latitude::float AS agent_lat, t.longitude::float AS agent_lng, t.accuracy_m, t.heading,
                   t.updated_at AS location_at,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.updated_at))::int AS age_seconds
            FROM bookings b
            LEFT JOIN users a ON a.id = b.agent_id
            LEFT JOIN booking_tracking t ON t.booking_id = b.id
            WHERE b.id = $1
            `,
            [bookingId]
        );
        const b = r.rows[0];
        const role = req.user.role;
        const allowed =
            b &&
            (role === "admin" ||
                ((role === "customer" || role === "user") && b.customer_id === req.user.id) ||
                (role === "provider" && b.provider_id === req.user.id) ||
                (role === "agent" && b.agent_id === req.user.id));
        if (!allowed) return res.status(404).json({ success: false, message: "Booking not found" });

        const visibleStatuses = role === "customer" || role === "user" ? ["on_the_way"] : SHARE_STATUSES;
        const live = b.agent_lat != null && visibleStatuses.includes(b.status);
        const destination = b.latitude != null ? { latitude: b.latitude, longitude: b.longitude, address: b.address } : { latitude: null, longitude: null, address: b.address };

        let distance_km = null;
        if (live && b.latitude != null) {
            distance_km = Math.round(haversineKm(b.agent_lat, b.agent_lng, b.latitude, b.longitude) * 10) / 10;
        }

        res.json({
            success: true,
            tracking: {
                booking_id: b.id,
                status: b.status,
                destination,
                agent: b.agent_id ? { name: b.agent_name, phone: b.status === "completed" ? null : b.agent_phone } : null,
                live,
                agent_location: live
                    ? { latitude: b.agent_lat, longitude: b.agent_lng, accuracy_m: b.accuracy_m, heading: b.heading, updated_at: b.location_at, stale: b.age_seconds > STALE_SECONDS }
                    : null,
                distance_km,
                eta_minutes: distance_km != null ? etaMinutes(distance_km) : null,
                arrived: distance_km != null && distance_km < 0.15,
            },
        });
    } catch (err) {
        next(err);
    }
};

/** Job khatam / cancel: location turant mitao. */
async function clearTracking(bookingId) {
    await pool.query("DELETE FROM booking_tracking WHERE booking_id = $1", [bookingId]).catch(() => {});
}

module.exports = { updateAgentLocation, getTracking, clearTracking };
