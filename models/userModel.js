const ROLES = require("../constants/roles");
const pool = require("../config/db");

const createUser = async (
    name,
    email,
    password,
    phone,
    role = ROLES.USER
) => {

    const query = `
        INSERT INTO users (
            name,
            email,
            password,
            phone,
            role
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    const values = [
        name,
        email,
        password,
        phone,
        role
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const findUserByEmail = async (email) => {

    const query = `
        SELECT *
        FROM users
        WHERE email = $1;
    `;

    const result = await pool.query(query, [email]);

    return result.rows[0];
};

const getUsersByRole = async (role) => {

    const query = `
        SELECT
            id,
            name,
            email,
            phone,
            role,
            created_at
        FROM users
        WHERE role = $1
        ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [role]);

    return result.rows;
};

module.exports = {
    createUser,
    findUserByEmail,
    getUsersByRole
};