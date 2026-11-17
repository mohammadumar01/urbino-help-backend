const fs = require("fs");
const path = require("path");
const {
    saveUploadedDocument,
    getVerificationByProvider,
    getVerificationById,
    checkAadhaarExists,
    checkDocumentExists,
} = require("../models/providerVerificationModel");
const { resolvePrivateFile, PRIVATE_ROOT } = require("../middleware/uploadMiddleware");

const DOCUMENT_TYPES = ["Aadhaar", "PAN", "Driving License", "Skill Certificate", "Experience Proof", "Address Proof"];

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function removeUpload(file) {
    if (file?.path) fs.promises.unlink(file.path).catch(() => {});
}

/** Aadhaar / PAN jaisa number poora kabhi wapas mat bhejo. */
function mask(num) {
    if (!num) return null;
    const s = String(num).replace(/\s+/g, "");
    return s.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

function view(v) {
    return {
        id: v.id,
        document_type: v.document_type,
        document_number: mask(v.document_number),
        file_name: v.document_original_name || null,
        has_file: !!v.document_original_name,
        status: v.status,
        rejection_reason: v.rejection_reason,
        verified_at: v.verified_at,
        created_at: v.created_at,
        updated_at: v.updated_at,
    };
}

function validNumber(type, num) {
    const n = String(num || "").replace(/\s+/g, "").toUpperCase();
    if (type === "Aadhaar") return /^\d{12}$/.test(n) ? n : null;
    if (type === "PAN") return /^[A-Z]{5}\d{4}[A-Z]$/.test(n) ? n : null;
    return n ? n.slice(0, 50) : "";
}

/**
 * POST /api/provider-verification  (multipart: document=<file>, document_type, document_number)
 */
const submitVerification = async (req, res, next) => {
    try {
        const { document_type } = req.body;
        if (!req.file) return bad(res, 400, "Please attach the document (PDF, JPG or PNG, max 5 MB)");
        if (!DOCUMENT_TYPES.includes(document_type)) {
            removeUpload(req.file);
            return bad(res, 400, "Invalid document type");
        }

        const number = validNumber(document_type, req.body.document_number);
        if (number === null) {
            removeUpload(req.file);
            return bad(res, 400, document_type === "Aadhaar" ? "Aadhaar number must be 12 digits" : "PAN must look like ABCDE1234F");
        }

        if (document_type !== "Aadhaar" && !(await checkAadhaarExists(req.user.id))) {
            removeUpload(req.file);
            return bad(res, 400, "Please upload your Aadhaar first. It is required for verification.");
        }

        const previous = await checkDocumentExists(req.user.id, document_type);

        const saved = await saveUploadedDocument({
            provider_id: req.user.id,
            document_type,
            document_number: number || null,
            document_path: path.relative(PRIVATE_ROOT, req.file.path).split(path.sep).join("/"),
            original_name: req.file.originalname.slice(0, 200),
            mime_type: req.file.mimetype,
        });

        if (!saved) {
            removeUpload(req.file);
            return bad(res, 409, `${document_type} is already submitted. You can upload again only if it is rejected.`);
        }

        // Rejected document ki purani file hata do (disk par kachra na jame)
        if (previous?.document_original_name && previous.document_url !== saved.document_url) {
            const old = resolvePrivateFile(previous.document_url);
            if (old) fs.promises.unlink(old).catch(() => {});
        }

        return res.status(201).json({
            success: true,
            message: "Document uploaded. Our team will review it within 24-48 hours.",
            verification: view(saved),
        });
    } catch (error) {
        removeUpload(req.file);
        next(error);
    }
};

const getMyVerification = async (req, res, next) => {
    try {
        const rows = await getVerificationByProvider(req.user.id);
        return res.status(200).json({ success: true, document_types: DOCUMENT_TYPES, verification: rows.map(view) });
    } catch (error) {
        next(error);
    }
};

/** GET /api/provider-verification/:id/file  (us document ka provider ya admin) */
const viewDocumentFile = async (req, res, next) => {
    try {
        const v = await getVerificationById(Number(req.params.id));
        const allowed = v && (req.user.role === "admin" || v.provider_id === req.user.id);
        if (!allowed) return bad(res, 404, "Document not found");

        const full = v.document_original_name ? resolvePrivateFile(v.document_url) : null;
        if (!full || !fs.existsSync(full)) return bad(res, 404, "No uploaded file for this document");

        res.setHeader("Content-Type", v.document_mime_type || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(v.document_original_name)}"`);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return fs.createReadStream(full).pipe(res);
    } catch (error) {
        next(error);
    }
};

module.exports = { submitVerification, getMyVerification, viewDocumentFile, DOCUMENT_TYPES };
