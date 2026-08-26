const express = require("express");

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
getCategories
);

module.exports = router;