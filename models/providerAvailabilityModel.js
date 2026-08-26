const pool = require("../config/db");


// CREATE PROVIDER AVAILABILITY
const createAvailability = async (
providerId,
dayOfWeek,
startTime,
endTime
) => {

const query = `
    INSERT INTO provider_availability (
        provider_id,
        day_of_week,
        start_time,
        end_time
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;

const values = [
    providerId,
    dayOfWeek,
    startTime,
    endTime
];

const result = await pool.query(query, values);

return result.rows[0];
};


// GET PROVIDER AVAILABILITY
const getProviderAvailability = async (providerId) => {

const query = `
    SELECT
        id,
        provider_id,
        day_of_week,
        start_time,
        end_time,
        created_at,
        updated_at
    FROM provider_availability
    WHERE provider_id = $1
    ORDER BY
        CASE day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
            WHEN 'Saturday' THEN 6
            WHEN 'Sunday' THEN 7
        END,
        start_time;
`;

const result = await pool.query(query, [providerId]);

return result.rows;
};

// GET AVAILABLE SLOTS
const getAvailableSlots = async (
    providerId,
    date
) => {

    const query = `
        SELECT
            pa.start_time,
            pa.end_time,
            b.booking_time
        FROM provider_availability pa

        LEFT JOIN bookings b
            ON b.provider_id = pa.provider_id
            AND b.booking_date = $2
            AND b.status NOT IN ('cancelled', 'completed')

        WHERE pa.provider_id = $1
        AND pa.day_of_week =
            TRIM(TO_CHAR($2::date, 'Day'))
        ORDER BY pa.start_time;
    `;

    const result = await pool.query(
        query,
        [providerId, date]
    );

    return result.rows;
};

module.exports = {
    createAvailability,
    getProviderAvailability,
    getAvailableSlots
};