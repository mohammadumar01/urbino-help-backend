const express = require("express");
const { cachePublic } = require("../middleware/cacheMiddleware");

const router = express.Router();

const {
getCategories
} = require("../controllers/categoryController");


/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all service categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 *       500:
 *         description: Internal Server Error
 */

router.get(
"/",
cachePublic("catalog", 300),
getCategories
);

module.exports = router;