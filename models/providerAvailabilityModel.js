const pool = require("../config/db");

const DAY_ORDER = `
    CASE day_of_week
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
    END`;

const getProviderAvailability = async (providerId) => {
    const result = await pool.query(
        `
        SELECT id, provider_id, day_of_week,
               to_char(start_time, 'HH24:MI') AS start_time,
               to_char(end_time, 'HH24:MI') AS end_time,
               created_at, updated_at
        FROM provider_availability
        WHERE provider_id = $1
        ORDER BY ${DAY_ORDER}, start_time
        `,
        [providerId]
    );
    return result.rows;
};

const createAvailability = async (providerId, dayOfWeek, startTime, endTime) => {
    const result = await pool.query(
        `
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        RETURNING id, provider_id, day_of_week,
                  to_char(start_time, 'HH24:MI') AS start_time,
                  to_char(end_time, 'HH24:MI') AS end_time
        `,
        [providerId, dayOfWeek, startTime, endTime]
    );
    return result.rows[0];
};

/** Poora hafte ka schedule ek transaction mein badlo. */
const replaceSchedule = async (providerId, ranges) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM provider_availability WHERE provider_id = $1", [providerId]);
        for (const r of ranges) {
            await client.query(
                "INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
                [providerId, r.day_of_week, r.start_time, r.end_time]
            );
        }
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
    return getProviderAvailability(providerId);
};

const deleteAvailability = async (providerId, id) => {
    const result = await pool.query(
        "DELETE FROM provider_availability WHERE id = $1 AND provider_id = $2 RETURNING id",
        [id, providerId]
    );
    return result.rows[0];
};

/** Ek din ke working ranges + us din ki active bookings ke times. */
const getDayScheduleAndBookings = async (providerId, date) => {
    const [ranges, booked, any] = await Promise.all([
        pool.query(
            `
            SELECT to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
            FROM provider_availability
            WHERE provider_id = $1 AND day_of_week = TRIM(TO_CHAR($2::date, 'FMDay'))
            ORDER BY start_time
            `,
            [providerId, date]
        ),
        pool.query(
            `
            SELECT DISTINCT left(booking_time, 5) AS t
            FROM bookings
            WHERE provider_id = $1 AND booking_date = $2::date
              AND status NOT IN ('cancelled', 'completed')
            `,
            [providerId, date]
        ),
        pool.query("SELECT EXISTS (SELECT 1 FROM provider_availability WHERE provider_id = $1) AS has", [providerId]),
    ]);
    return {
        ranges: ranges.rows,
        bookedTimes: booked.rows.map((r) => r.t),
        hasSchedule: any.rows[0].has,
    };
};

module.exports = {
    getProviderAvailability,
    createAvailability,
    replaceSchedule,
    deleteAvailability,
    getDayScheduleAndBookings,
};
