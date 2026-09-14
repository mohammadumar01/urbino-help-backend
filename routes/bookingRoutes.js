const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { body } = require("express-validator");
const validateRequest = require("../middleware/validationMiddleware");


const {
createCustomerBooking,
getMyBooking,
cancelCustomerBooking,
 rescheduleCustomerBooking
} = require("../controllers/bookingController");

/**
 * @swagger
 * /api/booking/create:
 *   post:
 *     summary: Create a new booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_name
 *               - address
 *               - booking_date
 *               - booking_time
 *             properties:
 *               service_name:
 *                 type: string
 *                 example: AC Repair
 *               address:
 *                 type: string
 *                 example: Kota, Rajasthan
 *               booking_date:
 *                 type: string
 *                 example: 2026-09-10
 *               booking_time:
 *                 type: string
 *                 example: 10:00 AM
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.post(

"/create",

authMiddleware,

[

    body("service_name")
        .notEmpty()
        .withMessage("Service name is required")
        .isLength({ min: 3 })
        .withMessage(
            "Service name must be at least 3 characters"
        ),

    body("address")
        .notEmpty()
        .withMessage("Address is required"),

    body("booking_date")
        .notEmpty()
        .withMessage("Booking date is required"),

    body("booking_time")
        .notEmpty()
        .withMessage("Booking time is required")

],

validateRequest,

createCustomerBooking
);

/**
 * @swagger
 * /api/booking/my-bookings:
 *   get:
 *     summary: Get logged in customer's bookings
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 5
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: AC
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         example: pending
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         example: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *         example: DESC
 *     responses:
 *       200:
 *         description: Bookings fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.get(

"/my-bookings",

authMiddleware,

getMyBooking
);


/**
 * @swagger
 * /api/booking/cancel/{id}:
 *   put:
 *     summary: Cancel a booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.put(

"/cancel/:id",

authMiddleware,

cancelCustomerBooking
);

/**
 * @swagger
 * /api/booking/reschedule/{id}:
 *   put:
 *     summary: Reschedule a booking
 *     tags: [Booking]
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
 *               - booking_date
 *               - booking_time
 *             properties:
 *               booking_date:
 *                 type: string
 *                 example: 2026-09-15
 *               booking_time:
 *                 type: string
 *                 example: 02:00 PM
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found or cannot be rescheduled
 *       500:
 *         description: Internal Server Error
 */

router.put(
"/reschedule/:id",

authMiddleware,

[
    body("booking_date")
        .notEmpty()
        .withMessage("Booking date is required"),

    body("booking_time")
        .notEmpty()
        .withMessage("Booking time is required")
],

validateRequest,

    rescheduleCustomerBooking
);


module.exports = router;