const m = require("../models/providerAvailabilityModel");
const { validateSchedule, getFreeSlots } = require("../services/availabilityService");
const { invalidatePublic } = require("../middleware/cacheMiddleware");

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

const getMyAvailability = async (req, res, next) => {
    try {
        const availability = await m.getProviderAvailability(req.user.id);
        res.status(200).json({ success: true, availability });
    } catch (error) {
        next(error);
    }
};

/** PUT /api/provider-availability { schedule: [{ day_of_week, start_time, end_time }] } */
const replaceMyAvailability = async (req, res, next) => {
    try {
        const schedule = (req.body?.schedule || []).map((r) => ({
            day_of_week: r?.day_of_week,
            start_time: String(r?.start_time || "").slice(0, 5),
            end_time: String(r?.end_time || "").slice(0, 5),
        }));
        const error = validateSchedule(schedule);
        if (error) return bad(res, 400, error);
        const availability = await m.replaceSchedule(req.user.id, schedule);
        await invalidatePublic("slots");
        res.status(200).json({ success: true, message: "Working hours saved", availability });
    } catch (error) {
        next(error);
    }
};

/** POST /api/provider-availability { day_of_week, start_time, end_time }  (ek range jodo) */
const createProviderAvailability = async (req, res, next) => {
    try {
        const range = {
            day_of_week: req.body?.day_of_week,
            start_time: String(req.body?.start_time || "").slice(0, 5),
            end_time: String(req.body?.end_time || "").slice(0, 5),
        };
        const existing = await m.getProviderAvailability(req.user.id);
        const error = validateSchedule([...existing, range]);
        if (error) return bad(res, 400, error);
        const availability = await m.createAvailability(req.user.id, range.day_of_week, range.start_time, range.end_time);
        await invalidatePublic("slots");
        res.status(201).json({ success: true, message: "Working hours added", availability });
    } catch (error) {
        next(error);
    }
};

const deleteMyAvailability = async (req, res, next) => {
    try {
        const row = await m.deleteAvailability(req.user.id, Number(req.params.id));
        if (!row) return bad(res, 404, "Time range not found");
        await invalidatePublic("slots");
        res.status(200).json({ success: true, message: "Time range removed" });
    } catch (error) {
        next(error);
    }
};

/** GET /api/provider-availability/slots?provider_id=&date=YYYY-MM-DD  (public) */
const getAvailableProviderSlots = async (req, res, next) => {
    try {
        const providerId = Number(req.query.provider_id);
        const date = String(req.query.date || "");
        if (!Number.isInteger(providerId) || providerId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
            return bad(res, 400, "provider_id and date (YYYY-MM-DD) are required");
        }
        const { hasSchedule, slots, slotMinutes } = await getFreeSlots(providerId, date);
        res.status(200).json({
            success: true,
            provider_id: providerId,
            date,
            has_schedule: hasSchedule,
            slot_minutes: slotMinutes,
            slots,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyAvailability,
    replaceMyAvailability,
    createProviderAvailability,
    deleteMyAvailability,
    getAvailableProviderSlots,
};
