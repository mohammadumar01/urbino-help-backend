const reviewModel = require("../models/reviewModel");
const pool = require("../config/db");


// Create Review
const createReview = async (req, res) => {

try {

    const customer_id = req.user.id;

    const {
        booking_id,
        rating,
        review
    } = req.body;


    // Validation
    if (!booking_id || !rating) {
        return res.status(400).json({
            success: false,
            message: "Booking ID and rating are required"
        });
    }


    // Rating validation
    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            message: "Rating must be between 1 and 5"
        });
    }


    // Get booking
    const bookingQuery = `
        SELECT
            id,
            customer_id,
            provider_id,
            status
        FROM bookings
        WHERE id = $1;
    `;

    const bookingResult = await pool.query(
        bookingQuery,
        [booking_id]
    );

    const booking = bookingResult.rows[0];


    // Booking not found
    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found"
        });
    }


    // Check customer ownership
    if (booking.customer_id !== customer_id) {
        return res.status(403).json({
            success: false,
            message: "You can only review your own booking"
        });
    }


    // Check booking completed
    if (booking.status !== "completed") {
        return res.status(400).json({
            success: false,
            message: "You can review only completed bookings"
        });
    }


    // Check existing review
    const existingReview =
        await reviewModel.findReviewByBooking(booking_id);

    if (existingReview) {
        return res.status(400).json({
            success: false,
            message: "Review already exists for this booking"
        });
    }


    // Create review
    const newReview =
        await reviewModel.createReview(
            booking_id,
            customer_id,
            booking.provider_id,
            rating,
            review
        );


    return res.status(201).json({
        success: true,
        message: "Review created successfully",
        review: newReview
    });


} catch (error) {

    console.error("Create Review Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}
};



// Get Provider Reviews
const getProviderReviews = async (req, res) => {

try {

    const provider_id = req.params.providerId;

    const reviews =
        await reviewModel.getProviderReviews(provider_id);


    return res.status(200).json({
        success: true,
        reviews
    });


} catch (error) {

    console.error("Get Provider Reviews Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}
};


module.exports = {
createReview,
getProviderReviews
};