const pool = require("../config/db");


// Submit Provider Verification
const createVerification = async (
provider_id,
document_type,
document_number,
document_url
) => {

const query = `
    INSERT INTO provider_verifications
    (
        provider_id,
        document_type,
        document_number,
        document_url
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;

const values = [
    provider_id,
    document_type,
    document_number,
    document_url
];

const result = await pool.query(query, values);

return result.rows[0];
};


// Get Provider Verification Status
const getVerificationByProvider = async (provider_id) => {

const query = `
    SELECT *
    FROM provider_verifications
    WHERE provider_id = $1
    ORDER BY created_at DESC;
`;

const result = await pool.query(query, [
    provider_id
]);

return result.rows;
};


// Get Pending Verification (Admin)
const getPendingVerifications = async () => {

const query = `
    SELECT
        pv.*,
        u.name,
        u.email,
        u.phone
    FROM provider_verifications pv
    JOIN users u
    ON pv.provider_id = u.id
    WHERE pv.status = 'pending'
    ORDER BY pv.created_at DESC;
`;

const result = await pool.query(query);

return result.rows;
};


// Update Verification Status (Admin)
const updateVerificationStatus = async (
id,
status,
rejection_reason,
verified_by
) => {

const query = `
    UPDATE provider_verifications
    SET
        status = $1,
        rejection_reason = $2,
        verified_by = $3,
        verified_at = 
            CASE
                WHEN $1 = 'approved'
                THEN CURRENT_TIMESTAMP
                ELSE verified_at
            END,
        updated_at = CURRENT_TIMESTAMP

    WHERE id = $4

    RETURNING *;
`;


const values = [
    status,
    rejection_reason,
    verified_by,
    id
];


const result = await pool.query(
    query,
    values
);

return result.rows[0];
};

// Check Aadhaar Exists

const checkAadhaarExists = async (provider_id) => {

    const query = `
        SELECT *
        FROM provider_verifications
        WHERE provider_id = $1
        AND document_type = 'Aadhaar';
    `;


    const result = await pool.query(
        query,
        [provider_id]
    );


    return result.rows[0];

};

// Check if same document type already exists for provider

const checkDocumentExists = async (
    provider_id,
    document_type
) => {

    const query = `
        SELECT *
        FROM provider_verifications
        WHERE provider_id = $1
        AND document_type = $2;
    `;

    const result = await pool.query(
        query,
        [
            provider_id,
            document_type
        ]
    );

    return result.rows[0];

};

/**
 * Uploaded document save karo. Pehle se rejected ho to usi row ko naye file
 * se replace karke dobara "pending" karo.
 */
const saveUploadedDocument = async ({ provider_id, document_type, document_number, document_path, original_name, mime_type }) => {
    const result = await pool.query(
        `
        INSERT INTO provider_verifications
            (provider_id, document_type, document_number, document_url, document_original_name, document_mime_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        ON CONFLICT (provider_id, document_type) DO UPDATE SET
            document_number = EXCLUDED.document_number,
            document_url = EXCLUDED.document_url,
            document_original_name = EXCLUDED.document_original_name,
            document_mime_type = EXCLUDED.document_mime_type,
            status = 'pending',
            rejection_reason = NULL,
            verified_by = NULL,
            verified_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_verifications.status = 'rejected'
        RETURNING *
        `,
        [provider_id, document_type, document_number, document_path, original_name, mime_type]
    );
    return result.rows[0];
};

const getVerificationById = async (id) => {
    const result = await pool.query("SELECT * FROM provider_verifications WHERE id = $1", [id]);
    return result.rows[0];
};

module.exports = {
saveUploadedDocument,
getVerificationById,
createVerification,
getVerificationByProvider,
getPendingVerifications,
updateVerificationStatus,
checkAadhaarExists,
checkDocumentExists
};