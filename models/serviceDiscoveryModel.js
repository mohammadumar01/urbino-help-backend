const pool = require("../config/db");

const discoverProviders = async (
    service_id,
    service_area
) => {

    let query = `
        SELECT
            u.id AS provider_id,
            u.name AS provider_name,

            s.id AS service_id,
            s.name AS service_name,

            ps.price,

            pp.service_area,
            pp.experience_years,
            pp.profile_image,
            pp.is_verified,

            COALESCE(
                ROUND(AVG(r.rating), 2),
                0
            ) AS average_rating,

            COUNT(r.id) AS total_reviews

        FROM provider_services ps

        JOIN users u
            ON u.id = ps.provider_id

        JOIN services s
            ON s.id = ps.service_id

        LEFT JOIN provider_profiles pp
            ON pp.provider_id = ps.provider_id

        LEFT JOIN reviews r
            ON r.provider_id = ps.provider_id

        WHERE ps.service_id = $1
    `;

    const values = [service_id];


    if (service_area) {

        values.push(`%${service_area}%`);

        query += `
            AND pp.service_area ILIKE $${values.length}
        `;
    }


    query += `
        GROUP BY
            u.id,
            u.name,
            s.id,
            s.name,
            ps.price,
            pp.service_area,
            pp.experience_years,
            pp.profile_image,
            pp.is_verified

        ORDER BY
            average_rating DESC,
            total_reviews DESC,
            ps.price ASC;
    `;


    const result = await pool.query(
        query,
        values
    );

    return result.rows;
};


module.exports = {
    discoverProviders
};