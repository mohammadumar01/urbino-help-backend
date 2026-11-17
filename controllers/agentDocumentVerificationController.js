const {
getPendingAgentDocuments,
updateAgentDocumentStatus,
getAgentDocumentForViewing
} = require("../models/agentDocumentVerificationModel");

const path = require("path");
const fs = require("fs");

// Get pending agent documents
const getPendingAgentDocumentsForAdmin = async (req, res) => {
try {
const documents = await getPendingAgentDocuments();

return res.status(200).json({
    success: true,
    documents
});
} catch (error) {
console.error("Get Pending Agent Documents Error:", error);

return res.status(500).json({
    success: false,
    message: "Unable to fetch pending agent documents."
});
}
};

// Approve or reject an agent document
const reviewAgentDocument = async (req, res) => {
try {
const profileId = Number(req.params.id);
const { status } = req.body || {};

if (!Number.isInteger(profileId) || profileId <= 0) {
    return res.status(400).json({
        success: false,
        message: "Invalid agent profile ID."
    });
}

if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected."
    });
}

const document = await updateAgentDocumentStatus(
    profileId,
    status
);

if (!document) {
    return res.status(404).json({
        success: false,
        message: "Pending agent document not found."
    });
}

return res.status(200).json({
    success: true,
    message: `Agent document ${status} successfully.`,
    document
});
} catch (error) {
console.error("Review Agent Document Error:", error);

return res.status(500).json({
    success: false,
    message: "Unable to review agent document."
});
}
};

// Securely view an agent document
const viewAgentDocument = async (req, res) => {
try {
const profileId = Number(req.params.id);

if (!Number.isInteger(profileId) || profileId <= 0) {
    return res.status(400).json({
        success: false,
        message: "Invalid agent profile ID."
    });
}

const document = await getAgentDocumentForViewing(profileId);

if (!document || !document.document_path) {
    return res.status(404).json({
        success: false,
        message: "Agent document not found."
    });
}

const uploadRoot = path.resolve(
    process.cwd(),
    "private_uploads",
    "agent-documents"
);

// Normalize Windows and POSIX path separators.
const storedPath = document.document_path.replace(/\\/g, "/");

// Accept either "agent-documents/file.jpeg" or "file.jpeg".
const fileName = storedPath.startsWith("agent-documents/")
    ? storedPath.slice("agent-documents/".length)
    : storedPath;

const filePath = path.resolve(uploadRoot, fileName);

// Prevent directory traversal and paths outside private storage.
if (
    filePath === uploadRoot ||
    !filePath.startsWith(uploadRoot + path.sep)
) {
    return res.status(400).json({
        success: false,
        message: "Invalid document path."
    });
}

const stat = await fs.promises.stat(filePath);

if (!stat.isFile()) {
    return res.status(404).json({
        success: false,
        message: "Document file not found."
    });
}

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
];

if (!allowedMimeTypes.includes(document.document_mime_type)) {
    return res.status(415).json({
        success: false,
        message: "Unsupported document type."
    });
}

res.setHeader("Content-Type", document.document_mime_type);
res.setHeader(
    "Content-Disposition",
    'inline; filename="agent-document"'
);
res.setHeader("Cache-Control", "private, no-store");
res.setHeader("X-Content-Type-Options", "nosniff");

return res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
        console.error("Send Agent Document Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to serve document."
        });
    }
});
} catch (error) {
if (error.code === "ENOENT") {
    return res.status(404).json({
        success: false,
        message: "Document file not found."
    });
}

console.error("View Agent Document Error:", error);

return res.status(500).json({
    success: false,
    message: "Unable to view agent document."
});
}
};

module.exports = {
getPendingAgentDocumentsForAdmin,
reviewAgentDocument,
viewAgentDocument
};
