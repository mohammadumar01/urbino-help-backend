const express = require("express");
const { cachePublic } = require("../middleware/cacheMiddleware");

const router = express.Router();

const {
    getAllServices,
    getServiceById
} = require("../controllers/serviceController");


/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Discover and search services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: AC
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: Services fetched successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/",
    cachePublic("catalog", 300),
    getAllServices
);


/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get a service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Service fetched successfully
 *       400:
 *         description: Invalid service ID
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/:id",
    cachePublic("catalog", 300),
    getServiceById
);


module.exports = router;