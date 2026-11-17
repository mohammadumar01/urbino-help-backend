const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/claimController");

/**
 * @swagger
 * tags:
 *   name: Service Guarantee
 *   description: Free rework within 7 days of completion
 */

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Customer asks for a free rework { booking_id, reason, preferred_date?, preferred_time? }
 *     tags: [Service Guarantee]
 *     security: [{ bearerAuth: [] }]
 * /api/claims/provider:
 *   get:
 *     summary: Provider's rework requests
 *     tags: [Service Guarantee]
 *     security: [{ bearerAuth: [] }]
 * /api/claims/{id}/accept:
 *   put:
 *     summary: Provider schedules the free rework { booking_date, booking_time, note? }
 *     tags: [Service Guarantee]
 *     security: [{ bearerAuth: [] }]
 * /api/claims/{id}/reject:
 *   put:
 *     summary: Provider declines with a reason; Urbino support reviews it { note }
 *     tags: [Service Guarantee]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/", authMiddleware, roleMiddleware(ROLES.CUSTOMER), c.createClaim);
router.get("/provider", authMiddleware, roleMiddleware(ROLES.PROVIDER), c.providerClaims);
router.put("/:id/accept", authMiddleware, roleMiddleware(ROLES.PROVIDER), c.acceptClaim);
router.put("/:id/reject", authMiddleware, roleMiddleware(ROLES.PROVIDER), c.rejectClaim);

module.exports = router;
