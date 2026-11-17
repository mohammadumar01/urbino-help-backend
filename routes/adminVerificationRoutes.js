const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
    getAllPendingVerification,
    getProviderReviewQueue,
    approveVerification,
    rejectVerification
} = require("../controllers/adminVerificationController");

const {
    getPendingAgentDocumentsForAdmin,
    reviewAgentDocument,
    viewAgentDocument
} = require("../controllers/agentDocumentVerificationController");

// =====================================================
// PROVIDER VERIFICATION ROUTES
// =====================================================

/**
 * @swagger
 * /api/admin/provider-verifications:
 *   get:
 *     summary: Providers with their KYC documents for review (grouped, filtered, paginated)
 *     tags: [Admin Verification]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pending, verified, rejected, unverified, all] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 */
router.get(
    "/provider-verifications",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getProviderReviewQueue
);

/**
 * @swagger
 * /api/admin/verifications:
 *   get:
 *     summary: Get all pending provider verifications
 *     tags: [Admin Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending provider verifications fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal server error
 */
router.get(
    "/verifications",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getAllPendingVerification
);

/**
 * @swagger
 * /api/admin/verification/{id}/approve:
 *   patch:
 *     summary: Approve a provider verification
 *     tags: [Admin Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Provider verification approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Verification not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/verification/:id/approve",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    approveVerification
);

/**
 * @swagger
 * /api/admin/verification/{id}/reject:
 *   patch:
 *     summary: Reject a provider verification
 *     tags: [Admin Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 example: Document is unclear
 *     responses:
 *       200:
 *         description: Provider verification rejected
 *       400:
 *         description: Rejection reason is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Verification not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/verification/:id/reject",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    rejectVerification
);

// =====================================================
// AGENT DOCUMENT VERIFICATION ROUTES
// =====================================================

/**
 * @swagger
 * /api/admin/agent-documents:
 *   get:
 *     summary: Get pending agent documents
 *     description: Returns metadata for pending agent documents, not the document file itself.
 *     tags: [Admin Agent Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending agent documents fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal server error
 */
router.get(
    "/agent-documents",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getPendingAgentDocumentsForAdmin
);

/**
 * @swagger
 * /api/admin/agent-documents/{id}/review:
 *   patch:
 *     summary: Approve or reject an agent document
 *     description: Reviews a pending agent profile document. The ID is the agent profile ID.
 *     tags: [Admin Agent Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Agent profile ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - approved
 *                   - rejected
 *                 example: approved
 *     responses:
 *       200:
 *         description: Agent document status updated successfully
 *       400:
 *         description: Invalid profile ID or status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Pending agent document not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/agent-documents/:id/review",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    reviewAgentDocument
);


/**
 * @swagger
 * /api/admin/agent-documents/{id}/view:
 *   get:
 *     summary: View an agent's uploaded identity document
 *     description: Streams a private agent document to an authenticated admin.
 *     tags: [Admin Agent Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Agent profile ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document returned successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/agent-documents/:id/view",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    viewAgentDocument
);

module.exports = router;
