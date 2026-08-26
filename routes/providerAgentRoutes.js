const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
    getMyAgents,
    addAgent,
    removeAgent
} = require("../controllers/providerAgentController");


/**
 * @swagger
 * /api/provider-agents:
 *   get:
 *     summary: Get provider's agents
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider agents fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    getMyAgents
);


/**
 * @swagger
 * /api/provider-agents:
 *   post:
 *     summary: Add an agent to provider
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
 *                 example: 11
 *     responses:
 *       201:
 *         description: Agent added successfully
 *       400:
 *         description: Agent ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Agent not found
 *       409:
 *         description: Agent already added
 *       500:
 *         description: Internal Server Error
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    addAgent
);


/**
 * @swagger
 * /api/provider-agents/{agent_id}:
 *   delete:
 *     summary: Remove agent from provider
 *     tags: [Provider Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 11
 *     responses:
 *       200:
 *         description: Agent removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Agent not found for this provider
 *       500:
 *         description: Internal Server Error
 */
router.delete(
    "/:agent_id",
    authMiddleware,
    roleMiddleware(ROLES.PROVIDER),
    removeAgent
);


module.exports = router;