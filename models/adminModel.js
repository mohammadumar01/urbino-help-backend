const BOOKING_STATUS = require("../constants/bookingStatus");
const pool = require("../config/db");

const getAllUsers = async (limit, offset,search,role,sortBy, order) => {

    // yha maine static query ko hata kr dynmic query use kr rha hu const se let mai aa gaya hu
    let query = `
    SELECT 
     id,
     name,
     email,
     phone,
     role,
     created_at
     FROM users
     WHERE 1 = 1
     AND is_deleted = FALSE
     `;

     let values = [];

     if(search) {

        values.push(`%${search}%`);

        query += `
        AND (
          name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          )
          `;

     }

     if(role) {
        values.push(role);

        query += `
        AND role = $${values.length}
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

     const result = await pool.query(query, values);
     return result.rows;

};

const getAllBookings = async (limit, offset, search,status, sortBy, order) => {
    let query = `
    SELECT 
    bookings.id,
    users.name,
    users.email,
    bookings.service_name,
    bookings.address,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status,
    bookings.created_at
    FROM bookings
    JOIN users
    ON bookings.customer_id = users.id
    WHERE 1=1
  
    `;
     
    let values = [];

    if (search) {
         values.push(`%${search}%`);

         query += `
         AND (
          users.name ILIKE $${values.length}
          OR bookings.service_name ILIKE $${values.length}
          )
          `;
    }

    if(status) {
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


//  yha apn dash board bna rhe hai taki usres ko dikhe 

const getDashboardStats = async () => {

    const totalUsers = await pool.query(`
        SELECT COUNT(*) AS count 
        FROM users;
        `);

    const totalBookings = await pool.query(`
        SELECT COUNT(*) AS count
        FROM bookings;
        `);

    const pendingBookings = await pool.query(`
        SELECT COUNT(*) AS count 
        FROM bookings
        WHERE status = '${BOOKING_STATUS.PENDING}';
        `);

    const acceptedBookings = await pool.query(`
        SELECT COUNT(*) AS count
        FROM bookings
        WHERE status = '${BOOKING_STATUS.PROVIDER_ACCEPTED}';
        `);

    const completedBookings = await pool.query(`
        SELECT COUNT(*) AS count 
        FROM bookings
        WHERE status = '${BOOKING_STATUS.COMPLETED}';
        `);

    const cancelledBookings = await pool.query(`
    SELECT COUNT(*) AS count
    FROM bookings
    WHERE status = '${BOOKING_STATUS.CANCELLED}';
    `);

    return {
        totalUsers: totalUsers.rows[0].count,
        totalBookings: totalBookings.rows[0].count,
        pendingBookings: pendingBookings.rows[0].count,
        acceptedBookings: acceptedBookings.rows[0].count,
        completedBookings: completedBookings.rows[0].count,
        cancelledBookings: cancelledBookings.rows[0].count
    };


};

const getTotalUsers = async (search,role) => {

  let query = `
     SELECT COUNT(*) AS count 
     FROM users
     WHERE 1=1
     AND is_deleted = FALSE
     `;

     let values = [];

     if(search) {
        values.push(`%${search}%`);

        query += `
        AND (
        name ILIKE $${values.length}
        Or email ILIKE $${values.length}
        )
        `;
     }

     if (role) {

        values.push(role);

        query += `
        AND role = $${values.length}
        `;

     }

     const totalUsers = await pool.query(query,values);
     return totalUsers.rows[0].count;
};

const getTotalBookings = async (search, status) => {

    let query = `
    SELECT COUNT(*) AS count
    FROM bookings
    JOIN users 
    ON bookings.customer_id = users.id
    WHERE  1=1
    `;

    let values = [];

    if(search) {

        values.push(`%${search}%`);

        query += `
        AND (
        users.name ILIKE $${values.length}
        OR bookings.service_name ILIKE $${values.length}
        )
        `;
    }

    if(status) {
        values.push(status);

        query += `
        AND bookings.status = $${values.length}
        `;
    }

    const totalBookings  = await pool.query(query, values);
    return totalBookings.rows[0].count;
}

const updateBookingStatus = async (id, status) => {

  const query = `
   UPDATE bookings
   SET status =$1
   WHERE id =$2
   RETURNING *;
   `;
   const result = await pool.query(query, [status, id]);
   return result.rows[0];
}; 

const assignAgentByAdmin = async (booking_id, agent_id) => {
     const query = `
        UPDATE bookings
        SET
            agent_id = $2,
            status = '${BOOKING_STATUS.AGENT_ASSIGNED}',
            agent_assigned_at = CURRENT_TIMESTAMP
        WHERE id = $1
       AND status = '${BOOKING_STATUS.PROVIDER_ACCEPTED}'
        RETURNING *;
    `;

    const values = [
        booking_id,
        agent_id

    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};


const updateAgent = async (
    id,
    name,
    email,
    phone
) => {
    const query = `
    UPDATE users 
    SET 
      name = $1,
      email = $2,
      phone = $3
      WHERE id = $4
      AND role = 'agent'
      RETURNING 
      id,
      name,
      email,
      phone,
      role,
      created_at;
      `;

      const values = [
        name,
        email,
        phone,
        id
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
}

const deleteAgent = async (id, adminId) => {

    const query = `
       UPDATE users
        SET
            is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2
        WHERE id = $1
        AND role = 'agent'
        AND is_deleted = FALSE
        RETURNING
            id,
            name,
            email,
            phone,
            role,
            is_deleted,
            deleted_at,
            deleted_by;
             `;

             const values = [
                id,
                adminId
             ];

             const result = await pool.query(query, values);

             return result.rows[0];
};

const getDeletedAgents = async (
    limit,
    offset,
    search,
    sortBy,
    order
) => {

    let query = `
    SELECT
        id,
        name,
        email,
        phone,
        role,
        deleted_at,
        deleted_by
    FROM users
    WHERE role = 'agent'
    AND is_deleted = TRUE
    `;

    let values = [];

    if (search) {

        values.push(`%${search}%`);

        query += `
        AND (
            name ILIKE $${values.length}
            OR email ILIKE $${values.length}
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

    const result = await pool.query(query, values);

    return result.rows;
};

const restoreAgent = async (id) => {

    const query = `
        UPDATE users
        SET
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL
        WHERE id = $1
        AND role = 'agent'
        AND is_deleted = TRUE
        RETURNING
            id,
            name,
            email,
            phone,
            role,
            created_at;
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

module.exports = {
    getAllUsers,
    getAllBookings,
    getDashboardStats,
    getTotalUsers,
    getTotalBookings,
    updateBookingStatus,
    assignAgentByAdmin,
    updateAgent,
    deleteAgent,
    getDeletedAgents,
    restoreAgent
};
