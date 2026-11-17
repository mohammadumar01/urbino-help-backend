
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Store documents outside the public/static folder.
const uploadDir = path.join(
  process.cwd(),
  "private_uploads",
  "agent-documents"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedTypes = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const validExtensions = allowedTypes[file.mimetype] || [];

  if (!validExtensions.includes(extension)) {
    return cb(
      new Error("Only PDF, JPG, JPEG and PNG files are allowed.")
    );
  }

  cb(null, true);
};

const uploadAgentDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
});

module.exports = uploadAgentDocument;
