const pool = require("../config/db");

const createBooking = async (
customer_id,
service_name,
address,
booking_date,
booking_time

) => {
const query = `
INSERT INTO bookings
(
customer_id,
service_name,
address,
booking_date,
booking_time
) VALUES
($1, $2, $3, $4, $5)
RETURNING *;
`;

const values = [
customer_id,
service_name,
address,
booking_date,
booking_time
];

const result = await pool.query(query, values);
return result.rows[0];

};

const getBookingsByCustomerId = async(customer_id,limit,offset,search,status,sortBy,order) => {
let query = `
SELECT
id,
service_name,
address,
booking_date,
booking_time,
status,
created_at
FROM bookings
WHERE customer_id = $1

`;

let values = [customer_id];

if(search) {
values.push(`%${search}%`);

query += `
AND (
service_name ILIKE $${values.length}
OR address ILIKE $${values.length}
)
`;
}

if(status) {
values.push(status);

query += `
AND status = $${values.length}
`;
}

// sorting add krte hai 

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

const getTotalBookingsByCustomerId = async (
customer_id,
search,
status
) => {
let query = `
SELECT COUNT(*) AS total
FROM bookings
WHERE customer_id = $1
`;

let values = [customer_id];

if(search) {
values.push(`%${search}%`);

query += `
AND (
service_name ILIKE $${values.length}
OR address ILIKE $${values.length}
)
`;

}
if (status) {
values.push(status);

query += `
AND status = $${values.length}
`;
}

const result = await pool.query(query,values);
return Number(result.rows[0].total);
};

const getBookingForPayment = async (booking_id, customer_id) => {
    const query = `
        SELECT id, customer_id, status
        FROM bookings
        WHERE id = $1
        AND customer_id = $2
    `;

    const result = await pool.query(query, [
        booking_id,
        customer_id
    ]);

    return result.rows[0];
};
// udate ke sath khelnege 
const cancelBooking = async (booking_id, customer_id) => {
const query = `
UPDATE bookings  
SET status = 'cancelled'
WHERE id = $1
AND customer_id = $2 
RETURNING *;
`;

const values = [
booking_id,
customer_id
];

const result = await pool.query(query,values);
return result.rows[0];
};



module.exports = {
createBooking,
getBookingsByCustomerId,
getTotalBookingsByCustomerId,
cancelBooking,
getBookingForPayment
};