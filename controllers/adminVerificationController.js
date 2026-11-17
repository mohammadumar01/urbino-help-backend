const {
    getPendingVerifications,
    updateVerificationStatus,
    syncProviderVerified,
    listProvidersForReview,
} = require("../models/adminVerificationModel");
const { createNotification } = require("../models/notificationModel");
const redisClient = require("../config/redis");
const CACHE_KEYS = require("../config/cacheKeys");
const { invalidatePublic } = require("../middleware/cacheMiddleware");

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function mask(num) {
    if (!num) return null;
    const s = String(num).replace(/\s+/g, "");
    return s.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

function notify(userId, title, message, type) {
    createNotification(userId, null, title, message, type).catch((err) =>
        console.error("[notify] verification:", err.message)
    );
}

/** GET /api/admin/verifications (purana: sirf pending documents, number masked) */
const getAllPendingVerification = async (req, res, next) => {
    try {
        const rows = await getPendingVerifications();
        res.status(200).json({
            success: true,
            verifications: rows.map((r) => ({ ...r, document_number: mask(r.document_number) })),
        });
    } catch (error) {
        next(error);
    }
};

/** GET /api/admin/provider-verifications?status=pending|verified|rejected|unverified|all&search=&page=&limit= */
const getProviderReviewQueue = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const status = ["pending", "verified", "rejected", "unverified", "all"].includes(req.query.status)
            ? req.query.status
            : "pending";
        const data = await listProvidersForReview({
            status,
            search: String(req.query.search || "").trim().slice(0, 100),
            page,
            limit,
        });
        res.status(200).json({
            success: true,
            currentPage: page,
            limit,
            totalProviders: data.total,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
            counts: data.counts,
            providers: data.providers.map((p) => ({
                ...p,
                documents: p.documents.map((d) => ({ ...d, document_number: mask(d.document_number) })),
            })),
        });
    } catch (error) {
        next(error);
    }
};

const approveVerification = async (req, res, next) => {
    try {
        const verification = await updateVerificationStatus(Number(req.params.id), "approved", null, req.user.id);
        if (!verification) return bad(res, 409, "This document is not waiting for review (already decided or not found).");

        const verified = await syncProviderVerified(verification.provider_id);
        await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
        await invalidatePublic("providers");

        notify(
            verification.provider_id,
            `${verification.document_type} approved`,
            verified
                ? "Your account is verified. You now have the Verified badge."
                : `Your ${verification.document_type} has been approved.`,
            "verification_approved"
        );

        return res.status(200).json({
            success: true,
            message: verified ? "Approved. Provider is now verified." : "Document approved.",
            provider_verified: verified,
            verification: { ...verification, document_number: mask(verification.document_number) },
        });
    } catch (error) {
        next(error);
    }
};

/** Pending ko reject, ya approved ko wapas lena (revoke). Reason zaroori. */
const rejectVerification = async (req, res, next) => {
    try {
        const reason = String(req.body?.rejection_reason || "").trim().slice(0, 500);
        if (reason.length < 5) return bad(res, 400, "Please write a clear reason (at least 5 characters) so the provider can fix it.");

        const verification = await updateVerificationStatus(Number(req.params.id), "rejected", reason, req.user.id);
        if (!verification) return bad(res, 409, "This document cannot be rejected (already rejected or not found).");

        const verified = await syncProviderVerified(verification.provider_id);
        await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
        await invalidatePublic("providers");

        notify(
            verification.provider_id,
            `${verification.document_type} needs attention`,
            `Your ${verification.document_type} was not accepted. Reason: ${reason}. Please upload it again from Documents.`,
            "verification_rejected"
        );

        return res.status(200).json({
            success: true,
            message: "Document rejected. The provider has been asked to upload again.",
            provider_verified: verified,
            verification: { ...verification, document_number: mask(verification.document_number) },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPendingVerification,
    getProviderReviewQueue,
    approveVerification,
    rejectVerification,
};
