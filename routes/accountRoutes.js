const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const c = require("../controllers/accountController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Account
 *   description: Own profile and password (every role)
 * /api/account/me:
 *   get:
 *     summary: My account
 *     tags: [Account]
 *     security: [{ bearerAuth: [] }]
 * /api/account/profile:
 *   put:
 *     summary: Update name and mobile number { name, phone }
 *     tags: [Account]
 *     security: [{ bearerAuth: [] }]
 * /api/account/password:
 *   put:
 *     summary: Change password { current_password, new_password }
 *     tags: [Account]
 *     security: [{ bearerAuth: [] }]
 * /api/account/forgot-password:
 *   post:
 *     summary: Ask support to reset the password { email, phone } (same reply whether or not the account exists)
 *     tags: [Account]
 */
router.get("/me", authMiddleware, c.me);
router.put("/profile", authMiddleware, c.updateProfile);
router.put("/password", authMiddleware, c.changePassword);
router.post("/forgot-password", c.forgotPassword);

module.exports = router;
