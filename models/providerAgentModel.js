const pool = require("../config/db");


// GET PROVIDER'S AGENTS
const getProviderAgents = async (providerId) => {

    const query = `
        SELECT
            pa.id,
            pa.provider_id,
            pa.agent_id,
            u.name AS agent_name,
            u.email AS agent_email,
            u.phone AS agent_phone,
            pa.created_at
        FROM provider_agents pa
        JOIN users u
            ON pa.agent_id = u.id
        WHERE pa.provider_id = $1
        AND u.role = 'agent'
        ORDER BY pa.created_at DESC;
    `;

    const result = await pool.query(query, [providerId]);

    return result.rows;
};


// ADD AGENT TO PROVIDER
const addProviderAgent = async (
    providerId,
    agentId
) => {

    const query = `
        INSERT INTO provider_agents (
            provider_id,
            agent_id
        )
        VALUES ($1, $2)
        RETURNING *;
    `;

    const values = [
        providerId,
        agentId
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};


// REMOVE AGENT FROM PROVIDER
const removeProviderAgent = async (
    providerId,
    agentId
) => {

    const query = `
        DELETE FROM provider_agents
        WHERE provider_id = $1
        AND agent_id = $2
        RETURNING *;
    `;

    const values = [
        providerId,
        agentId
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

// GET AGENT DOCUMENT FOR A LINKED PROVIDER
const getAgentDocumentForProvider = async (
    providerId,
    agentId
) => {
    const query = `
        SELECT
            ap.id AS profile_id,
            ap.agent_id,
            ap.document_path,
            ap.document_original_name,
            ap.document_mime_type,
            ap.verification_status
        FROM provider_agents pa
        JOIN agent_profiles ap
            ON ap.agent_id = pa.agent_id
        WHERE pa.provider_id = $1
          AND pa.agent_id = $2
          AND ap.document_path IS NOT NULL
        LIMIT 1;
    `;

    const result = await pool.query(query, [
        providerId,
        agentId
    ]);

    return result.rows[0] || null;
};

module.exports = {
    getProviderAgents,
    addProviderAgent,
    removeProviderAgent,
    getAgentDocumentForProvider
};