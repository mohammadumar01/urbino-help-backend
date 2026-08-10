const {
getMyJobs,
getTotalMyJobs,
acceptJob,
onTheWayJob,
startJob,
completeJob
} = require("../models/agentModel");

const getAssignedJobs = async (req, res) => {
try {

const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const offset = (page - 1) * limit;

const search = req.query.search || "";
const status = req.query.status || "";

let sortBy = req.query.sortBy || "created_at";
let order = (req.query.order || "DESC").toUpperCase();

const allowedSortFields = [
    "booking_date",
    "created_at",
    "status"
];

const allowedOrder = [
    "ASC",
    "DESC"
];

if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({
        success: false,
        message: "Invalid sort field"
    });
}

if (!allowedOrder.includes(order)) {
    return res.status(400).json({
        success: false,
        message: "Invalid sort order"
    });
}

const jobs = await getMyJobs(
    req.user.id,
    limit,
    offset,
    search,
    status,
    sortBy,
    order
);

const totalJobs = Number(
    await getTotalMyJobs(
        req.user.id,
        search,
        status
    )
);

const totalPages = Math.ceil(totalJobs / limit);

return res.status(200).json({
    success: true,
    currentPage: page,
    limit,
    totalJobs,
    totalPages,
    jobs
});

} catch (error) {
return res.status(500).json({
    success: false,
    message: error.message
});
    }
};

const acceptAssignedJob = async (req, res) => {
try {

    const { id } = req.params;

    const booking = await acceptJob(
        id,
        req.user.id
    );

    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found or already accepted"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Job accepted successfully",
        booking
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};

const onTheWay = async (req, res) => {
try {

    const { id } = req.params;

    const booking = await onTheWayJob(
        id,
        req.user.id
    );

    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found or job not accepted yet"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Agent is on the way",
        booking
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};

const startAssignedJob = async (req, res) => {
    try {

        const { id } = req.params;

        const booking = await startJob(
            id,
            req.user.id
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or agent is not on the way"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Work started successfully",
            booking
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const completeAssignedJob = async (req, res) => {
    try {

        const { id } = req.params;

        const booking = await completeJob(
            id,
            req.user.id
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or work not started"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Work completed successfully",
            booking
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
getAssignedJobs,
acceptAssignedJob,
onTheWay,
startAssignedJob,
completeAssignedJob

};