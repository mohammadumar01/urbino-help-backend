const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const list = errors.array();
        return res.status(400).json({
            success: false,
            // Frontend "message" padhta hai, isliye pehli error yahan bhi
            message: list[0]?.msg || "Invalid input",
            errors: list
        });
    }

    next();
};

module.exports = validateRequest;
