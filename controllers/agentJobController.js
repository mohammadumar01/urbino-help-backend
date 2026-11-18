const m = require("../models/agentJobModel");
const { clearTracking } = require("./trackingController");
const { createNotification } = require("../models/notificationModel");
const redisClient = require("../config/redis");
const CACHE_KEYS = require("../config/cacheKeys");
const { clearCustomerBookingCache } = require("../utils/cacheUtils");
const { invalidatePublic } = require("../middleware/cacheMiddleware");

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

async function notify(userId, bookingId, title, message, type) {
    if (!userId) return;
    try {
        await createNotification(userId, bookingId, title, message, type);
    } catch (err) {
        console.error("[notify] agent:", err.message);
    }
}

async function afterChange(b) {
    await Promise.all([
        clearCustomerBookingCache(b.customer_id),
        redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD),
        invalidatePublic("slots"),
    ]);
}

/** Har step par customer aur provider ko kya batana hai */
const MESSAGES = {
    accept: {
        customer: ["Professional confirmed", (b) => `Your ${b.service_name} professional has confirmed booking #${b.id}. Share the start code only when they arrive.`, "agent_accepted"],
        provider: ["Agent accepted", (b) => `Your agent accepted booking #${b.id}.`, "agent_accepted"],
        ok: "Job accepted. The customer has been told you're coming.",
    },
    on_the_way: {
        customer: ["Professional on the way", (b) => `Your professional is on the way for booking #${b.id}.`, "agent_on_the_way"],
        provider: ["Agent on the way", (b) => `Agent left for booking #${b.id}.`, "agent_on_the_way"],
        ok: "Marked on the way. The customer has been notified.",
    },
    start: {
        customer: ["Work started", (b) => `Work has started on booking #${b.id}.`, "work_started"],
        provider: ["Work started", (b) => `Agent started work on booking #${b.id}.`, "work_started"],
        ok: "Code verified. Work started.",
    },
    complete: {
        customer: ["Work completed", (b) => `Booking #${b.id} is complete. Please pay if you haven't, and rate your professional.`, "work_completed"],
        provider: ["Job completed", (b) => `Agent completed booking #${b.id}.`, "work_completed"],
        ok: "Job completed. Great work!",
    },
};

/** GET /api/agent/jobs?group=new|active|done|all&search=&page=&limit= */
const listJobs = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const group = ["new", "active", "done", "all"].includes(req.query.group) ? req.query.group : "all";
        const { jobs, total } = await m.listAgentJobs(req.user.id, {
            group,
            search: String(req.query.search || "").trim().slice(0, 100),
            page,
            limit,
        });
        res.json({ success: true, currentPage: page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), jobs });
    } catch (e) {
        next(e);
    }
};

const getSummary = async (req, res, next) => {
    try {
        res.json({ success: true, summary: await m.agentSummary(req.user.id) });
    } catch (e) {
        next(e);
    }
};

const getJob = async (req, res, next) => {
    try {
        const job = await m.getAgentJob(req.user.id, Number(req.params.id));
        if (!job) return bad(res, 404, "Job not found");
        res.json({ success: true, job });
    } catch (e) {
        next(e);
    }
};

function step(action) {
    return async (req, res, next) => {
        try {
            const id = Number(req.params.id);

            if (action === "start") {
                const check = await m.checkStartOtp(req.user.id, id, req.body?.otp);
                if (check === "not_found") return bad(res, 409, "You can start only after marking yourself on the way.");
                if (check === "locked") return bad(res, 423, "Too many wrong codes. Ask the provider to help.");
                if (check === "wrong") return bad(res, 400, "That code is not right. Ask the customer for the 4-digit start code.");
            }

            const b = await m.advanceJob(req.user.id, id, action);
            if (!b) {
                const current = await m.getAgentJob(req.user.id, id);
                if (!current) return bad(res, 404, "Job not found");
                return bad(res, 409, `This job is already "${current.status.replaceAll("_", " ")}". Refresh to see the latest.`);
            }

            await afterChange(b);
            if (action === "complete") await clearTracking(b.id);
            const msg = MESSAGES[action];
            await notify(b.customer_id, b.id, msg.customer[0], msg.customer[1](b), msg.customer[2]);
            await notify(b.provider_id, b.id, msg.provider[0], msg.provider[1](b), msg.provider[2]);

            const job = await m.getAgentJob(req.user.id, id);
            res.json({ success: true, message: msg.ok, booking: job, job });
        } catch (e) {
            next(e);
        }
    };
}

/** PUT /api/agent/decline/:id { reason } */
const declineJob = async (req, res, next) => {
    try {
        const reason = String(req.body?.reason || "").trim().slice(0, 300);
        if (reason.length < 3) return bad(res, 400, "Please tell the provider why you can't take this job.");
        const b = await m.declineJob(req.user.id, Number(req.params.id), reason);
        if (!b) return bad(res, 409, "This job can't be declined now (already on the way or finished).");
        await afterChange(b);
        await notify(b.provider_id, b.id, "Agent declined a job", `Booking #${b.id} needs a new agent. Reason: ${reason}`, "booking_update");
        res.json({ success: true, message: "Job declined. The provider will assign someone else." });
    } catch (e) {
        next(e);
    }
};

module.exports = {
    listJobs,
    getSummary,
    getJob,
    acceptJob: step("accept"),
    onTheWay: step("on_the_way"),
    startJob: step("start"),
    completeJob: step("complete"),
    declineJob,
};
