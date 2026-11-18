const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const c = require("../controllers/trackingController");

const router = express.Router();

/**
 * @swagger
 * /api/tracking/{bookingId}:
 *   get:
 *     summary: Live tracking of a booking - destination, agent location, distance and ETA
 *     tags: [Maps]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/:bookingId", authMiddleware, c.getTracking);

module.exports = router;
