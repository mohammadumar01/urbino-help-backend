const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/paymentController");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Online (Razorpay) and cash payments, refunds
 */

/**
 * @swagger
 * /api/payment/config:
 *   get:
 *     summary: Which payment options are available (online gateway, test mode, commission)
 *     tags: [Payments]
 */
router.get("/config", c.getPaymentConfig);

/**
 * @swagger
 * /api/payment/order:
 *   post:
 *     summary: Start payment for a booking (ONLINE creates a Razorpay order, CASH = pay after service)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               booking_id: { type: integer }
 *               method: { type: string, enum: [ONLINE, CASH] }
 */
router.post("/order", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.createPaymentOrder);

/**
 * @swagger
 * /api/payment/verify:
 *   post:
 *     summary: Verify Razorpay checkout signature and mark the payment successful
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/verify", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.verifyPayment);
router.post("/failed", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.reportPaymentFailure);

// Sirf development: Razorpay keys na hon tab test checkout
router.post("/mock-checkout", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.mockCheckout);

/**
 * @swagger
 * /api/payment/booking/{booking_id}:
 *   get:
 *     summary: Latest payment of a booking (customer, its provider/agent, or admin)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/booking/:booking_id", authMiddleware, c.getBookingPayment);

/**
 * @swagger
 * /api/payment/booking/{booking_id}/cash-collected:
 *   put:
 *     summary: Provider or assigned agent records cash received after the service
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
    "/booking/:booking_id/cash-collected",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER, ROLES.AGENT),
    c.markCashCollected
);

/**
 * @swagger
 * /api/payment:
 *   get:
 *     summary: All payments with summary (admin)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: (Legacy) start a payment; prefer POST /api/payment/order
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/", authMiddleware, roleMiddleware(ROLES.ADMIN), c.listAllPayments);
router.post("/", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.createNewPayment);

/**
 * @swagger
 * /api/payment/{id}/refund:
 *   post:
 *     summary: Refund a successful payment, or mark a pending refund as done (admin)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/:id/refund", authMiddleware, roleMiddleware(ROLES.ADMIN), c.refundPaymentById);

/**
 * @swagger
 * /api/payment/{id}/status:
 *   put:
 *     summary: Manually correct a payment status (admin only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
router.put("/:id/status", authMiddleware, roleMiddleware(ROLES.ADMIN), c.changePaymentStatus);

module.exports = router;
