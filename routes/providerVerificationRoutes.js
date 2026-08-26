const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");


const {
    submitVerification,
    getMyVerification
} = require("../controllers/providerVerificationController");



/**
 * @swagger
 * /api/provider-verification:
 *   post:
 *     summary: Submit provider verification documents
 *     tags: [Provider Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - document_url
 *             properties:
 *               document_type:
 *                 type: string
 *                 example: Aadhaar
 *               document_number:
 *                 type: string
 *                 example: XXXX-XXXX-1234
 *               document_url:
 *                 type: string
 *                 example: https://example.com/aadhaar-image.jpg
 *     responses:
 *       201:
 *         description: Verification submitted successfully
 *       400:
 *         description: Required fields missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */


router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    submitVerification
);





/**
 * @swagger
 * /api/provider-verification:
 *   get:
 *     summary: Get provider verification status
 *     tags: [Provider Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */


router.get(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    getMyVerification
);



module.exports = router;