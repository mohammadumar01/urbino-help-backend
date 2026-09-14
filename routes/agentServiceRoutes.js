const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const roleMiddleware =
require("../middleware/roleMiddleware");

const ROLES =
require("../constants/roles");


const {

getServicesByAgent,
assignServiceToAgent,
removeServiceFromAgent

} = require(
"../controllers/agentServiceController"
);


/**
 * @swagger
 * /api/agent-services/{agent_id}:
 *   get:
 *     summary: Get all services assigned to an agent
 *     tags: [Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Agent services fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal Server Error
 */

router.get(
"/:agent_id",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
getServicesByAgent
);


/**
 * @swagger
 * /api/agent-services/{agent_id}:
 *   post:
 *     summary: Assign a service to an agent
 *     tags: [Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *             properties:
 *               service_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Service assigned successfully
 *       400:
 *         description: Service ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Agent or service not found
 *       409:
 *         description: Service already assigned to agent
 *       500:
 *         description: Internal Server Error
 */

router.post(
"/:agent_id",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
assignServiceToAgent
);


/**
 * @swagger
 * /api/agent-services/{agent_id}/{service_id}:
 *   delete:
 *     summary: Remove a service from an agent
 *     tags: [Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: service_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Service removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Agent or service assignment not found
 *       500:
 *         description: Internal Server Error
 */

router.delete(
"/:agent_id/:service_id",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
removeServiceFromAgent
);


module.exports = router;