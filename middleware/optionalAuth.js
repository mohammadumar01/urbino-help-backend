const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

/** Token ho to req.user set karo, na ho ya galat ho to bhi request chalne do. */
module.exports = function optionalAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme === "Bearer" && token) {
        try {
            const d = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { ...d, role: d.role === ROLES.USER ? ROLES.CUSTOMER : d.role };
        } catch {
            /* guest */
        }
    }
    next();
};
