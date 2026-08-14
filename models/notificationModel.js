const pool = require("../config/db");


// Create Notification
const createNotification = async (
user_id,
booking_id,
title,
message,
type
) => {

const query = `
    INSERT INTO notifications (
        user_id,
        booking_id,
        title,
        message,
        type
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
`;

const values = [
    user_id,
    booking_id,
    title,
    message,
    type
];

const result = await pool.query(query, values);

return result.rows[0];
};


// Get User Notifications
const getUserNotifications = async (user_id) => {

const query = `
    SELECT
        id,
        user_id,
        booking_id,
        title,
        message,
        type,
        is_read,
        created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC;
`;

const result = await pool.query(query, [user_id]);

return result.rows;
};


// Mark Notification as Read
const markNotificationAsRead = async (
notification_id,
user_id
) => {

const query = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1
    AND user_id = $2
    RETURNING *;
`;

const values = [
    notification_id,
    user_id
];

const result = await pool.query(query, values);

return result.rows[0];
};


module.exports = {
createNotification,
getUserNotifications,
markNotificationAsRead
};