const pool = require("../config/db");


// Check agent belongs to provider
const getAgentByProvider = async (
    agent_id,
    provider_id
) => {

    const query = `
        SELECT *
        FROM provider_agents
        WHERE agent_id = $1
        AND provider_id = $2;
    `;

    const result = await pool.query(
        query,
        [
            agent_id,
            provider_id
        ]
    );

    return result.rows[0];
};

// Get services assigned to an agent

const getAgentServices = async (agent_id) => {

const query = `
    SELECT
        ags.id,
        ags.agent_id,
        ags.service_id,
        s.name AS service_name,
        s.description,
        ags.created_at

    FROM agent_services ags

    JOIN services s
        ON s.id = ags.service_id

    WHERE ags.agent_id = $1

    ORDER BY ags.created_at DESC;
`;

const result = await pool.query(
    query,
    [agent_id]
);

return result.rows;
};


// Check service exists

const checkServiceExists = async (service_id) => {

const query = `
    SELECT id
    FROM services
    WHERE id = $1;
`;

const result = await pool.query(
    query,
    [service_id]
);

return result.rows[0];
};


// Check agent already has service

const checkAgentServiceExists = async (
agent_id,
service_id
) => {

const query = `
    SELECT id
    FROM agent_services
    WHERE agent_id = $1
    AND service_id = $2;
`;

const result = await pool.query(
    query,
    [
        agent_id,
        service_id
    ]
);

return result.rows[0];
};


// Add service to agent

const addAgentService = async (
agent_id,
service_id
) => {

const query = `
    INSERT INTO agent_services (
        agent_id,
        service_id
    )

    VALUES ($1, $2)

    RETURNING *;
`;

const result = await pool.query(
    query,
    [
        agent_id,
        service_id
    ]
);

return result.rows[0];
};


// Remove service from agent

const removeAgentService = async (
agent_id,
service_id
) => {

const query = `
    DELETE FROM agent_services

    WHERE agent_id = $1
    AND service_id = $2

    RETURNING *;
`;

const result = await pool.query(
    query,
    [
        agent_id,
        service_id
    ]
);

return result.rows[0];
};

module.exports = {
getAgentByProvider,
getAgentServices,
checkServiceExists,
checkAgentServiceExists,
addAgentService,
removeAgentService

};