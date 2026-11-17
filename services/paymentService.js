const gateway = require("./paymentGateway");
const paymentModel = require("../models/paymentModel");
const { createNotification } = require("../models/notificationModel");
const redisClient = require("../config/redis");
const CACHE_KEYS = require("../config/cacheKeys");

function notify(userId, bookingId, title, message, type) {
    if (!userId) return;
    createNotification(userId, bookingId, title, message, type).catch((err) =>
        console.error("[notify] payment:", err.message)
    );
}

/** Payment successful hone par sabko batao + dashboard cache saaf. */
async function afterPaymentSuccess(payment, booking) {
    await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
    notify(
        payment.customer_id,
        payment.booking_id,
        "Payment successful",
        `We received ₹${Number(payment.amount)} for booking #${payment.booking_id}. Thank you!`,
        "payment_successful"
    );
    if (booking?.provider_id) {
        notify(
            booking.provider_id,
            payment.booking_id,
            "Payment received",
            `Booking #${payment.booking_id} has been paid (₹${Number(payment.amount)}).`,
            "payment_successful"
        );
    }
}

/**
 * Successful payment ka refund. Gateway fail ho to "refund_pending" rakhte hain
 * taaki admin Payments page par dekh sake.
 */
async function refundPayment(payment, reason = "Refund") {
    if (!payment || payment.payment_status !== "successful") return null;
    let outcome;
    try {
        outcome = await gateway.refund({
            gateway: payment.gateway,
            paymentId: payment.gateway_payment_id,
            amount: payment.amount,
        });
    } catch (err) {
        console.error("[refund] gateway error:", err.message);
        outcome = { refundId: null, status: "refund_pending" };
    }
    const updated = await paymentModel.markRefund(payment.id, { status: outcome.status, refund_id: outcome.refundId });
    await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
    notify(
        payment.customer_id,
        payment.booking_id,
        outcome.status === "refunded" ? "Refund processed" : "Refund initiated",
        outcome.status === "refunded"
            ? `₹${Number(payment.amount)} for booking #${payment.booking_id} has been refunded. ${reason}.`
            : `We have started a refund of ₹${Number(payment.amount)} for booking #${payment.booking_id}. ${reason}.`,
        "booking_update"
    );
    return updated;
}

/** Booking cancel hone par uska paid amount wapas. */
async function refundForBooking(bookingId, reason) {
    const payment = await paymentModel.getPaymentByBooking(bookingId);
    if (payment?.payment_status === "successful") return refundPayment(payment, reason);
    return null;
}

module.exports = { afterPaymentSuccess, refundPayment, refundForBooking, notify };
