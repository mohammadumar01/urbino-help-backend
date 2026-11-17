const pool = require("../config/db");

const getProviderServices = async (providerId) => {
    const result = await pool.query(
        `
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
            ps.is_active,
            ps.created_at,
            ps.updated_at
        FROM provider_services ps
        JOIN services s ON ps.service_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE ps.provider_id = $1
        ORDER BY c.name, s.name
        `,
        [providerId]
    );
    return result.rows;
};

const serviceExists = async (serviceId) => {
    const result = await pool.query("SELECT id, base_price FROM services WHERE id = $1", [serviceId]);
    return result.rows[0];
};

const addProviderService = async (providerId, serviceId, price) => {
    const result = await pool.query(
        `
        INSERT INTO provider_services (provider_id, service_id, price)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [providerId, serviceId, price]
    );
    return result.rows[0];
};

/** Price aur/ya active badlo. Jo field undefined hai woh waisa hi rahe. */
const updateProviderService = async (providerId, serviceId, { price, is_active }) => {
    const result = await pool.query(
        `
        UPDATE provider_services
        SET price = COALESCE($3, price),
            is_active = COALESCE($4, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_id = $1 AND service_id = $2
        RETURNING *
        `,
        [providerId, serviceId, price ?? null, is_active ?? null]
    );
    return result.rows[0];
};

const deleteProviderService = async (providerId, serviceId) => {
    const result = await pool.query(
        `
        DELETE FROM provider_services
        WHERE provider_id = $1 AND service_id = $2
        RETURNING *
        `,
        [providerId, serviceId]
    );
    return result.rows[0];
};

module.exports = {
    getProviderServices,
    serviceExists,
    addProviderService,
    updateProviderService,
    deleteProviderService,
};
