const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getDiscoveredProviders
} = require("../controllers/serviceDiscoveryController");


/**
 * @swagger
 * tags:
 *   name: Service Discovery
 *   description: APIs for discovering providers based on service and area
 */


/**
 * @swagger
 * /api/service-discovery/providers:
 *   get:
 *     summary: Discover providers by service and service area
 *     tags: [Service Discovery]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: service_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *
 *       - in: query
 *         name: service_area
 *         required: false
 *         schema:
 *           type: string
 *         example: Kota
 *
 *     responses:
 *       200:
 *         description: Matching providers fetched successfully
 *       400:
 *         description: Service ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/providers",
    authMiddleware,
    getDiscoveredProviders
);


module.exports = router;