const ROLES = require("../constants/roles");
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const uploadAgentDocument = require("../middleware/uploadMiddleware");
const jobs = require("../controllers/agentJobController");

const {
  getAssignedJobs,
  acceptAssignedJob,
  onTheWay,
  startAssignedJob,
  completeAssignedJob,
} = require("../controllers/agentController");

const {
  getMyAgentProfile,
  updateMyAgentProfile,
  uploadMyAgentDocument,
} = require("../controllers/agentProfileController");

/**
 * @swagger
 * /api/agent/my-jobs:
 *   get:
 *     summary: Get assigned jobs for logged-in agent
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
  jobs.acceptJob
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
  jobs.onTheWay
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
  jobs.startJob
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
  jobs.completeJob
);

/**
 * @swagger
 * /api/agent/profile:
 *   get:
 *     summary: Get logged-in agent profile
 *     tags: [Agent Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent profile fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       500:
 *         description: Internal Server Error
 */
router.get(
  "/profile",
  authMiddleware,
  roleMiddleware(ROLES.AGENT),
  getMyAgentProfile
);

/**
 * @swagger
 * /api/agent/profile:
 *   put:
 *     summary: Create or update agent profile
 *     tags: [Agent Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - experience_years
 *               - skills
 *               - service_area
 *             properties:
 *               address:
 *                 type: string
 *                 example: Kota, Rajasthan
 *               experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *               skills:
 *                 type: string
 *                 example: AC Repair, Installation
 *               service_area:
 *                 type: string
 *                 example: Kota, Jaipur
 *     responses:
 *       200:
 *         description: Agent profile saved successfully
 *       400:
 *         description: Invalid profile details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       500:
 *         description: Internal Server Error
 */
router.put(
  "/profile",
  authMiddleware,
  roleMiddleware(ROLES.AGENT),
  updateMyAgentProfile
);

/**
 * @swagger
 * /api/agent/profile/document:
 *   post:
 *     summary: Upload an identity document for the logged-in agent
 *     description: Accepts one PDF, JPG, JPEG, or PNG document up to 5 MB.
 *     tags: [Agent Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully; verification is pending
 *       400:
 *         description: Missing or invalid document
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agent access only
 *       413:
 *         description: File exceeds the 5 MB limit
 *       500:
 *         description: Internal Server Error
 */
router.post(
  "/profile/document",
  authMiddleware,
  roleMiddleware(ROLES.AGENT),
  uploadAgentDocument.single("document"),
  uploadMyAgentDocument
);

const agentOnly = [authMiddleware, roleMiddleware(ROLES.AGENT)];

/**
 * @swagger
 * /api/agent/jobs:
 *   get:
 *     summary: My jobs grouped (new | active | done | all), soonest first
 *     tags: [Agent]
 *     security: [{ bearerAuth: [] }]
 * /api/agent/summary:
 *   get:
 *     summary: Counts for the agent home screen
 *     tags: [Agent]
 *     security: [{ bearerAuth: [] }]
 * /api/agent/jobs/{id}:
 *   get:
 *     summary: One job with customer, provider, timeline and payment
 *     tags: [Agent]
 *     security: [{ bearerAuth: [] }]
 * /api/agent/decline/{id}:
 *   put:
 *     summary: Decline an assigned job (goes back to the provider). Body { reason }
 *     tags: [Agent]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/jobs", ...agentOnly, jobs.listJobs);
router.get("/summary", ...agentOnly, jobs.getSummary);
router.get("/jobs/:id", ...agentOnly, jobs.getJob);
router.put("/decline/:id", ...agentOnly, jobs.declineJob);

module.exports = router;