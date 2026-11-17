const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/supportController");

// Spam rokne ke liye: ek IP se 10 tickets per ghanta
const ticketLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later or call support." },
});

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Human support requests (from the help chat)
 */

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Ask a person for help (login optional; guests must give a phone number)
 *     tags: [Support]
 *   get:
 *     summary: All tickets (admin)
 *     tags: [Support]
 *     security: [{ bearerAuth: [] }]
 * /api/support/my-tickets:
 *   get:
 *     summary: My support requests
 *     tags: [Support]
 *     security: [{ bearerAuth: [] }]
 * /api/support/tickets/{id}:
 *   patch:
 *     summary: Update ticket status / note (admin)
 *     tags: [Support]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/tickets", ticketLimiter, optionalAuth, c.createTicket);
router.get("/my-tickets", authMiddleware, c.myTickets);
router.get("/tickets", authMiddleware, roleMiddleware(ROLES.ADMIN), c.listTickets);
router.patch("/tickets/:id", authMiddleware, roleMiddleware(ROLES.ADMIN), c.updateTicket);

module.exports = router;
