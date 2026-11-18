const pool = require("../config/db");
const { SQL_DISTANCE_KM } = require("../utils/geo");

const discoverProviders = async (
    service_id,
    service_area,
    near = null
) => {
    // Customer ki location ho to har provider ki doori (km) aur "range mein hai ya nahi"
    const dist = near ? SQL_DISTANCE_KM("$2::float", "$3::float", "pp.latitude::float", "pp.longitude::float") : null;

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
            pp.service_radius_km,
            ${dist ? `CASE WHEN pp.latitude IS NULL THEN NULL ELSE ROUND((${dist})::numeric, 1)::float END` : "NULL::float"} AS distance_km,
            ${dist ? `CASE WHEN pp.latitude IS NULL THEN NULL ELSE (${dist}) <= pp.service_radius_km END` : "NULL::boolean"} AS in_range,

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
          AND ps.is_active
          AND s.is_active
          AND u.role = 'provider'
          AND u.is_deleted IS NOT TRUE
    `;

    const values = near ? [service_id, near.lat, near.lng] : [service_id];


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
            pp.is_verified,
            pp.service_radius_km,
            pp.latitude,
            pp.longitude

        ORDER BY
            ${dist ? "(CASE WHEN pp.latitude IS NULL THEN 1 WHEN " + dist + " <= pp.service_radius_km THEN 0 ELSE 2 END)," : ""}
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