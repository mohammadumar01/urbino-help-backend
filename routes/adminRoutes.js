const ROLES = require("../constants/roles");
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


const {
    getUsers,
    getBookings,
    getDashboard,
    updateBookingStatus,
    createAgent,
    getAgents,
    assignAgent,
    updateAgent,
    deleteAgent,
    getDeletedAgentsList,
    restoreAgent

} = require("../controllers/adminController");

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/users",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getUsers
);

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/bookings",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getBookings
);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal Server Error
 */

router.get(
    "/dashboard",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getDashboard

);


/**
 * @swagger
 * /api/admin/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: completed
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */
router.patch("/bookings/:id/status",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    updateBookingStatus
);

/**
 * @swagger
 * /api/admin/agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               email:
 *                 type: string
 *                 example: rahul@gmail.com
 *               password:
 *                 type: string
 *                 example: Rahul@123
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal Server Error
 */

router.post(
    "/agents",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    createAgent
);

/**
 * @swagger
 * /api/admin/agents:
 *   get:
 *     summary: Get all agents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: Rahul
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           example: DESC
 *     responses:
 *       200:
 *         description: Agents fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal Server Error
 */
router.get(
    "/agents",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getAgents
);

/**
 * @swagger
 * /api/admin/agents/{id}:
 *   put:
 *     summary: Update an agent
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               email:
 *                 type: string
 *                 example: rahul@gmail.com
 *               phone:
 *                 type: string
 *                 example: "9999999999"
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal Server Error
 */
router.put(
    "/agents/:id",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    updateAgent
);

/**
 * @swagger
 * /api/admin/agents/{id}:
 *   delete:
 *     summary: Soft delete an agent
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Agent not found or already deleted
 *       500:
 *         description: Internal Server Error
 */
router.delete(
    "/agents/:id",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    deleteAgent
);

/**
 * @swagger
 * /api/admin/agents/deleted:
 *   get:
 *     summary: Get all deleted agents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: Rahul
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: deleted_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           example: DESC
 *     responses:
 *       200:
 *         description: Deleted agents fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Internal Server Error
 */


router.get(
    "/agents/deleted",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getDeletedAgentsList
);

/**
 * @swagger
 * /api/admin/agents/{id}/restore:
 *   put:
 *     summary: Restore a deleted agent
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     responses:
 *       200:
 *         description: Agent restored successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Agent not found or already active
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/agents/:id/restore",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    restoreAgent
);


/**
 * @swagger
 * /api/admin/assign-agent/{id}:
 *   put:
 *     summary: Assign an agent to a booking
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - agent_id
 *             properties:
 *               agent_id:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Agent assigned successfully
 *       400:
 *         description: Agent ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */

router.put(
    "/assign-agent/:id",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    assignAgent
);
module.exports = router;