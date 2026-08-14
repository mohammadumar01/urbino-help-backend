const pool = require("../config/db");

const createProviderProfile = async (
    providerId,
    bio,
    experienceYears,
    skills,
    serviceArea,
    hourlyRate,
    profileImage
) => {

    const query = `
        INSERT INTO provider_profiles (
            provider_id,
            bio,
            experience_years,
            skills,
            service_area,
            hourly_rate,
            profile_image
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    const values = [
        providerId,
        bio,
        experienceYears,
        skills,
        serviceArea,
        hourlyRate,
        profileImage
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};


const getProviderProfile = async (providerId) => {

    const query = `
        SELECT
            pp.*,
            u.name,
            u.email,
            u.phone
        FROM provider_profiles pp
        JOIN users u
            ON pp.provider_id = u.id
        WHERE pp.provider_id = $1;
    `;

    const result = await pool.query(query, [providerId]);

    return result.rows[0];
};


const updateProviderProfile = async (
    providerId,
    bio,
    experienceYears,
    skills,
    serviceArea,
    hourlyRate,
    profileImage
) => {

    const query = `
        UPDATE provider_profiles
        SET
            bio = $1,
            experience_years = $2,
            skills = $3,
            service_area = $4,
            hourly_rate = $5,
            profile_image = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_id = $7
        RETURNING *;
    `;

    const values = [
        bio,
        experienceYears,
        skills,
        serviceArea,
        hourlyRate,
        profileImage,
        providerId
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const getPublicProviderProfile = async (providerId) => {

    const query = `
        SELECT
            pp.id,
            pp.provider_id,
            u.name,
            pp.bio,
            pp.experience_years,
            pp.skills,
            pp.service_area,
            pp.hourly_rate,
            pp.profile_image,
            pp.is_verified,
            COALESCE(ROUND(AVG(r.rating), 2), 0) AS average_rating,
            COUNT(r.id) AS total_reviews,
            pp.created_at
        FROM provider_profiles pp
        JOIN users u
            ON pp.provider_id = u.id
        LEFT JOIN reviews r
            ON pp.provider_id = r.provider_id
        WHERE pp.provider_id = $1
        GROUP BY
            pp.id,
            pp.provider_id,
            u.name,
            pp.bio,
            pp.experience_years,
            pp.skills,
            pp.service_area,
            pp.hourly_rate,
            pp.profile_image,
            pp.is_verified,
            pp.created_at;
    `;

    const result = await pool.query(query, [providerId]);

    return result.rows[0];
};

module.exports = {
    createProviderProfile,
    getProviderProfile,
    updateProviderProfile,
    getPublicProviderProfile
};