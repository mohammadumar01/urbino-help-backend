
const pool = require("../config/db");

const getAgentProfile = async (agentId) => {
  const query = `
    SELECT
      ap.*,
      u.name,
      u.email,
      u.phone,
      u.role
    FROM agent_profiles ap
    JOIN users u ON u.id = ap.agent_id
    WHERE ap.agent_id = $1
      AND u.role = 'agent'
  `;

  const result = await pool.query(query, [agentId]);
  return result.rows[0];
};

const saveAgentProfile = async (
  agentId,
  address,
  experienceYears,
  skills,
  serviceArea
) => {
  const query = `
    INSERT INTO agent_profiles (
      agent_id,
      address,
      experience_years,
      skills,
      service_area
    )
    SELECT id, $2, $3, $4, $5
    FROM users
    WHERE id = $1
      AND role = 'agent'
    ON CONFLICT (agent_id)
    DO UPDATE SET
      address = EXCLUDED.address,
      experience_years = EXCLUDED.experience_years,
      skills = EXCLUDED.skills,
      service_area = EXCLUDED.service_area,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const result = await pool.query(query, [
    agentId,
    address,
    experienceYears,
    skills,
    serviceArea,
  ]);

  return result.rows[0];
};


const saveAgentDocument = async (
  agentId,
  documentPath,
  originalName,
  mimeType
) => {
  const query = `
    INSERT INTO agent_profiles (
      agent_id,
      document_path,
      document_original_name,
      document_mime_type
    )
    SELECT id, $2, $3, $4
    FROM users
    WHERE id = $1
      AND role = 'agent'
    ON CONFLICT (agent_id)
    DO UPDATE SET
      document_path = EXCLUDED.document_path,
      document_original_name = EXCLUDED.document_original_name,
      document_mime_type = EXCLUDED.document_mime_type,
      verification_status = 'pending',
      updated_at = CURRENT_TIMESTAMP
    RETURNING
      agent_id,
      document_original_name,
      document_mime_type,
      verification_status
  `;

  const result = await pool.query(query, [
    agentId,
    documentPath,
    originalName,
    mimeType,
  ]);

  return result.rows[0];
};


module.exports = {
  getAgentProfile,
  saveAgentProfile,
  saveAgentDocument,
};
