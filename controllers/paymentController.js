const crypto = require("crypto");
const gateway = require("../services/paymentGateway");
const paymentService = require("../services/paymentService");
const pm = require("../models/paymentModel");

const PAYABLE_BLOCKED = ["cancelled"];
const CASH_COLLECTABLE = ["in_progress", "completed"];

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/** Payment ka public shape (andar ki fields bahar nahi). */
function view(p) {
    if (!p) return null;
    return {
        id: p.id,
        booking_id: p.booking_id,
        amount: Number(p.amount),
        payment_method: p.payment_method,
        payment_status: p.payment_status,
        gateway: p.gateway,
        transaction_id: p.transaction_id,
        paid_at: p.paid_at,
        refunded_at: p.refunded_at,
        failure_reason: p.failure_reason,
        created_at: p.created_at,
    };
}

/** Customer ki booking jiske liye payment ho sakta hai, warna error message. */
async function loadPayableBooking(bookingId, customerId) {
    const booking = await pm.getBookingWithPayment(bookingId);
    if (!booking || booking.customer_id !== customerId) return { error: [404, "Booking not found"] };
    if (PAYABLE_BLOCKED.includes(booking.status)) return { error: [400, "Cannot pay for a cancelled booking"] };
    if (booking.payment_status === "successful") return { error: [409, "This booking is already paid"] };
    if (booking.price == null || Number(booking.price) <= 0) {
        return { error: [400, "This booking has no price yet. Please contact support."] };
    }
    return { booking };
}

/**
 * POST /api/payment/order  { booking_id, method: "ONLINE" | "CASH" }
 * ONLINE: gateway order banata hai (Razorpay checkout ke liye).
 * CASH: service ke baad cash dena hai; provider/agent "collected" mark karega.
 */
const createPaymentOrder = async (req, res, next) => {
    try {
        const bookingId = Number(req.body.booking_id);
        const method = String(req.body.method || "ONLINE").toUpperCase();
        if (!bookingId) return bad(res, 400, "booking_id is required");
        if (!["ONLINE", "CASH"].includes(method)) return bad(res, 400, "method must be ONLINE or CASH");

        const { booking, error } = await loadPayableBooking(bookingId, req.user.id);
        if (error) return bad(res, ...error);

        const amount = Number(booking.price);
        let order = null;
        let fields;

        if (method === "CASH") {
            fields = { payment_method: "CASH", gateway: "cash", gateway_order_id: null, amount };
        } else {
            order = await gateway.createOrder({
                amount,
                receipt: `booking_${booking.id}`,
                notes: { booking_id: String(booking.id), customer_id: String(req.user.id) },
            });
            fields = { payment_method: "ONLINE", gateway: order.gateway, gateway_order_id: order.orderId, amount };
        }

        // Pending/failed payment pehle se hai to wahi row reuse karo (duplicate rows nahi)
        let payment =
            booking.payment_id && ["pending", "failed"].includes(booking.payment_status)
                ? await pm.repointPendingPayment(booking.payment_id, fields)
                : null;
        if (!payment) {
            payment = await pm.createPayment({ booking_id: booking.id, customer_id: req.user.id, ...fields });
        }

        if (method === "CASH" && booking.provider_id) {
            paymentService.notify(
                booking.provider_id,
                booking.id,
                "Cash payment",
                `Customer will pay ₹${amount} in cash for booking #${booking.id}. Mark it collected after the service.`,
                "booking_update"
            );
        }

        return res.status(201).json({
            success: true,
            payment: view(payment),
            order: order && {
                id: order.orderId,
                amount: order.amount,
                currency: order.currency,
                key_id: order.keyId,
                gateway: order.gateway,
                name: "Urbino Help",
                description: `${booking.service_name} (Booking #${booking.id})`,
                prefill: { name: req.user.name, email: req.user.email },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/payment/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Checkout ke baad browser yeh bhejta hai. Signature server par verify hota hai.
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return bad(res, 400, "Payment details are incomplete");
        }

        const payment = await pm.getPaymentByOrderId(razorpay_order_id);
        if (!payment || payment.customer_id !== req.user.id) return bad(res, 404, "Payment not found");

        const valid = gateway.verifyCheckoutSignature({
            gateway: payment.gateway,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!valid) {
            await pm.markPaymentFailed(payment.id, "Signature verification failed");
            return bad(res, 400, "Payment could not be verified. If money was deducted, it will be refunded automatically.");
        }

        const result = await pm.markPaymentSuccessful(payment.id, { gateway_payment_id: razorpay_payment_id });
        if (!result.alreadyDone) {
            const booking = await pm.getBookingWithPayment(payment.booking_id);
            await paymentService.afterPaymentSuccess(result.payment, booking);
        }

        return res.status(200).json({ success: true, message: "Payment successful", payment: view(result.payment) });
    } catch (error) {
        // Unique index: is booking ka koi aur payment pehle hi successful hai
        if (error.code === "23505") return bad(res, 409, "This booking is already paid");
        next(error);
    }
};

/** POST /api/payment/failed  { razorpay_order_id, reason }  checkout band/fail hua */
const reportPaymentFailure = async (req, res, next) => {
    try {
        const payment = await pm.getPaymentByOrderId(req.body.razorpay_order_id);
        if (!payment || payment.customer_id !== req.user.id) return bad(res, 404, "Payment not found");
        const updated = await pm.markPaymentFailed(payment.id, req.body.reason || "Payment was not completed");
        return res.status(200).json({ success: true, payment: view(updated || payment) });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/payment/mock-checkout  { order_id, outcome: "success" | "failure" }
 * SIRF development (Razorpay keys nahi hain). Asli checkout jaisa response deta hai.
 */
const mockCheckout = async (req, res, next) => {
    try {
        if (gateway.mode() !== "mock") return bad(res, 404, "Route not found");
        const payment = await pm.getPaymentByOrderId(req.body.order_id);
        if (!payment || payment.customer_id !== req.user.id || payment.gateway !== "mock") {
            return bad(res, 404, "Payment not found");
        }
        if (req.body.outcome === "failure") {
            return res.status(200).json({ success: false, error: { description: "Test payment declined" } });
        }
        const paymentId = `pay_mock_${crypto.randomBytes(7).toString("hex")}`;
        return res.status(200).json({
            success: true,
            razorpay_order_id: payment.gateway_order_id,
            razorpay_payment_id: paymentId,
            razorpay_signature: gateway.mockSign(payment.gateway_order_id, paymentId),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/payment/webhook/razorpay  (raw body, no auth; signature se verify)
 * Browser band ho jaaye tab bhi payment ka status sahi rahe.
 */
const razorpayWebhook = async (req, res, next) => {
    try {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
        if (!gateway.verifyWebhookSignature(raw, req.get("x-razorpay-signature"))) {
            return bad(res, 400, "Invalid signature");
        }

        const event = JSON.parse(raw);
        const eventId = req.get("x-razorpay-event-id") || `${event.event}:${event.created_at}:${event.payload?.payment?.entity?.id || ""}`;
        const isNew = await pm.recordEvent("razorpay", eventId, event.event, event);
        if (!isNew) return res.status(200).json({ success: true, duplicate: true });

        const entity = event.payload?.payment?.entity;
        if (entity?.order_id) {
            const payment = await pm.getPaymentByOrderId(entity.order_id);
            if (payment) {
                if (event.event === "payment.captured" || event.event === "order.paid") {
                    const result = await pm.markPaymentSuccessful(payment.id, { gateway_payment_id: entity.id });
                    if (result && !result.alreadyDone) {
                        const booking = await pm.getBookingWithPayment(payment.booking_id);
                        await paymentService.afterPaymentSuccess(result.payment, booking);
                    }
                } else if (event.event === "payment.failed") {
                    await pm.markPaymentFailed(payment.id, entity.error_description || "Payment failed");
                }
            }
        }

        const refundEntity = event.payload?.refund?.entity;
        if (event.event === "refund.processed" && refundEntity?.payment_id) {
            const { rows } = await require("../config/db").query(
                "SELECT * FROM payments WHERE gateway_payment_id = $1",
                [refundEntity.payment_id]
            );
            if (rows[0]) await pm.markRefund(rows[0].id, { status: "refunded", refund_id: refundEntity.id });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === "23505") return res.status(200).json({ success: true });
        next(error);
    }
};

/**
 * PUT /api/payment/booking/:booking_id/cash-collected
 * Provider ya assigned agent: service ke baad cash mila.
 */
const markCashCollected = async (req, res, next) => {
    try {
        const booking = await pm.getBookingWithPayment(Number(req.params.booking_id));
        const isOwner =
            booking &&
            ((req.user.role === "provider" && booking.provider_id === req.user.id) ||
                (req.user.role === "agent" && booking.agent_id === req.user.id));
        if (!isOwner) return bad(res, 404, "Booking not found");
        if (!CASH_COLLECTABLE.includes(booking.status)) {
            return bad(res, 400, "Cash can be collected only once the work has started");
        }
        if (booking.payment_status === "successful") return bad(res, 409, "This booking is already paid");
        if (booking.price == null) return bad(res, 400, "This booking has no price");

        let paymentId = booking.payment_id;
        if (!paymentId || !["pending", "failed"].includes(booking.payment_status)) {
            const created = await pm.createPayment({
                booking_id: booking.id,
                customer_id: booking.customer_id,
                amount: booking.price,
                payment_method: "CASH",
                gateway: "cash",
            });
            paymentId = created.id;
        } else if (booking.gateway !== "cash") {
            await pm.repointPendingPayment(paymentId, {
                payment_method: "CASH",
                gateway: "cash",
                gateway_order_id: null,
                amount: booking.price,
            });
        }

        const result = await pm.markPaymentSuccessful(paymentId, {
            transaction_id: `cash_${booking.id}_${Date.now()}`,
            collected_by: req.user.id,
        });
        if (!result.alreadyDone) await paymentService.afterPaymentSuccess(result.payment, booking);

        return res.status(200).json({ success: true, message: "Cash payment recorded", payment: view(result.payment) });
    } catch (error) {
        if (error.code === "23505") return bad(res, 409, "This booking is already paid");
        next(error);
    }
};

/** GET /api/payment/booking/:booking_id  (customer, provider, agent ya admin) */
const getBookingPayment = async (req, res, next) => {
    try {
        const booking = await pm.getBookingWithPayment(Number(req.params.booking_id));
        const u = req.user;
        const allowed =
            booking &&
            (u.role === "admin" ||
                booking.customer_id === u.id ||
                booking.provider_id === u.id ||
                booking.agent_id === u.id);
        if (!allowed) return bad(res, 404, "Payment not found");

        const payment = await pm.getPaymentByBooking(booking.id);
        if (!payment) return bad(res, 404, "Payment not found");
        return res.status(200).json({ success: true, payment: view(payment) });
    } catch (error) {
        next(error);
    }
};

/** GET /api/payment/config  frontend ko batao kaunsa mode chalu hai */
const getPaymentConfig = (req, res) => {
    const mode = gateway.mode();
    res.json({
        success: true,
        online: mode !== "disabled",
        gateway: mode,
        test_mode: mode === "mock" || (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_"),
        commission_percent: pm.COMMISSION_PERCENT,
    });
};

/* ------------------------------- Admin ------------------------------- */

const listAllPayments = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const data = await pm.listPayments({
            status: String(req.query.status || "").trim(),
            method: String(req.query.method || "").trim(),
            search: String(req.query.search || "").trim().slice(0, 100),
            page,
            limit,
            sortBy: req.query.sortBy,
            order: req.query.order,
        });
        res.json({
            success: true,
            currentPage: page,
            limit,
            totalPayments: data.total,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
            summary: data.summary,
            payments: data.payments,
        });
    } catch (error) {
        next(error);
    }
};

/** POST /api/payment/:id/refund  (admin) */
const refundPaymentById = async (req, res, next) => {
    try {
        const payment = await pm.getPaymentById(Number(req.params.id));
        if (!payment) return bad(res, 404, "Payment not found");

        // refund_pending (jaise cash) ko admin "refunded" mark kar sakta hai jab paisa de diya
        if (payment.payment_status === "refund_pending") {
            const updated = await pm.markRefund(payment.id, { status: "refunded", refund_id: req.body.refund_id || null });
            return res.json({ success: true, message: "Marked as refunded", payment: view(updated) });
        }
        if (payment.payment_status !== "successful") return bad(res, 400, "Only successful payments can be refunded");

        const updated = await paymentService.refundPayment(payment, req.body.reason || "Refunded by Urbino support");
        return res.json({
            success: true,
            message: updated?.payment_status === "refunded" ? "Refund processed" : "Refund initiated",
            payment: view(updated),
        });
    } catch (error) {
        next(error);
    }
};

/** PUT /api/payment/:id/status  (admin manual correction) */
const changePaymentStatus = async (req, res, next) => {
    try {
        const { payment_status, transaction_id } = req.body;
        const allowed = ["pending", "successful", "failed", "refund_pending", "refunded"];
        if (!allowed.includes(payment_status)) return bad(res, 400, "Invalid payment status");

        const payment = await pm.updatePaymentStatus(Number(req.params.id), payment_status, transaction_id);
        if (!payment) return bad(res, 404, "Payment not found");

        if (payment_status === "successful") {
            const booking = await pm.getBookingWithPayment(payment.booking_id);
            await paymentService.afterPaymentSuccess(payment, booking);
        }
        return res.status(200).json({ success: true, message: "Payment status updated successfully", payment: view(payment) });
    } catch (error) {
        if (error.code === "23505") return bad(res, 409, "This booking already has a successful payment");
        next(error);
    }
};

/** POST /api/payment  (purana endpoint) -> ab createPaymentOrder ki tarah */
const createNewPayment = async (req, res, next) => {
    const legacy = String(req.body.payment_method || "").toUpperCase();
    req.body.method = legacy === "CASH" ? "CASH" : "ONLINE";
    return createPaymentOrder(req, res, next);
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    reportPaymentFailure,
    mockCheckout,
    razorpayWebhook,
    markCashCollected,
    getBookingPayment,
    getPaymentConfig,
    listAllPayments,
    refundPaymentById,
    changePaymentStatus,
    createNewPayment,
};
