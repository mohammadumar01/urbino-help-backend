
const express = require("express");
const invites = require("../controllers/agentInviteController");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
    getMyAgents,
    addAgent,
    removeAgent,
    viewAgentDocument
} = require("../controllers/providerAgentController");

/**
 * @swagger
 * /api/provider/agents:
 *   get:
 *     summary: Get agents linked to the logged-in provider
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider agents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    invites.listTeam
);

// Pending invite cancel (":agent_id" wale delete se pehle)
router.delete(
    "/invites/:id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    invites.cancelInvite
);

/**
 * @swagger
 * /api/provider/agents:
 *   post:
 *     summary: Add an agent to the provider
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *             properties:
 *               agent_id:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       201:
 *         description: Agent added successfully
 *       400:
 *         description: Agent ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Agent is already added
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    // Ab seedha jodne ki jagah invite jaata hai; agent accept kare tab team mein
    invites.inviteAgent
);

/**
 * @swagger
 * /api/provider/agents/{agent_id}:
 *   delete:
 *     summary: Remove an agent from the provider
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Agent not found for this provider
 */
router.delete(
    "/:agent_id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    removeAgent
);

/**
 * @swagger
 * /api/provider/agents/{agent_id}/document:
 *   get:
 *     summary: View a linked agent's identity document
 *     description: Only an authenticated provider who has linked the agent can access the document.
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Agent user ID
 *     responses:
 *       200:
 *         description: Agent document returned inline as PDF or image
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid agent ID or document path
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found or agent not linked to provider
 *       415:
 *         description: Unsupported document type
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:agent_id/document",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    viewAgentDocument
);

module.exports = router;
