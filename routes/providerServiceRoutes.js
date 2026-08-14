const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
    getServices,
    addService,
    deleteService
} = require("../controllers/providerServiceController");


/**
 * @swagger
 * /api/provider-services:
 *   get:
 *     summary: Get provider services
 *     tags: [Provider Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider services fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    getServices
);


/**
 * @swagger
 * /api/provider-services:
 *   post:
 *     summary: Add service to provider
 *     tags: [Provider Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *               - price
 *             properties:
 *               service_id:
 *                 type: integer
 *                 example: 2
 *               price:
 *                 type: number
 *                 example: 600
 *     responses:
 *       201:
 *         description: Service added successfully
 *       400:
 *         description: Invalid request or service already added
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    addService
);


/**
 * @swagger
 * /api/provider-services/{serviceId}:
 *   delete:
 *     summary: Remove service from provider
 *     tags: [Provider Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Service removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Provider service not found
 *       500:
 *         description: Internal Server Error
 */
router.delete(
    "/:serviceId",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    deleteService
);


module.exports = router;