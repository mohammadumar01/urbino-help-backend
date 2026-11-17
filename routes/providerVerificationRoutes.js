const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const { createDocumentUpload } = require("../middleware/uploadMiddleware");
const c = require("../controllers/providerVerificationController");

const upload = createDocumentUpload("provider-documents");

/**
 * @swagger
 * tags:
 *   name: Provider Verification
 *   description: Provider KYC documents
 */

/**
 * @swagger
 * /api/provider-verification:
 *   get:
 *     summary: My documents and their review status (numbers masked)
 *     tags: [Provider Verification]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Upload a document (Aadhaar first). Re-upload allowed only after rejection.
 *     tags: [Provider Verification]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [document, document_type]
 *             properties:
 *               document: { type: string, format: binary }
 *               document_type: { type: string, enum: [Aadhaar, PAN, Driving License, Skill Certificate, Experience Proof, Address Proof] }
 *               document_number: { type: string }
 */
router.get("/", authMiddleware, roleMiddleware(ROLES.PROVIDER), c.getMyVerification);
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    upload.single("document"),
    c.submitVerification
);

/**
 * @swagger
 * /api/provider-verification/{id}/file:
 *   get:
 *     summary: View an uploaded document (its provider or an admin)
 *     tags: [Provider Verification]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/:id/file", authMiddleware, roleMiddleware(ROLES.PROVIDER, ROLES.ADMIN), c.viewDocumentFile);

module.exports = router;
