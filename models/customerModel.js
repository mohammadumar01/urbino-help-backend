const pool = require("../config/db");

const updateProfile = async (id, name, phone) =>{

    const query = ` 
    UPDATE users 
    SET
    name = $1,
    phone = $2
    WHERE id = $3
    RETURNING
    id,
    name,
    email,
    phone,
    role,
    created_at;
    `;

    const values = [name,phone,id];

    const result = await pool.query(query,values);

    if (result.rowCount == 0) {
        return null;
    }
    return result.rows[0];

};

module.exports = {
    updateProfile
};