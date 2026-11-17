const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

/**
 * "Authorization: Bearer <token>" verify karta hai aur req.user set karta hai.
 * Purane accounts ka role "user" hai; use "customer" maan lete hain taaki
 * dono ek hi tarah treat hon.
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            ...decoded,
            role: decoded.role === ROLES.USER ? ROLES.CUSTOMER : decoded.role
        };

        next();
    } catch (error) {
        const expired = error.name === "TokenExpiredError";
        return res.status(401).json({
            success: false,
            message: expired
                ? "Your session has expired. Please log in again."
                : "Invalid token"
        });
    }
};

module.exports = authMiddleware;
