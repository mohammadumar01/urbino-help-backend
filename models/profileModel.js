const pool = require("../config/db");

const getProfileById = async(id) => {
    const query = `
    SELECT 
      id,
      name,
      email,
      phone,
      role,
      created_at
      FROM users
      WHERE id = $1;
      `;
      const result = await pool.query(query,[id]);

      return result.rows[0];
};

module.exports = {
    getProfileById
}