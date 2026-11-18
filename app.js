const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require("./config/swagger");
const pool = require("./config/db");
const redisClient = require("./config/redis");
const errorHandler = require("./middleware/errorMiddleware");
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");
const ROLES = require("./constants/roles");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const agentRoutes = require("./routes/agentRoutes");
const providerProfileRoutes = require("./routes/providerProfileRoutes");
const providerServiceRoutes = require("./routes/providerServiceRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const providerVerificationRoutes = require("./routes/providerVerificationRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const providerAvailabilityRoutes = require("./routes/providerAvailabilityRoutes");
const providerAgentRoutes = require("./routes/providerAgentRoutes");
const agentServiceRoutes = require("./routes/agentServiceRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const providerBookingRoutes = require("./routes/providerBookingRoutes");
const serviceDiscoveryRoutes = require("./routes/serviceDiscoveryRoutes");

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Reverse proxy (Nginx / load balancer) ke peeche sahi client IP mile
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
app.disable("x-powered-by");

// ---------- Security & performance ----------
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

// Sirf apne frontend(s) ko allow karo. FRONTEND_URL comma-separated ho sakta hai.
const originSuffixes = (process.env.CORS_ORIGIN_SUFFIXES || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.startsWith("."));
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, cb) {
            // Postman / server-to-server calls mein origin nahi hota
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            // Demo tunnel ka URL har baar badalta hai: CORS_ORIGIN_SUFFIXES=.lhr.life se poora domain allow
            if (originSuffixes.some((sfx) => /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(origin) && origin.endsWith(sfx))) {
                return cb(null, true);
            }
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

// Razorpay webhook ko raw body chahiye (signature isi par banta hai), isliye json parser se pehle
app.post(
    "/api/payment/webhook/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    require("./controllers/paymentController").razorpayWebhook
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ---------- Rate limits ----------
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN) || 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please slow down." },
});

// Login/register par brute-force rokne ke liye sakht limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts. Try again in a few minutes." },
});

const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many chatbot messages. Please wait a minute." },
});

// ---------- Health ----------
app.get("/", (req, res) => {
    res.json({ success: true, message: "Urbino Help Backend running" });
});

app.get("/health", async (req, res) => {
    let db = "down";
    try {
        await pool.query("SELECT 1");
        db = "up";
    } catch {
        /* db down */
    }
    const redis = redisClient.isReady() ? "up" : "down";
    res.status(db === "up" ? 200 : 503).json({
        success: db === "up",
        db,
        redis,
        uptime: Math.round(process.uptime()),
    });
});

// ---------- Routes ----------
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/chatbot", chatbotLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
// Bookings sirf customer ke liye; provider booking actions sirf provider ke liye
app.use("/api/booking", authMiddleware, roleMiddleware(ROLES.CUSTOMER), bookingRoutes);
app.use("/api/provider/agents", providerAgentRoutes);
// Frontend ka purana path bhi chale
app.use("/api/provider-agents", providerAgentRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/provider-profile", providerProfileRoutes);
app.use("/api/provider-services", providerServiceRoutes);
app.use("/api/provider-availability", providerAvailabilityRoutes);
app.use("/api/provider-bookings", authMiddleware, roleMiddleware(ROLES.PROVIDER), providerBookingRoutes);
app.use("/api/provider-verification", providerVerificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminVerificationRoutes);
app.use("/api/admin", require("./routes/adminCatalogRoutes"));
app.use("/api/agent", agentRoutes);
app.use("/api/agent-services", agentServiceRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/service-discovery", serviceDiscoveryRoutes);
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/claims", require("./routes/claimRoutes"));
app.use("/api/geo", require("./routes/geoRoutes"));
app.use("/api/tracking", require("./routes/trackingRoutes"));

// API docs production mein band (ENABLE_API_DOCS=true se khol sakte ho)
if (!isProd || process.env.ENABLE_API_DOCS === "true") {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ---------- 404 + errors ----------
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

module.exports = app;
