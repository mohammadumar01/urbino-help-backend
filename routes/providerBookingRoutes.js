const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
getProviderPendingBookings,
acceptProviderBooking,
assignAgent,
autoAssignAgent,
completeProviderBooking
} = require("../controllers/providerBookingController");


/**
 * @swagger
 * tags:
 *   name: Provider Booking
 *   description: Provider booking management APIs
 */


/**
 * @swagger
 * /api/provider-bookings/pending:
 *   get:
 *     summary: Get all pending bookings for providers
 *     tags: [Provider Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: AC Repair
 *
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         example: created_at
 *
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *         example: DESC
 *
 *     responses:
 *       200:
 *         description: Pending bookings fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.get(
"/pending",
authMiddleware,
getProviderPendingBookings
);


/**
 * @swagger
 * /api/provider-bookings/accept/{id}:
 *   put:
 *     summary: Accept a booking
 *     tags: [Provider Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found or already accepted
 *       500:
 *         description: Internal Server Error
 */

router.put(
"/accept/:id",
authMiddleware,
acceptProviderBooking
);


/**
 * @swagger
 * /api/provider-bookings/assign-agent/{id}:
 *   put:
 *     summary: Assign an agent to a booking manually
 *     tags: [Provider Booking]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
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
 *                 example: 7
 *
 *     responses:
 *       200:
 *         description: Agent assigned successfully
 *       400:
 *         description: Agent ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found or agent cannot be assigned
 *       500:
 *         description: Internal Server Error
 */

router.put(
"/assign-agent/:id",
authMiddleware,
assignAgent
);


/**
 * @swagger
 * /api/provider-bookings/auto-assign-agent/{id}:
 *   put:
 *     summary: Automatically assign the best available agent
 *     tags: [Provider Booking]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Best available agent assigned successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No available agent found
 *       500:
 *         description: Internal Server Error
 */

router.put(
"/auto-assign-agent/:id",
authMiddleware,
autoAssignAgent
);


/**
 * @swagger
 * /api/provider-bookings/complete/{id}:
 *   put:
 *     summary: Complete a booking
 *     tags: [Provider Booking]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Booking completed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found or cannot be completed
 *       500:
 *         description: Internal Server Error
 */

router.put(
"/complete/:id",
authMiddleware,
completeProviderBooking
);


module.exports = router;