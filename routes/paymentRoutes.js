const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
createNewPayment,
getBookingPayment,
changePaymentStatus
} = require("../controllers/paymentController");


/**
 * @swagger
 * /api/payment:
 *   post:
 *     summary: Create a payment
 *     tags: [Payment]
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
 *               - amount
 *               - payment_method
 *             properties:
 *               booking_id:
 *                 type: integer
 *                 example: 6
 *               amount:
 *                 type: number
 *                 example: 600
 *               payment_method:
 *                 type: string
 *                 example: UPI
 *               transaction_id:
 *                 type: string
 *                 example: TXN123456789
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       400:
 *         description: Required fields missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Customer access only
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.USER),
    createNewPayment
);

/**
 * @swagger
 * /api/payment/booking/{booking_id}:
 *   get:
 *     summary: Get payment for a booking
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: booking_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 6
 *     responses:
 *       200:
 *         description: Payment fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal Server Error
 */
router.get(
"/booking/:booking_id",
authMiddleware,
getBookingPayment
);


/**
 * @swagger
 * /api/payment/{id}/status:
 *   put:
 *     summary: Update payment status
 *     tags: [Payment]
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
 *               - payment_status
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum:
 *                   - pending
 *                   - successful
 *                   - failed
 *                 example: successful
 *               transaction_id:
 *                 type: string
 *                 example: TXN123456789
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid payment status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal Server Error
 */
router.put(
"/:id/status",
authMiddleware,
changePaymentStatus
);


module.exports = router;