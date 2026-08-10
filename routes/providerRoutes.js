const ROLES = require("../constants/roles");
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware.js");



const {
    getAllPendingBookings,
    acceptCustomerBooking,
    completeCustomerBooking,
    assignAgent
} = require("../controllers/providerController");

/**
 * @swagger
 * /api/provider/pending-booking:
 *   get:
 *     summary: Get all pending bookings
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending bookings fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/pending-booking",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    getAllPendingBookings
);

/**
 * @swagger
 * /api/provider/accept/{id}:
 *   put:
 *     summary: Accept a customer booking
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/accept/:id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    acceptCustomerBooking
);

/**
 * @swagger
 * /api/provider/complete/{id}:
 *   put:
 *     summary: Complete a customer booking
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Booking completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/complete/:id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    completeCustomerBooking
);

/**
 * @swagger
 * /api/provider/assign-agent/{id}:
 *   put:
 *     summary: Assign an agent to a booking
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *             properties:
 *               agent_id:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Agent assigned successfully
 *       400:
 *         description: Agent ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/assign-agent/:id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    assignAgent
);
module.exports = router;