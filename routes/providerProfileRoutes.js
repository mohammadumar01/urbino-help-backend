const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
createProfile,
getProfile,
updateProfile,
getPublicProfile
} = require("../controllers/providerProfileController");


/**
 * @swagger
 * /api/provider-profile/profile:
 *   post:
 *     summary: Create provider profile
 *     tags: [Provider Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bio
 *               - experience_years
 *               - skills
 *               - service_area
 *               - hourly_rate
 *             properties:
 *               bio:
 *                 type: string
 *                 example: Experienced AC repair and home appliance repair professional
 *               experience_years:
 *                 type: integer
 *                 example: 5
 *               skills:
 *                 type: string
 *                 example: AC Repair, Refrigerator Repair, Washing Machine Repair
 *               service_area:
 *                 type: string
 *                 example: Jaipur, Kota
 *               hourly_rate:
 *                 type: number
 *                 example: 500
 *               profile_image:
 *                 type: string
 *                 example: https://example.com/provider-profile.jpg
 *     responses:
 *       201:
 *         description: Provider profile created successfully
 *       400:
 *         description: Provider profile already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       500:
 *         description: Internal Server Error
 */
router.post(
"/profile",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
createProfile
);


/**
 * @swagger
 * /api/provider-profile/profile:
 *   get:
 *     summary: Get own provider profile
 *     tags: [Provider Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider profile fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Provider profile not found
 *       500:
 *         description: Internal Server Error
 */
router.get(
"/profile",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
getProfile
);


/**
 * @swagger
 * /api/provider-profile/profile:
 *   put:
 *     summary: Update provider profile
 *     tags: [Provider Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 example: Experienced AC and home appliance repair professional
 *               experience_years:
 *                 type: integer
 *                 example: 6
 *               skills:
 *                 type: string
 *                 example: AC Repair, Refrigerator Repair, Washing Machine Repair
 *               service_area:
 *                 type: string
 *                 example: Jaipur, Kota, Ajmer
 *               hourly_rate:
 *                 type: number
 *                 example: 600
 *               profile_image:
 *                 type: string
 *                 example: https://example.com/provider-profile-updated.jpg
 *     responses:
 *       200:
 *         description: Provider profile updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider access only
 *       404:
 *         description: Provider profile not found
 *       500:
 *         description: Internal Server Error
 */
router.put(
"/profile",
authMiddleware,
roleMiddleware(ROLES.PROVIDER),
updateProfile
);


/**
 * @swagger
 * /api/provider-profile/{id}:
 *   get:
 *     summary: Get public provider profile
 *     tags: [Provider Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Public provider profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     provider_id:
 *                       type: integer
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: Mohammad Umar Khan
 *                     bio:
 *                       type: string
 *                       example: Experienced AC and home appliance repair professional
 *                     experience_years:
 *                       type: integer
 *                       example: 6
 *                     skills:
 *                       type: string
 *                       example: AC Repair, Refrigerator Repair, Washing Machine Repair
 *                     service_area:
 *                       type: string
 *                       example: Jaipur, Kota, Ajmer
 *                     hourly_rate:
 *                       type: number
 *                       example: 600
 *                     profile_image:
 *                       type: string
 *                       example: https://example.com/provider-profile-updated.jpg
 *                     is_verified:
 *                       type: boolean
 *                       example: false
 *                     average_rating:
 *                       type: number
 *                       example: 5.00
 *                     total_reviews:
 *                       type: integer
 *                       example: 1
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Provider profile not found
 *       500:
 *         description: Internal Server Error
 */
router.get(
"/:id",
getPublicProfile
);


module.exports = router;