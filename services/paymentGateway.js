/**
 * Payment gateway wrapper.
 *
 *  - RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET set hain  -> asli Razorpay (test ya live keys)
 *  - keys nahi hain aur NODE_ENV != production       -> "mock" gateway (sirf development/testing)
 *  - production mein keys nahi                        -> online payment band, sirf cash
 *    (sirf demo deployment ke liye PAYMENT_DEMO_MODE=true: test checkout, koi asli paisa nahi)
 *
 * Razorpay ka REST API seedha fetch se use hota hai (SDK ki zaroorat nahi).
 */
const crypto = require("crypto");

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const IS_PROD = process.env.NODE_ENV === "production";
const MOCK_SECRET = "urbino-mock-gateway-secret";

function mode() {
    if (KEY_ID && KEY_SECRET) return "razorpay";
    if ((!IS_PROD || process.env.PAYMENT_DEMO_MODE === "true") && process.env.PAYMENT_MOCK !== "false") return "mock";
    return "disabled";
}

function hmac(secret, data) {
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function safeEqual(a, b) {
    const x = Buffer.from(String(a || ""));
    const y = Buffer.from(String(b || ""));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function razorpay(method, path, body) {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
            Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data?.error?.description || `Razorpay error (${res.status})`);
        err.statusCode = 502;
        throw err;
    }
    return data;
}

/** amount rupees mein; gateway ko paise mein jaata hai. */
async function createOrder({ amount, receipt, notes }) {
    const paise = Math.round(Number(amount) * 100);
    const m = mode();

    if (m === "razorpay") {
        const order = await razorpay("POST", "/orders", { amount: paise, currency: "INR", receipt, notes });
        return { gateway: "razorpay", orderId: order.id, amount: paise, currency: "INR", keyId: KEY_ID };
    }
    if (m === "mock") {
        return {
            gateway: "mock",
            orderId: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
            amount: paise,
            currency: "INR",
            keyId: "mock",
        };
    }
    const err = new Error("Online payments are not available right now. Please choose cash.");
    err.statusCode = 503;
    throw err;
}

/** Checkout ke baad client jo signature bhejta hai use verify karo. */
function verifyCheckoutSignature({ gateway, orderId, paymentId, signature }) {
    const secret = gateway === "mock" ? MOCK_SECRET : KEY_SECRET;
    if (gateway === "mock" && mode() !== "mock") return false;
    if (!secret) return false;
    return safeEqual(hmac(secret, `${orderId}|${paymentId}`), signature);
}

/** Sirf mock mode: test checkout ka signature banao (frontend ka "Pay (test)" button). */
function mockSign(orderId, paymentId) {
    if (mode() !== "mock") throw new Error("Mock gateway is disabled");
    return hmac(MOCK_SECRET, `${orderId}|${paymentId}`);
}

function verifyWebhookSignature(rawBody, signature) {
    if (!WEBHOOK_SECRET) return false;
    return safeEqual(hmac(WEBHOOK_SECRET, rawBody), signature);
}

async function refund({ gateway, paymentId, amount }) {
    if (gateway === "razorpay") {
        const r = await razorpay("POST", `/payments/${paymentId}/refund`, {
            amount: Math.round(Number(amount) * 100),
            speed: "normal",
        });
        return { refundId: r.id, status: r.status === "processed" ? "refunded" : "refund_pending" };
    }
    if (gateway === "mock") {
        return { refundId: `rfnd_mock_${crypto.randomBytes(6).toString("hex")}`, status: "refunded" };
    }
    // cash / manual: paisa haath se wapas karna hoga
    return { refundId: null, status: "refund_pending" };
}

module.exports = {
    mode,
    createOrder,
    verifyCheckoutSignature,
    verifyWebhookSignature,
    mockSign,
    refund,
};
