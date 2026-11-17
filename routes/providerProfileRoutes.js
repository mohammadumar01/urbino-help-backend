const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const c = require("../controllers/providerProfileController");

const providerOnly = [authMiddleware, roleMiddleware(ROLES.PROVIDER)];

/**
 * @swagger
 * tags:
 *   name: Provider Profile
 *   description: Provider's own profile and onboarding
 */

/**
 * @swagger
 * /api/provider-profile/profile:
 *   get:
 *     summary: My profile (null if not created yet)
 *     tags: [Provider Profile]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Create or update my profile
 *     tags: [Provider Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service_area]
 *             properties:
 *               bio: { type: string }
 *               experience_years: { type: integer }
 *               skills: { type: string }
 *               service_area: { type: string, example: "Kota, Jaipur" }
 *               hourly_rate: { type: number }
 *               profile_image: { type: string, description: "https:// URL" }
 *   post:
 *     summary: Same as PUT (kept for older clients)
 *     tags: [Provider Profile]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/profile", ...providerOnly, c.getProfile);
router.put("/profile", ...providerOnly, c.saveProfile);
router.post("/profile", ...providerOnly, c.saveProfile);

/**
 * @swagger
 * /api/provider-profile/onboarding:
 *   get:
 *     summary: Onboarding checklist (profile, services, hours, documents, team)
 *     tags: [Provider Profile]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/onboarding", ...providerOnly, c.getOnboarding);

/**
 * @swagger
 * /api/provider-profile/{id}:
 *   get:
 *     summary: Public provider profile with rating and completed jobs
 *     tags: [Provider Profile]
 */
router.get("/:id", c.getPublicProfile);

module.exports = router;
