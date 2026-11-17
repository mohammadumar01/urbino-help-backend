const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/providerServiceController");

const providerOnly = [authMiddleware, roleMiddleware(ROLES.PROVIDER)];

/**
 * @swagger
 * tags:
 *   name: Provider Services
 *   description: Services a provider offers and their prices
 */

/**
 * @swagger
 * /api/provider-services:
 *   get:
 *     summary: My services
 *     tags: [Provider Services]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Offer a service (price defaults to the service's base price)
 *     tags: [Provider Services]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_id: { type: integer }
 *               price: { type: number }
 */
router.get("/", ...providerOnly, c.getServices);
router.post("/", ...providerOnly, c.addService);

/**
 * @swagger
 * /api/provider-services/{serviceId}:
 *   put:
 *     summary: Change price or pause/resume a service
 *     tags: [Provider Services]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Stop offering a service
 *     tags: [Provider Services]
 *     security: [{ bearerAuth: [] }]
 */
router.put("/:serviceId", ...providerOnly, c.updateService);
router.delete("/:serviceId", ...providerOnly, c.deleteService);

module.exports = router;
