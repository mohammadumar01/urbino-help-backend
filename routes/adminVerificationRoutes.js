const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");


const {
    getAllPendingVerification,
    approveVerification,
    rejectVerification
} = require("../controllers/adminVerificationController");


// Get Pending Verification

router.get(
    "/verifications",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    getAllPendingVerification
);


// Approve Verification

router.patch(
    "/verification/:id/approve",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    approveVerification
);


// Reject Verification

router.patch(
    "/verification/:id/reject",
    authMiddleware,
    roleMiddleware(ROLES.ADMIN),
    rejectVerification
);


module.exports = router;