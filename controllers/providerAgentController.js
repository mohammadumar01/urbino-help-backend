const {
    getProviderAgents,
    addProviderAgent,
    removeProviderAgent,
    getAgentDocumentForProvider
} = require("../models/providerAgentModel");

const pool = require("../config/db");


// GET MY AGENTS
const getMyAgents = async (req, res) => {

    try {

        const providerId = req.user.id;

        const agents = await getProviderAgents(providerId);

        return res.status(200).json({
            success: true,
            agents
        });

    } catch (error) {

        console.error("Get Provider Agents Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// ADD AGENT
const addAgent = async (req, res) => {

    try {

        const providerId = req.user.id;
        const { agent_id } = req.body;


        if (!agent_id) {

            return res.status(400).json({
                success: false,
                message: "Agent ID is required"
            });
        }


        // Check agent exists and has agent role
        const agentCheck = await pool.query(
            `
            SELECT id
            FROM users
            WHERE id = $1
            AND role = 'agent'
            `,
            [agent_id]
        );


        if (agentCheck.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }


        const agent = await addProviderAgent(
            providerId,
            agent_id
        );


        return res.status(201).json({
            success: true,
            message: "Agent added successfully",
            agent
        });


    } catch (error) {

        console.error("Add Provider Agent Error:", error);


        // Duplicate provider-agent relationship
        if (error.code === "23505") {

            return res.status(409).json({
                success: false,
                message: "Agent is already added to this provider"
            });
        }


        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// REMOVE AGENT
const removeAgent = async (req, res) => {

    try {

        const providerId = req.user.id;
        const { agent_id } = req.params;


        const agent = await removeProviderAgent(
            providerId,
            agent_id
        );


        if (!agent) {

            return res.status(404).json({
                success: false,
                message: "Agent not found for this provider"
            });
        }


        return res.status(200).json({
            success: true,
            message: "Agent removed successfully",
            agent
        });


    } catch (error) {

        console.error("Remove Provider Agent Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// VIEW AGENT DOCUMENT — PROVIDER
const viewAgentDocument = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { agent_id } = req.params;

        if (!agent_id || !Number.isInteger(Number(agent_id))) {
            return res.status(400).json({
                success: false,
                message: "Valid Agent ID is required"
            });
        }

        const document = await getAgentDocumentForProvider(
            providerId,
            Number(agent_id)
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Agent document not found or agent is not linked to this provider"
            });
        }

        const path = require("path");
        const fs = require("fs");

        const uploadRoot = path.resolve(
            process.cwd(),
            "private_uploads",
            "agent-documents"
        );

        let storedPath = document.document_path.replace(/\\/g, "/");

        if (storedPath.startsWith("agent-documents/")) {
            storedPath = storedPath.substring("agent-documents/".length);
        }

        const filePath = path.resolve(uploadRoot, storedPath);

        if (!filePath.startsWith(uploadRoot + path.sep)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document path"
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "Document file not found"
            });
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (!allowedTypes.includes(document.document_mime_type)) {
            return res.status(415).json({
                success: false,
                message: "Unsupported document type"
            });
        }

        res.setHeader("Content-Type", document.document_mime_type);
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");

        return res.sendFile(filePath);
    } catch (error) {
        console.error("Provider View Agent Document Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    getMyAgents,
    addAgent,
    removeAgent,
    viewAgentDocument
};