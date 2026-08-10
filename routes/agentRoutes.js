const ROLES = require("../constants/roles");
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
getAssignedJobs,
acceptAssignedJob,
onTheWay,
startAssignedJob,
completeAssignedJob
} = require("../controllers/agentController");

/**
 * @swagger
 * /api/agent/my-jobs:
 *   get:
 *     summary: Get assigned jobs for logged in agent
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned jobs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       500:
 *         description: Internal Server Error
 */

router.get(
"/my-jobs",
authMiddleware,
roleMiddleware(ROLES.AGENT),
getAssignedJobs
);

/**
 * @swagger
 * /api/agent/accept/{id}:
 *   put:
 *     summary: Accept assigned job
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Job accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       404:
 *         description: Job not found or already accepted
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/accept/:id",
    authMiddleware,
    roleMiddleware(ROLES.AGENT),
    acceptAssignedJob
);

/**
 * @swagger
 * /api/agent/on-the-way/{id}:
 *   put:
 *     summary: Mark job as on the way
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Agent is on the way
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/on-the-way/:id",
    authMiddleware,
    roleMiddleware(ROLES.AGENT),
    onTheWay
);

/**
 * @swagger
 * /api/agent/start/{id}:
 *   put:
 *     summary: Start assigned job
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Work started successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/start/:id",
    authMiddleware,
    roleMiddleware(ROLES.AGENT),
    startAssignedJob
);

/**
 * @swagger
 * /api/agent/complete/{id}:
 *   put:
 *     summary: Complete assigned job
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Work completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/complete/:id",
    authMiddleware,
   roleMiddleware(ROLES.AGENT),
    completeAssignedJob
);
module.exports = router;