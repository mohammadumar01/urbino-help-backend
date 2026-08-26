const express = require("express");

const router = express.Router();

const {
getAllServices
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
getAllServices
);

module.exports = router;