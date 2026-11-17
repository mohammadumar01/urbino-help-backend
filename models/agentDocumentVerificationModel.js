
const pool = require("../config/db");

// Get pending agent documents for admin
const getPendingAgentDocuments = async () => {
    const query = `
        SELECT
            ap.id AS profile_id,
            ap.agent_id,
            u.name,
            u.email,
            u.phone,
            ap.document_original_name,
            ap.verification_status,
            ap.updated_at
        FROM agent_profiles ap
        JOIN users u ON u.id = ap.agent_id
        WHERE ap.verification_status = 'pending'
          AND ap.document_path IS NOT NULL
        ORDER BY ap.updated_at DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
};

// Approve or reject an agent document
const updateAgentDocumentStatus = async (
    profileId,
    status
) => {
    const query = `
        UPDATE agent_profiles
        SET
            verification_status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND verification_status = 'pending'
          AND document_path IS NOT NULL
        RETURNING id, agent_id, verification_status;
    `;

    const result = await pool.query(query, [
        status,
        profileId
    ]);

    return result.rows[0];
};


const getAgentDocumentForViewing = async (profileId) => {
    const query = `
        SELECT
            id,
            document_path,
            document_original_name,
            document_mime_type
        FROM agent_profiles
        WHERE id = $1
          AND document_path IS NOT NULL
        LIMIT 1;
    `;

    const result = await pool.query(query, [profileId]);
    return result.rows[0];
};


module.exports = {
    getPendingAgentDocuments,
    updateAgentDocumentStatus,
    getAgentDocumentForViewing
};
