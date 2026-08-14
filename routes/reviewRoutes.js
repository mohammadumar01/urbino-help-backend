const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
createReview,
getProviderReviews
} = require("../controllers/reviewController");


/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review for a completed booking
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *               - rating
 *             properties:
 *               booking_id:
 *                 type: integer
 *                 example: 4
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               review:
 *                 type: string
 *                 example: Excellent service and professional work.
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid request, booking not completed, or review already exists
 *       403:
 *         description: Customer is not allowed to review this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.CUSTOMER),
    createReview
);

/**
 * @swagger
 * /api/reviews/provider/{providerId}:
 *   get:
 *     summary: Get reviews of a provider
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Provider reviews fetched successfully
 *       500:
 *         description: Internal Server Error
 */
router.get(
"/provider/:providerId",
getProviderReviews
);


module.exports = router;