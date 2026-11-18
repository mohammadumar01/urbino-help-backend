const { readLatLng } = require("../utils/geo");
const { clearTracking } = require("./trackingController");
const CACHE_KEYS = require("../config/cacheKeys");
const redisClient = require("../config/redis");
const {
    getServiceForBooking,
    createBooking,
    getBookingsByCustomerId,
    getTotalBookingsByCustomerId,
    cancelBooking,
    rescheduleBooking,
    getCustomerBooking,
} = require("../models/bookingModel");
const { createNotification } = require("../models/notificationModel");
const { clearCustomerBookingCache } = require("../utils/cacheUtils");
const { invalidatePublic } = require("../middleware/cacheMiddleware");
const { refundForBooking } = require("../services/paymentService");
const { getFreeSlots } = require("../services/availabilityService");

function todayIso() {
    // India time (IST) ke hisaab se aaj ki date
    return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function validateDateTime(booking_date, booking_time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(booking_date)) || Number.isNaN(Date.parse(booking_date))) {
        return "Booking date must be in YYYY-MM-DD format.";
    }
    if (booking_date < todayIso()) {
        return "Booking date cannot be in the past.";
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(booking_time).slice(0, 5))) {
        return "Booking time must be in HH:MM format.";
    }
    return null;
}

/** Notification save karo (response se pehle), fail ho to booking na roke. */
async function notifySafe(tag, ...args) {
    try {
        await createNotification(...args);
    } catch (err) {
        console.error(`[notify] ${tag}:`, err.message);
    }
}

async function invalidateCaches(customerId) {
    await clearCustomerBookingCache(customerId);
    await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
    // naya/cancel booking -> free slots badle
    await invalidatePublic("slots");
}

const createCustomerBooking = async (req, res, next) => {
    try {
        const { service_id, service_name, address, booking_date, booking_time, provider_id } = req.body;

        if (!address || !booking_date || !booking_time || (!service_id && !service_name)) {
            return res.status(400).json({
                success: false,
                message: "service_id, address, booking_date and booking_time are required",
            });
        }

        const dateError = validateDateTime(booking_date, booking_time);
        if (dateError) {
            return res.status(400).json({ success: false, message: dateError });
        }

        // Map se chuna gaya exact location (optional)
        const point = readLatLng(req.body);
        if (point === null) {
            return res.status(400).json({ success: false, message: "Invalid map location. Please pick the address again." });
        }

        let finalServiceId = null;
        let finalServiceName = String(service_name || "").trim();
        let price = null;

        if (service_id) {
            const service = await getServiceForBooking(Number(service_id), provider_id ? Number(provider_id) : null);
            if (!service) {
                return res.status(404).json({ success: false, message: "Service not found" });
            }
            if (provider_id && !service.provider_offers_service) {
                return res.status(400).json({
                    success: false,
                    message: "Selected provider does not offer this service",
                });
            }
            finalServiceId = service.id;
            finalServiceName = service.name;
            price = service.provider_price ?? service.base_price;
        }

        // Provider ne working hours set kiye hain to sirf free slot par booking
        if (provider_id) {
            const { hasSchedule, slots } = await getFreeSlots(Number(provider_id), booking_date);
            if (hasSchedule && !slots.includes(String(booking_time).slice(0, 5))) {
                return res.status(409).json({
                    success: false,
                    message: "This time slot is not available. Please pick another time.",
                    available_slots: slots,
                });
            }
        }

        const booking = await createBooking({
            customer_id: req.user.id,
            service_id: finalServiceId,
            service_name: finalServiceName,
            address: String(address).trim(),
            booking_date,
            booking_time: String(booking_time).slice(0, 5),
            provider_id: provider_id ? Number(provider_id) : null,
            price,
            latitude: point?.lat ?? null,
            longitude: point?.lng ?? null,
        });

        await invalidateCaches(req.user.id);

        // Provider ko turant khabar
        if (booking.provider_id) {
            await notifySafe("new booking", booking.provider_id,
                booking.id,
                "New booking request",
                `New ${booking.service_name} booking on ${booking_date} at ${booking.booking_time}.`,
                "booking_update");
        }

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking,
        });
    } catch (error) {
        next(error);
    }
};

const ALLOWED_SORT = ["created_at", "booking_date", "service_name", "status"];

const getMyBooking = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const offset = (page - 1) * limit;
        const search = String(req.query.search || "").trim().slice(0, 100);
        const status = String(req.query.status || "").trim();
        const sortBy = ALLOWED_SORT.includes(req.query.sortBy) ? req.query.sortBy : "created_at";
        const order = String(req.query.order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        // Note: customer list cache nahi hoti. Status provider/agent/payment se kahin se bhi
        // badal sakta hai aur purani list dikhana galat hai. Query indexed hai (customer_id, created_at).
        const [bookings, totalBookings] = await Promise.all([
            getBookingsByCustomerId(req.user.id, limit, offset, search, status, sortBy, order),
            getTotalBookingsByCustomerId(req.user.id, search, status),
        ]);

        const response = {
            success: true,
            currentPage: page,
            limit,
            totalBookings,
            totalPages: Math.max(1, Math.ceil(totalBookings / limit)),
            bookings,
        };

        return res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

const cancelCustomerBooking = async (req, res, next) => {
    try {
        const result = await cancelBooking(Number(req.params.id), req.user.id);

        if (result.reason === "not_found") {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        if (result.reason === "not_cancellable") {
            return res.status(409).json({
                success: false,
                message: `This booking can no longer be cancelled (status: ${result.status.replaceAll("_", " ")}).`,
            });
        }

        const { booking } = result;
        await invalidateCaches(req.user.id);
        await clearTracking(booking.id);

        // Pehle se paid booking cancel hui to paisa wapas
        const refund = await refundForBooking(booking.id, "Booking cancelled").catch((err) => {
            console.error("[refund] on cancel:", err.message);
            return null;
        });

        const notifyIds = [booking.provider_id, booking.agent_id].filter(Boolean);
        for (const userId of notifyIds) {
            await notifySafe("cancel", userId,
                booking.id,
                "Booking cancelled",
                `Booking #${booking.id} (${booking.service_name}) was cancelled by the customer.`,
                "booking_update");
        }

        return res.status(200).json({
            success: true,
            message: refund
                ? refund.payment_status === "refunded"
                    ? "Booking cancelled. Your payment has been refunded."
                    : "Booking cancelled. Your refund has been initiated."
                : "Booking cancelled successfully",
            booking,
            refund_status: refund?.payment_status || null,
        });
    } catch (error) {
        next(error);
    }
};

const rescheduleCustomerBooking = async (req, res, next) => {
    try {
        const { booking_date, booking_time } = req.body;

        const dateError = validateDateTime(booking_date, booking_time);
        if (dateError) {
            return res.status(400).json({ success: false, message: dateError });
        }

        const current = await getCustomerBooking(Number(req.params.id), req.user.id);
        if (current?.provider_id) {
            const { hasSchedule, slots } = await getFreeSlots(current.provider_id, booking_date);
            const sameSlot = current.booking_date === booking_date && current.booking_time === String(booking_time).slice(0, 5);
            if (hasSchedule && !sameSlot && !slots.includes(String(booking_time).slice(0, 5))) {
                return res.status(409).json({
                    success: false,
                    message: "This time slot is not available. Please pick another time.",
                    available_slots: slots,
                });
            }
        }

        const booking = await rescheduleBooking(
            Number(req.params.id),
            req.user.id,
            booking_date,
            String(booking_time).slice(0, 5)
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or can no longer be rescheduled",
            });
        }

        await invalidateCaches(req.user.id);

        if (booking.provider_id) {
            await notifySafe("reschedule", booking.provider_id,
                booking.id,
                "Booking rescheduled",
                `Booking #${booking.id} moved to ${booking_date} at ${booking.booking_time}.`,
                "booking_update");
        }

        return res.status(200).json({
            success: true,
            message: "Booking rescheduled successfully",
            booking,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCustomerBooking,
    getMyBooking,
    cancelCustomerBooking,
    rescheduleCustomerBooking,
};
