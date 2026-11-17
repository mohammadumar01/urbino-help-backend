const express = require("express");
const { cachePublic } = require("../middleware/cacheMiddleware");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/providerAvailabilityController");

const providerOnly = [authMiddleware, roleMiddleware(ROLES.PROVIDER)];

/**
 * @swagger
 * tags:
 *   name: Provider Availability
 *   description: Weekly working hours and bookable slots
 */

/**
 * @swagger
 * /api/provider-availability/slots:
 *   get:
 *     summary: Free 1-hour slots of a provider on a date (public)
 *     tags: [Provider Availability]
 *     parameters:
 *       - { in: query, name: provider_id, required: true, schema: { type: integer } }
 *       - { in: query, name: date, required: true, schema: { type: string, example: "2026-11-20" } }
 */
router.get("/slots", cachePublic("slots", 30), c.getAvailableProviderSlots);

/**
 * @swagger
 * /api/provider-availability:
 *   get:
 *     summary: My weekly working hours
 *     tags: [Provider Availability]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Replace my whole weekly schedule
 *     tags: [Provider Availability]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day_of_week: { type: string, example: Monday }
 *                     start_time: { type: string, example: "10:00" }
 *                     end_time: { type: string, example: "18:00" }
 *   post:
 *     summary: Add one time range
 *     tags: [Provider Availability]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/", ...providerOnly, c.getMyAvailability);
router.put("/", ...providerOnly, c.replaceMyAvailability);
router.post("/", ...providerOnly, c.createProviderAvailability);

/**
 * @swagger
 * /api/provider-availability/{id}:
 *   delete:
 *     summary: Remove one time range
 *     tags: [Provider Availability]
 *     security: [{ bearerAuth: [] }]
 */
router.delete("/:id", ...providerOnly, c.deleteMyAvailability);

module.exports = router;
