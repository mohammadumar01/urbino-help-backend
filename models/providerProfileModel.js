const pool = require("../config/db");

const getProviderProfile = async (providerId) => {
    const result = await pool.query(
        `
        SELECT pp.*, u.name, u.email, u.phone
        FROM provider_profiles pp
        JOIN users u ON pp.provider_id = u.id
        WHERE pp.provider_id = $1
        `,
        [providerId]
    );
    return result.rows[0];
};

/** Profile banao ya update karo (ek hi call). is_verified provider khud nahi badal sakta. */
const upsertProviderProfile = async (providerId, p) => {
    const result = await pool.query(
        `
        INSERT INTO provider_profiles
            (provider_id, bio, experience_years, skills, service_area, hourly_rate, profile_image)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (provider_id) DO UPDATE SET
            bio = EXCLUDED.bio,
            experience_years = EXCLUDED.experience_years,
            skills = EXCLUDED.skills,
            service_area = EXCLUDED.service_area,
            hourly_rate = EXCLUDED.hourly_rate,
            profile_image = EXCLUDED.profile_image,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [providerId, p.bio, p.experience_years, p.skills, p.service_area, p.hourly_rate, p.profile_image]
    );
    return result.rows[0];
};

// Purane naam (doosri files use karti hon to)
const createProviderProfile = (providerId, bio, experience_years, skills, service_area, hourly_rate, profile_image) =>
    upsertProviderProfile(providerId, { bio, experience_years, skills, service_area, hourly_rate, profile_image });
const updateProviderProfile = createProviderProfile;

const getPublicProviderProfile = async (providerId) => {
    const result = await pool.query(
        `
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
            COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.provider_id = pp.provider_id), 0) AS average_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = pp.provider_id)::int AS total_reviews,
            (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.provider_id AND b.status = 'completed')::int AS completed_jobs,
            pp.created_at
        FROM provider_profiles pp
        JOIN users u ON pp.provider_id = u.id
        WHERE pp.provider_id = $1
          AND u.role = 'provider'
          AND u.is_deleted IS NOT TRUE
        `,
        [providerId]
    );
    return result.rows[0];
};

/** Onboarding checklist: profile, services, availability, documents. */
const getOnboardingStatus = async (providerId) => {
    const result = await pool.query(
        `
        SELECT
            (SELECT row_to_json(pp) FROM provider_profiles pp WHERE pp.provider_id = $1) AS profile,
            (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = $1 AND ps.is_active)::int AS active_services,
            (SELECT COUNT(*) FROM provider_availability pa WHERE pa.provider_id = $1)::int AS availability_slots,
            (SELECT COUNT(*) FROM provider_verifications v WHERE v.provider_id = $1)::int AS documents,
            (SELECT COUNT(*) FROM provider_verifications v WHERE v.provider_id = $1 AND v.status = 'approved')::int AS approved_documents,
            (SELECT COUNT(*) FROM provider_verifications v WHERE v.provider_id = $1 AND v.status = 'rejected')::int AS rejected_documents,
            (SELECT COUNT(*) FROM provider_agents pa WHERE pa.provider_id = $1)::int AS agents
        `,
        [providerId]
    );
    return result.rows[0];
};

module.exports = {
    getProviderProfile,
    upsertProviderProfile,
    createProviderProfile,
    updateProviderProfile,
    getPublicProviderProfile,
    getOnboardingStatus,
};
