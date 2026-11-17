const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

/**
 * Private document uploads (ID proofs). Files public/static folder se bahar
 * private_uploads/<folder>/ mein jaate hain aur sirf authorised API se dikhte hain.
 */
const ROOT = path.join(process.cwd(), "private_uploads");

const allowedTypes = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

function createDocumentUpload(folder) {
  const uploadDir = path.join(ROOT, folder);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${extension}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validExtensions = allowedTypes[file.mimetype] || [];
    if (!validExtensions.includes(extension)) {
      const err = new Error("Only PDF, JPG, JPEG and PNG files are allowed.");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });
}

/** Stored path (relative to private_uploads) ko absolute banao; folder se bahar na jaaye. */
function resolvePrivateFile(storedPath) {
  const full = path.resolve(ROOT, String(storedPath || ""));
  if (!full.startsWith(ROOT + path.sep)) return null;
  return full;
}

const uploadAgentDocument = createDocumentUpload("agent-documents");

module.exports = uploadAgentDocument;
module.exports.createDocumentUpload = createDocumentUpload;
module.exports.resolvePrivateFile = resolvePrivateFile;
module.exports.PRIVATE_ROOT = ROOT;
