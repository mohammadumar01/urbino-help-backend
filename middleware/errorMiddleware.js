const multer = require("multer");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let status = err.statusCode || err.status || 500;
    let message = err.message || "Internal Server Error";

    if (err.type === "entity.parse.failed") {
        status = 400;
        message = "Invalid JSON in request body.";
    } else if (err.type === "entity.too.large") {
        status = 413;
        message = "Request body is too large.";
    } else if (err instanceof multer.MulterError) {
        status = 400;
        message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)." : err.message;
    } else if (message === "Not allowed by CORS") {
        status = 403;
    } else if (err.code === "23505") {
        // Postgres unique violation
        status = 409;
        message = "This record already exists.";
    } else if (err.code === "22P02") {
        // Postgres invalid input (e.g. "abc" for an integer id)
        status = 400;
        message = "Invalid input.";
    }

    if (status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
        // Production mein andar ki details bahar na jaayein
        if (process.env.NODE_ENV === "production") message = "Internal Server Error";
    }

    res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
