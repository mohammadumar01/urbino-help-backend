const payouts = require("../models/payoutModel");
const { notify } = require("../services/paymentService");

const money = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** GET /api/payment/provider/earnings  (provider) */
const myEarnings = async (req, res, next) => {
    try {
        const data = await payouts.providerEarnings(req.user.id);
        res.json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};

/** GET /api/payment/admin/payouts  (admin) */
const listPayouts = async (req, res, next) => {
    try {
        res.json({ success: true, ...(await payouts.listBalances()) });
    } catch (err) {
        next(err);
    }
};

/** POST /api/payment/admin/payouts { provider_id, direction, amount, reference?, note? }  (admin) */
const createPayout = async (req, res, next) => {
    try {
        const providerId = Number(req.body.provider_id);
        const direction = req.body.direction;
        const amount = Math.round(Number(req.body.amount) * 100) / 100;
        const reference = req.body.reference ? String(req.body.reference).trim().slice(0, 120) : null;
        const note = req.body.note ? String(req.body.note).trim().slice(0, 500) : null;

        if (!Number.isInteger(providerId) || providerId <= 0) {
            return res.status(400).json({ success: false, message: "provider_id is required" });
        }
        if (!["to_provider", "from_provider"].includes(direction)) {
            return res.status(400).json({ success: false, message: "direction must be to_provider or from_provider" });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Enter an amount greater than 0" });
        }

        const result = await payouts.recordPayout({ providerId, direction, amount, reference, note, adminId: req.user.id });
        if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });

        notify(
            providerId,
            null,
            direction === "to_provider" ? "Payout sent" : "Commission payment received",
            direction === "to_provider"
                ? `Urbino has sent you ${money(amount)}${reference ? ` (ref ${reference})` : ""}.`
                : `We received your commission payment of ${money(amount)}. Thank you!`,
            "payment_successful"
        );
        res.status(201).json({ success: true, message: "Settlement recorded", ...result });
    } catch (err) {
        next(err);
    }
};

module.exports = { myEarnings, listPayouts, createPayout };
