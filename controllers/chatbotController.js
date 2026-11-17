const pool = require("../config/db");
const { generateAIResponse } = require("../services/aiService");

/** Logged-in customer ki haal ki bookings ka chhota summary (AI ko context). */
async function bookingContext(user) {
    if (!user || user.role !== "customer") return user ? `Role: ${user.role}.` : "";
    const { rows } = await pool.query(
        `
        SELECT b.id, b.service_name, b.status, b.booking_date, left(b.booking_time, 5) AS t, b.price,
               p.name AS provider, a.name AS agent,
               (SELECT payment_status FROM payments WHERE booking_id = b.id
                ORDER BY (payment_status = 'successful') DESC, created_at DESC LIMIT 1) AS payment
        FROM bookings b
        LEFT JOIN users p ON p.id = b.provider_id
        LEFT JOIN users a ON a.id = b.agent_id
        WHERE b.customer_id = $1
        ORDER BY b.created_at DESC
        LIMIT 5
        `,
        [user.id]
    );
    if (!rows.length) return "Customer has no bookings yet.";
    return (
        "Customer's latest bookings:\n" +
        rows
            .map(
                (b) =>
                    `#${b.id} ${b.service_name}, ${b.booking_date} ${b.t}, status ${b.status.replaceAll("_", " ")}, ` +
                    `price ₹${b.price ?? "?"}, payment ${b.payment || "unpaid"}` +
                    (b.provider ? `, provider ${b.provider}` : "") +
                    (b.agent ? `, professional ${b.agent}` : "")
            )
            .join("\n")
    );
}

/**
 * POST /api/chatbot/message
 * { message, history?: [{ role: "user"|"assistant", content }] }
 */
const sendMessage = async (req, res, next) => {
    try {
        const message = String(req.body?.message || "").trim().slice(0, 1000);
        if (!message) return res.status(400).json({ success: false, message: "Message is required" });

        const history = Array.isArray(req.body?.history)
            ? req.body.history
                  .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
                  .slice(-10)
            : [];
        history.push({ role: "user", content: message });

        const context = await bookingContext(req.user).catch(() => "");
        const { reply, handoff, source } = await generateAIResponse(history, context);

        return res.status(200).json({
            success: true,
            response: reply, // purane clients ke liye
            reply,
            handoff,
            source,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { sendMessage };
