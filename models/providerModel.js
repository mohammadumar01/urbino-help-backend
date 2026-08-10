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
    SET agent_id = $3,
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
    getTotalPendingBookings
    
};