const pool = require("../config/db");


// Get Provider Services
const getProviderServices = async (providerId) => {

    const query = `
        SELECT
            ps.id,
            ps.provider_id,
            s.id AS service_id,
            s.name AS service_name,
            c.id AS category_id,
            c.name AS category_name,
            s.description,
            s.base_price,
            ps.price,
            ps.created_at
        FROM provider_services ps
        JOIN services s
            ON ps.service_id = s.id
        JOIN categories c
            ON s.category_id = c.id
        WHERE ps.provider_id = $1
        ORDER BY ps.created_at DESC;
    `;

    const result = await pool.query(query, [providerId]);

    return result.rows;
};


// Add Service to Provider
const addProviderService = async (
    providerId,
    serviceId,
    price
) => {

    const query = `
        INSERT INTO provider_services (
            provider_id,
            service_id,
            price
        )
        VALUES ($1, $2, $3)
        RETURNING *;
    `;

    const values = [
        providerId,
        serviceId,
        price
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};


// Delete Provider Service
const deleteProviderService = async (
    providerId,
    serviceId
) => {

    const query = `
        DELETE FROM provider_services
        WHERE provider_id = $1
        AND service_id = $2
        RETURNING *;
    `;

    const values = [
        providerId,
        serviceId
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};


module.exports = {
    getProviderServices,
    addProviderService,
    deleteProviderService
};