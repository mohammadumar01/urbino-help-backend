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
 *     summary: Start a password reset { email, phone? } - emails a 6-digit code when SMTP is set, else support calls back
 *     tags: [Account]
 * /api/account/reset-password:
 *   post:
 *     summary: Set a new password with the emailed code { email, code, new_password }
 *     tags: [Account]
 * /api/account/reset-options:
 *   get:
 *     summary: Which reset channel is active ("email" or "call")
 *     tags: [Account]
 */
router.get("/me", authMiddleware, c.me);
router.put("/profile", authMiddleware, c.updateProfile);
router.put("/password", authMiddleware, c.changePassword);
router.get("/reset-options", c.resetOptions);
router.post("/forgot-password", c.forgotPassword);
router.post("/reset-password", c.resetPassword);

module.exports = router;
