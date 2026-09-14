const pool = require("../config/db");


// Get all pending verification requests

const getPendingVerifications = async () => {

const query = `
    SELECT
        pv.*,
        u.name,
        u.email,
        u.phone
    FROM provider_verifications pv
    JOIN users u
    ON pv.provider_id = u.id
    WHERE pv.status = 'pending'
    ORDER BY pv.created_at DESC;
`;


const result = await pool.query(query);
return result.rows;
};



// Approve / Reject Verification
const updateVerificationStatus = async (
    id,
    status,
    rejection_reason,
    verified_by
) => {

const query = `
    UPDATE provider_verifications
    SET
        status = $1::VARCHAR(30),
        rejection_reason = $2::TEXT,
        verified_by = $3::INTEGER,

        verified_at =
        CASE
            WHEN $1::VARCHAR(30) = 'approved'
            THEN CURRENT_TIMESTAMP
            ELSE verified_at
        END,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = $4::INTEGER
    AND status = 'pending'

    RETURNING *;
`;


const values = [
    status,
    rejection_reason,
    verified_by,
    id
];


const result = await pool.query(
    query,
    values
);


return result.rows[0];

};

const verifyProviderProfile = async (provider_id) => {

    const query = `
        UPDATE provider_profiles
        SET
            is_verified = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_id = $1
        RETURNING *;
    `;


    const result = await pool.query(
        query,
        [provider_id]
    );


    return result.rows[0];

};

module.exports = {

getPendingVerifications,
updateVerificationStatus,
verifyProviderProfile

};