const pool = require("../config/db");

const getAllCategories = async () => {

    const query = `
        SELECT
            id,
            name,
            description
        FROM categories
        ORDER BY id ASC;
    `;

    const result = await pool.query(query);

    return result.rows;
};

module.exports = {
    getAllCategories
};