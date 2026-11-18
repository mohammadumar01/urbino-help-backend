const express = require("express");
const rateLimit = require("express-rate-limit");
const c = require("../controllers/geoController");

const router = express.Router();

// Geocoder free hai par limited: har IP se 30 request/minute
router.use(rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message: "Too many address searches. Please wait a minute." } }));

/**
 * @swagger
 * tags:
 *   name: Maps
 *   description: Address search, reverse geocoding and live tracking
 * /api/geo/search:
 *   get:
 *     summary: Search an address (India). Optional lat/lng to prefer nearby results
 *     tags: [Maps]
 *     parameters:
 *       - { in: query, name: q, required: true, schema: { type: string } }
 * /api/geo/reverse:
 *   get:
 *     summary: Address for a map point (used by "use my location" and map pin)
 *     tags: [Maps]
 */
router.get("/search", c.searchPlaces);
router.get("/reverse", c.reversePlace);

module.exports = router;
