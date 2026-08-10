const BOOKING_STATUS = require("../constants/bookingStatus");
const pool = require("../config/db");

const getMyJobs = async (
agent_id,
limit,
offset,
search,
status,
sortBy,
order
) => {

let query = `
SELECT
    bookings.id,
    bookings.customer_id,
    users.name AS customer_name,
    users.phone,
    bookings.service_name,
    bookings.address,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status,
    bookings.created_at
FROM bookings
JOIN users
ON bookings.customer_id = users.id
WHERE bookings.agent_id = $1
`;

let values = [agent_id];

if (search) {
values.push(`%${search}%`);

query += `
AND (
    users.name ILIKE $${values.length}
    OR bookings.service_name ILIKE $${values.length}
    OR bookings.address ILIKE $${values.length}
)
`;
}

if (status) {
values.push(status);

query += `
AND bookings.status = $${values.length}
`;
}

query += `
ORDER BY bookings.${sortBy} ${order}
`;

values.push(limit);

query += `
LIMIT $${values.length}
`;

values.push(offset);

query += `
OFFSET $${values.length}
`;

const result = await pool.query(query, values);

return result.rows;
};

const getTotalMyJobs = async (
agent_id,
search,
status
) => {

let query = `
SELECT COUNT(*) AS count
FROM bookings
JOIN users
ON bookings.customer_id = users.id
WHERE bookings.agent_id = $1
`;

let values = [agent_id];

if (search) {
values.push(`%${search}%`);

query += `
AND (
    users.name ILIKE $${values.length}
    OR bookings.service_name ILIKE $${values.length}
    OR bookings.address ILIKE $${values.length}
)
`;
}

if (status) {
values.push(status);

query += `
AND bookings.status = $${values.length}
`;
}

const result = await pool.query(query, values);

return result.rows[0].count;
};

 const acceptJob = async (
    booking_id,
     agent_id
    ) => {
    const query = `
    UPDATE bookings
    SET

     status = '${BOOKING_STATUS.AGENT_ACCEPTED}',
     agent_accepted_at = CURRENT_TIMESTAMP
     WHERE id = $1
     AND agent_id = $2
     AND status = '${BOOKING_STATUS.AGENT_ASSIGNED}'
     RETURNING *;  
        `;

        const values = [
            booking_id,
            agent_id
        ];

        const result = await pool.query(query, values);

        return result.rows[0];
 };
 const onTheWayJob = async (
    booking_id,
     agent_id
    ) => {
  
  const query = `
      UPDATE bookings
        SET
         status = '${BOOKING_STATUS.ON_THE_WAY}',
         on_the_way_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND agent_id = $2
        AND status = '${BOOKING_STATUS.AGENT_ACCEPTED}'
        RETURNING *;
  `;
   
  const values = [
     booking_id,
     agent_id
  ];
   const result = await pool.query(query, values);
   return result.rows[0];
 };
 
const startJob = async (
    booking_id,
     agent_id
    ) => {
    const query = `
     UPDATE bookings
     SET
     status = '${BOOKING_STATUS.IN_PROGRESS}',
     started_at = CURRENT_TIMESTAMP
     WHERE id = $1
     AND agent_id = $2
     AND status = '${BOOKING_STATUS.ON_THE_WAY}'
     RETURNING *;
     `;

     const values = [
         booking_id,
         agent_id
     ];

     const result = await pool.query(query, values);
     return result.rows[0];
} 

const completeJob = async (
    booking_id,
     agent_id
    ) => {

    const query = `
       UPDATE bookings
       SET 
          status = '${BOOKING_STATUS.COMPLETED}',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND agent_id = $2
        AND status = '${BOOKING_STATUS.IN_PROGRESS}'
        RETURNING *;
    `;

    const values = [
        booking_id,
        agent_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};
module.exports = {
getMyJobs,
getTotalMyJobs,
acceptJob,
onTheWayJob,
startJob,
completeJob
};