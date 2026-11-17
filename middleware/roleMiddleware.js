const ROLES = require("../constants/roles");

/** "user" aur "customer" ek hi role hain (purana data "user" use karta hai). */
const roleMiddleware = (...roles) => {
    const allowed = new Set(roles);
    if (allowed.has(ROLES.USER)) allowed.add(ROLES.CUSTOMER);
    if (allowed.has(ROLES.CUSTOMER)) allowed.add(ROLES.USER);

    return (req, res, next) => {
        if (!req.user || !allowed.has(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to do this."
            });
        }
        next();
    };
};

module.exports = roleMiddleware;
