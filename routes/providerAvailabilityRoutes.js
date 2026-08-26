const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
    createProviderAvailability,
    getMyAvailability,
    getAvailableProviderSlots
} = require("../controllers/providerAvailabilityController");


/**
 * @swagger
 * /api/provider-availability:
 *   post:
 *     summary: Create provider availability
 *     tags: [Provider Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               day_of_week:
 *                 type: string
 *                 example: Monday
 *               start_time:
 *                 type: string
 *                 example: "10:00"
 *               end_time:
 *                 type: string
 *                 example: "18:00"
 *     responses:
 *       201:
 *         description: Provider availability created successfully
 *       400:
 *         description: Invalid availability data
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
    createProviderAvailability
);


/**
 * @swagger
 * /api/provider-availability:
 *   get:
 *     summary: Get my provider availability
 *     tags: [Provider Availability]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider availability fetched successfully
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
    getMyAvailability
);

/**
 * @swagger
 * /api/provider-availability/slots:
 *   get:
 *     summary: Get available slots for a provider
 *     tags: [Provider Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-24
 *     responses:
 *       200:
 *         description: Available slots fetched successfully
 *       400:
 *         description: provider_id and date are required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
router.get(
    "/slots",
    authMiddleware,
    getAvailableProviderSlots
);

module.exports = router;