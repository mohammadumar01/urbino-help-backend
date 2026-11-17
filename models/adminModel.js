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
    bookings.created_at,
    bookings.price::float AS amount,
    pay.payment_status
    FROM bookings
    JOIN users
    ON bookings.customer_id = users.id
    LEFT JOIN LATERAL (
        SELECT payment_status FROM payments
        WHERE booking_id = bookings.id
        ORDER BY (payment_status = 'successful') DESC, created_at DESC, id DESC
        LIMIT 1
    ) pay ON TRUE
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

const ACTIVE_STATUSES = [
    BOOKING_STATUS.PROVIDER_ACCEPTED,
    BOOKING_STATUS.AGENT_ASSIGNED,
    BOOKING_STATUS.AGENT_ACCEPTED,
    BOOKING_STATUS.ON_THE_WAY,
    BOOKING_STATUS.IN_PROGRESS,
];

/** Admin dashboard: saari queries parallel, sab numbers ke roop mein. */
const getDashboardStats = async () => {
    const [counts, revenue, verifications, trend, recent, topServices, topProviders] = await Promise.all([
        pool.query(
            `
            SELECT
                (SELECT COUNT(*) FROM users WHERE is_deleted IS NOT TRUE)::int AS total_users,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = $1)::int AS pending,
                COUNT(*) FILTER (WHERE status = ANY($2::text[]))::int AS accepted,
                COUNT(*) FILTER (WHERE status = $3)::int AS completed,
                COUNT(*) FILTER (WHERE status = $4)::int AS cancelled
            FROM bookings
            `,
            [BOOKING_STATUS.PENDING, ACTIVE_STATUSES, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED]
        ),
        pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments WHERE payment_status = 'successful'`),
        pool.query(`
            SELECT
                (SELECT COUNT(*) FROM provider_verifications WHERE status = 'pending')::int AS providers,
                (SELECT COUNT(*) FROM agent_profiles
                   WHERE verification_status = 'pending' AND document_path IS NOT NULL)::int AS agents
        `),
        pool.query(
            `
            WITH days AS (
                SELECT generate_series(CURRENT_DATE - 179, CURRENT_DATE, interval '1 day')::date AS d
            ),
            b AS (
                SELECT created_at::date AS d,
                       COUNT(*)::int AS bookings,
                       COUNT(*) FILTER (WHERE status = $1)::int AS completed,
                       COUNT(*) FILTER (WHERE status = $2)::int AS cancelled
                FROM bookings
                WHERE created_at >= CURRENT_DATE - 179
                GROUP BY 1
            ),
            p AS (
                SELECT paid_at::date AS d, SUM(amount)::float AS revenue
                FROM payments
                WHERE payment_status = 'successful' AND paid_at >= CURRENT_DATE - 179
                GROUP BY 1
            )
            SELECT to_char(days.d, 'YYYY-MM-DD') AS date,
                   COALESCE(b.bookings, 0) AS bookings,
                   COALESCE(b.completed, 0) AS completed,
                   COALESCE(b.cancelled, 0) AS cancelled,
                   COALESCE(p.revenue, 0) AS revenue
            FROM days
            LEFT JOIN b ON b.d = days.d
            LEFT JOIN p ON p.d = days.d
            ORDER BY days.d
            `,
            [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED]
        ),
        pool.query(
            `
            SELECT b.id, c.name AS customer, b.service_name AS service, pr.name AS provider,
                   b.status, COALESCE(pay.amount, b.price)::float AS amount, b.created_at
            FROM bookings b
            LEFT JOIN users c ON c.id = b.customer_id
            LEFT JOIN users pr ON pr.id = b.provider_id
            LEFT JOIN LATERAL (
                SELECT amount FROM payments
                WHERE booking_id = b.id AND payment_status = 'successful'
                ORDER BY paid_at DESC NULLS LAST LIMIT 1
            ) pay ON TRUE
            ORDER BY b.created_at DESC
            LIMIT 50
            `
        ),
        pool.query(`
            SELECT service_name AS name, COUNT(*)::int AS count
            FROM bookings
            WHERE status <> 'cancelled'
            GROUP BY service_name
            ORDER BY count DESC
            LIMIT 5
        `),
        pool.query(
            `
            SELECT u.name,
                   COUNT(b.id) FILTER (WHERE b.status = $1)::int AS completed,
                   (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.provider_id = u.id) AS rating
            FROM users u
            JOIN bookings b ON b.provider_id = u.id
            WHERE u.role = 'provider'
            GROUP BY u.id, u.name
            HAVING COUNT(b.id) FILTER (WHERE b.status = $1) > 0
            ORDER BY completed DESC
            LIMIT 5
            `,
            [BOOKING_STATUS.COMPLETED]
        ),
    ]);

    const c = counts.rows[0];
    const toUiStatus = (status) =>
        status === BOOKING_STATUS.PENDING || status === BOOKING_STATUS.COMPLETED || status === BOOKING_STATUS.CANCELLED
            ? status
            : "accepted";

    return {
        totalUsers: c.total_users,
        totalBookings: c.total,
        pendingBookings: c.pending,
        acceptedBookings: c.accepted,
        completedBookings: c.completed,
        cancelledBookings: c.cancelled,
        revenueTotal: revenue.rows[0].total,
        pendingProviders: verifications.rows[0].providers,
        pendingAgents: verifications.rows[0].agents,
        trend: trend.rows,
        recentBookings: recent.rows.map((r) => ({
            id: `BK-${r.id}`,
            customer: r.customer || "Deleted user",
            service: r.service,
            provider: r.provider || undefined,
            status: toUiStatus(r.status),
            amount: r.amount ?? undefined,
            createdAt: r.created_at,
        })),
        topServices: topServices.rows,
        topProviders: topProviders.rows.map((p) => ({ ...p, rating: p.rating ?? undefined })),
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
