const express = require("express");
const { getProfile } = require("../controllers/profileController");

const router = express.Router();

const { register, login } = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const { body } = require("express-validator");
const validateRequest = require("../middleware/validationMiddleware");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mohammad Umar
 *               email:
 *                 type: string
 *                 example: umar@gmail.com
 *               password:
 *                 type: string
 *                 example: Umar@123
 *               phone:
 *                 type: string
 *                 example: 9876543210
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/register",

    [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isLength({ min: 3 })
            .withMessage("Name must be at least 3 characters"),


        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Enter valid email"),


        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters")
    ],

    validateRequest,

    register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: umar@gmail.com
 *               password:
 *                 type: string
 *                 example: Umar@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/login",

    [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Enter valid email"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ],

    validateRequest,

    login
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get logged in user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", authMiddleware, getProfile);

module.exports = router;