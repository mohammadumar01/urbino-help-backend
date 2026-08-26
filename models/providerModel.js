const BOOKING_STATUS = require("../constants/bookingStatus");
const pool = require("../config/db");

const getPendingBookings = async(limit, offset, search, sortBy, order) =>{
    let query = `
    SELECT
    id, 
    customer_id,
    service_name,
    address,
    booking_date,
    booking_time,
    status,
    created_at
    FROM bookings
    WHERE 1=1
    `;

    let values = [];

    query += `
     AND status = '${BOOKING_STATUS.PENDING}'
    `;

    if(search){
        values.push(`%${search}%`);

        query += `
        AND (
        service_name ILIKE $${values.length}
        OR address ILIKE $${values.length}
        )
        `;
    }
    
    query += `
    ORDER BY ${sortBy} ${order}
    `;

    values.push(limit);

    query += `
    LIMIT $${values.length}
    `;
    values.push(offset);

    query += `
    OFFSET $${values.length}
    `;
const result = await pool.query(query,values);

return result.rows;

};

const acceptBooking = async (booking_id,provider_id) => {

    const query = `
    UPDATE bookings
    SET 
    status = '${BOOKING_STATUS.PROVIDER_ACCEPTED}',
    provider_id = $2,
    provider_accepted_at = CURRENT_TIMESTAMP
    WHERE id = $1
    AND status = '${BOOKING_STATUS.PENDING}'
    RETURNING *;
    `;

    const values = [
        booking_id,
        provider_id
    ];

    const result = await pool.query(query,values);
    return result.rows[0];
}

const completeBooking = async (booking_id,provider_id) =>{
    const query  = ` 
    UPDATE bookings
    SET
    status = '${BOOKING_STATUS.COMPLETED}',
    completed_at = CURRENT_TIMESTAMP
    WHERE id = $1
    AND provider_id = $2
    AND status = '${BOOKING_STATUS.IN_PROGRESS}'
    RETURNING *;

    `;

    const values = [ booking_id, provider_id ];

    const result = await pool.query(query,values);
    return result.rows[0];
}

const assignAgentToBooking = async (
    booking_id,
    provider_id,
    agent_id
) => {

    const query = `
        UPDATE bookings
        SET
            agent_id = $3,
            status = '${BOOKING_STATUS.AGENT_ASSIGNED}',
            agent_assigned_at = CURRENT_TIMESTAMP

        WHERE id = $1
        AND provider_id = $2
        AND status = '${BOOKING_STATUS.PROVIDER_ACCEPTED}'

        RETURNING *;
    `;

    const values = [
        booking_id,
        provider_id,
        agent_id
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};
const findBestAgentForBooking = async (
    booking_id,
    provider_id
) => {

    const query = `
        WITH eligible_agents AS (

            SELECT
                pa.agent_id,

                (
                    SELECT COUNT(*)
                    FROM bookings active_booking
                    WHERE active_booking.agent_id = pa.agent_id
                    AND active_booking.status IN (
                        '${BOOKING_STATUS.AGENT_ASSIGNED}',
                        '${BOOKING_STATUS.AGENT_ACCEPTED}',
                        '${BOOKING_STATUS.ON_THE_WAY}',
                        '${BOOKING_STATUS.IN_PROGRESS}'
                    )
                ) AS active_jobs

            FROM provider_agents pa

            JOIN agent_services ags
                ON ags.agent_id = pa.agent_id

            JOIN services s
                ON s.id = ags.service_id

            JOIN bookings b
                ON b.id = $1
                AND LOWER(s.name) = LOWER(b.service_name)

            WHERE pa.provider_id = $2
        ),

        selected_agent AS (

            SELECT agent_id
            FROM eligible_agents

            WHERE active_jobs = 0

            ORDER BY active_jobs ASC, agent_id ASC

            LIMIT 1
        )

        UPDATE bookings b

        SET
            agent_id = selected_agent.agent_id,
            status = '${BOOKING_STATUS.AGENT_ASSIGNED}',
            agent_assigned_at = CURRENT_TIMESTAMP

        FROM selected_agent

        WHERE b.id = $1
        AND b.provider_id = $2
        AND b.status = '${BOOKING_STATUS.PROVIDER_ACCEPTED}'

        RETURNING b.*;
    `;

    const values = [
        booking_id,
        provider_id
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const getTotalPendingBookings  = async (search)=> {
    let query = `
    SELECT COUNT(*) AS count
    FROM bookings
    WHERE 1=1
    `;

    query += `
    AND status = '${BOOKING_STATUS.PENDING}'
    `;
    
    let values = [];

    if(search) {
        values.push(`%${search}%`);

        query += `
        AND (
         service_name ILIKE $${values.length}
         OR address ILIKE $${values.length}
         )
         `;

    }

    const result = await pool.query(query, values);
    return result.rows[0].count;
}
module.exports = {
    getPendingBookings,
    acceptBooking,
    completeBooking,
    assignAgentToBooking,
     findBestAgentForBooking,
    getTotalPendingBookings
    
};