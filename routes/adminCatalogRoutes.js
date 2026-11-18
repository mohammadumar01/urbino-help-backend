const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const catalog = require("../controllers/adminCatalogController");
const reports = require("../controllers/adminReportsController");

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware(ROLES.ADMIN)];

/**
 * @swagger
 * tags:
 *   name: Admin catalog & reports
 *   description: Manage services/categories and see business reports (admin)
 * /api/admin/catalog/services:
 *   get:
 *     summary: All services incl. hidden ones, with providers, bookings and revenue
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Add a service { name, category_id, base_price, description? }
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 * /api/admin/catalog/services/{id}:
 *   put:
 *     summary: Edit a service, or hide/show it with { is_active }
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 * /api/admin/catalog/categories:
 *   get:
 *     summary: Categories with service counts
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Add a category { name, description? }
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 * /api/admin/catalog/categories/{id}:
 *   put:
 *     summary: Rename / hide a category
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 * /api/admin/reports:
 *   get:
 *     summary: Business report for a date range (default last 30 days)
 *     tags: [Admin catalog & reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, example: "2026-11-01" } }
 *       - { in: query, name: to, schema: { type: string, example: "2026-11-30" } }
 */
router.get("/catalog/services", ...adminOnly, catalog.listServices);
router.post("/catalog/services", ...adminOnly, catalog.createService);
router.put("/catalog/services/:id", ...adminOnly, catalog.updateService);
router.get("/catalog/categories", ...adminOnly, catalog.listCategories);
router.post("/catalog/categories", ...adminOnly, catalog.createCategory);
router.put("/catalog/categories/:id", ...adminOnly, catalog.updateCategory);
router.get("/reports", ...adminOnly, reports.getReport);

module.exports = router;
