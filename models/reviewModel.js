const pool = require("../config/db");


// Create Review
const createReview = async (
booking_id,
customer_id,
provider_id,
rating,
review
) => {

const query = `
    INSERT INTO reviews (
        booking_id,
        customer_id,
        provider_id,
        rating,
        review
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
`;

const values = [
    booking_id,
    customer_id,
    provider_id,
    rating,
    review
];

const result = await pool.query(query, values);

return result.rows[0];
};


// Check if review already exists
const findReviewByBooking = async (booking_id) => {

const query = `
    SELECT *
    FROM reviews
    WHERE booking_id = $1;
`;

const result = await pool.query(query, [booking_id]);

return result.rows[0];
};


// Get reviews for provider
const getProviderReviews = async (provider_id) => {

const query = `
    SELECT
        r.id,
        r.booking_id,
        r.customer_id,
        u.name AS customer_name,
        r.rating,
        r.review,
        r.created_at,
        r.updated_at
    FROM reviews r
    JOIN users u
        ON r.customer_id = u.id
    WHERE r.provider_id = $1
    ORDER BY r.created_at DESC;
`;

const result = await pool.query(query, [provider_id]);

return result.rows;
};


module.exports = {
createReview,
findReviewByBooking,
getProviderReviews
};