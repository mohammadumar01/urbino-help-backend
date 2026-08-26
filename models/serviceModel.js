const pool = require("../config/db");

const getServices = async (
search,
categoryId,
limit,
offset
) => {

let query = `
    SELECT
        s.id,
        s.category_id,
        c.name AS category_name,
        s.name,
        s.description,
        s.base_price,
        s.created_at
    FROM services s
    JOIN categories c
        ON s.category_id = c.id
    WHERE 1 = 1
`;

const values = [];

if (search) {

    values.push(`%${search}%`);

    query += `
        AND (
            s.name ILIKE $${values.length}
            OR s.description ILIKE $${values.length}
        )
    `;
}

if (categoryId) {

    values.push(categoryId);

    query += `
        AND s.category_id = $${values.length}
    `;
}

query += `
    ORDER BY s.id ASC
`;

values.push(limit);

query += `
    LIMIT $${values.length}
`;

values.push(offset);

query += `
    OFFSET $${values.length}
`;

const result = await pool.query(
    query,
    values
);

return result.rows;
};


const getTotalServices = async (
search,
categoryId
) => {

let query = `
    SELECT COUNT(*) AS count
    FROM services s
    WHERE 1 = 1
`;

const values = [];

if (search) {

    values.push(`%${search}%`);

    query += `
        AND (
            s.name ILIKE $${values.length}
            OR s.description ILIKE $${values.length}
        )
    `;
}

if (categoryId) {

    values.push(categoryId);

    query += `
        AND s.category_id = $${values.length}
    `;
}

const result = await pool.query(
    query,
    values
);

return Number(result.rows[0].count);
};


module.exports = {
getServices,
getTotalServices
};