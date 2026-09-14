const express = require("express");

const router = express.Router();

const {
sendMessage
} = require("../controllers/chatbotController");


/**
 * @swagger
 * /api/chatbot/message:
 *   post:
 *     summary: Send a message to Urbino Help AI Assistant
 *     tags: [AI Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "I need AC repair service"
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *       400:
 *         description: Message is required
 *       500:
 *         description: Failed to generate AI response
 */

router.post(
"/message",
sendMessage


 );
 

module.exports = router;