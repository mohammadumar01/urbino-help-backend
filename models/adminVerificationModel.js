const pool = require("../config/db");

const getPendingVerifications = async () => {
    const result = await pool.query(`
        SELECT pv.*, u.name, u.email, u.phone
        FROM provider_verifications pv
        JOIN users u ON pv.provider_id = u.id
        WHERE pv.status = 'pending'
        ORDER BY pv.created_at ASC
    `);
    return result.rows;
};

/**
 * Document ka status badlo.
 *  - pending  -> approved / rejected  (normal review)
 *  - approved -> rejected             (verification wapas lena / revoke)
 */
const updateVerificationStatus = async (id, status, rejection_reason, verified_by) => {
    const from = status === "rejected" ? ["pending", "approved"] : ["pending"];
    const result = await pool.query(
        `
        UPDATE provider_verifications
        SET status = $1::VARCHAR(30),
            rejection_reason = $2::TEXT,
            verified_by = $3::INTEGER,
            verified_at = CASE WHEN $1::VARCHAR(30) = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4::INTEGER
          AND status = ANY($5::text[])
        RETURNING *
        `,
        [status, rejection_reason, verified_by, id, from]
    );
    return result.rows[0];
};

/**
 * Provider tabhi "Verified" jab uska Aadhaar approved ho.
 * Profile na ho to bhi row bana do taaki badge sahi rahe.
 */
const syncProviderVerified = async (provider_id) => {
    const result = await pool.query(
        `
        INSERT INTO provider_profiles (provider_id, is_verified)
        VALUES ($1, EXISTS (
            SELECT 1 FROM provider_verifications
            WHERE provider_id = $1 AND document_type = 'Aadhaar' AND status = 'approved'
        ))
        ON CONFLICT (provider_id) DO UPDATE SET
            is_verified = EXCLUDED.is_verified,
            updated_at = CURRENT_TIMESTAMP
        RETURNING is_verified
        `,
        [provider_id]
    );
    return result.rows[0]?.is_verified ?? false;
};

// Purana naam
const verifyProviderProfile = syncProviderVerified;

/**
 * Admin queue: providers (har provider ek baar) unke saare documents ke saath.
 * status: pending (koi doc pending) | verified | rejected | unverified | all
 */
const listProvidersForReview = async ({ status, search, page, limit }) => {
    const values = [];
    let where = "WHERE u.role = 'provider' AND u.is_deleted IS NOT TRUE";
    if (search) {
        values.push(`%${search}%`);
        where += ` AND (u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.phone ILIKE $${values.length} OR pp.service_area ILIKE $${values.length})`;
    }
    const filters = {
        pending: "EXISTS (SELECT 1 FROM provider_verifications v WHERE v.provider_id = u.id AND v.status = 'pending')",
        verified: "COALESCE(pp.is_verified, FALSE) = TRUE",
        rejected: "EXISTS (SELECT 1 FROM provider_verifications v WHERE v.provider_id = u.id AND v.status = 'rejected') AND COALESCE(pp.is_verified, FALSE) = FALSE",
        unverified: "COALESCE(pp.is_verified, FALSE) = FALSE",
    };
    if (filters[status]) where += ` AND ${filters[status]}`;

    const from = `FROM users u LEFT JOIN provider_profiles pp ON pp.provider_id = u.id ${where}`;

    const [rows, total, counts] = await Promise.all([
        pool.query(
            `
            SELECT
                u.id AS provider_id, u.name, u.email, u.phone, u.created_at AS joined_at,
                COALESCE(pp.is_verified, FALSE) AS is_verified,
                pp.service_area, pp.experience_years, pp.hourly_rate, pp.bio, pp.skills,
                (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = u.id AND ps.is_active)::int AS active_services,
                (SELECT COUNT(*) FROM provider_availability pa WHERE pa.provider_id = u.id)::int AS hour_ranges,
                (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = u.id AND b.status = 'completed')::int AS completed_jobs,
                (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.provider_id = u.id) AS rating,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'id', v.id, 'document_type', v.document_type, 'document_number', v.document_number,
                        'status', v.status, 'rejection_reason', v.rejection_reason,
                        'has_file', v.document_original_name IS NOT NULL, 'file_name', v.document_original_name,
                        'legacy_url', CASE WHEN v.document_original_name IS NULL THEN v.document_url END,
                        'created_at', v.created_at, 'verified_at', v.verified_at
                    ) ORDER BY (v.document_type = 'Aadhaar') DESC, v.created_at)
                    FROM provider_verifications v WHERE v.provider_id = u.id
                ), '[]'::json) AS documents,
                (SELECT MIN(v.created_at) FROM provider_verifications v WHERE v.provider_id = u.id AND v.status = 'pending') AS oldest_pending
            ${from}
            ORDER BY oldest_pending ASC NULLS LAST, u.created_at DESC
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
            `,
            [...values, limit, (page - 1) * limit]
        ),
        pool.query(`SELECT COUNT(*)::int AS total ${from}`, values),
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM provider_verifications v WHERE v.provider_id = u.id AND v.status = 'pending'))::int AS pending,
                COUNT(*) FILTER (WHERE COALESCE(pp.is_verified, FALSE))::int AS verified,
                COUNT(*) FILTER (WHERE NOT COALESCE(pp.is_verified, FALSE))::int AS unverified,
                COUNT(*)::int AS total
            FROM users u LEFT JOIN provider_profiles pp ON pp.provider_id = u.id
            WHERE u.role = 'provider' AND u.is_deleted IS NOT TRUE
        `),
    ]);

    return { providers: rows.rows, total: total.rows[0].total, counts: counts.rows[0] };
};

module.exports = {
    getPendingVerifications,
    updateVerificationStatus,
    syncProviderVerified,
    verifyProviderProfile,
    listProvidersForReview,
};
