const {
getPendingBookings,
getTotalPendingBookings,
acceptBooking,
completeBooking,
assignAgentToBooking,
findBestAgentForBooking
} = require("../models/providerBookingModel");


const getProviderPendingBookings = async (req, res) => {

try {

const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

const offset = (page - 1) * limit;

const search = req.query.search || "";

let sortBy = req.query.sortBy || "created_at";
let order = req.query.order || "DESC";


const allowedSortFields = [
    "created_at",
    "booking_date",
    "service_name"
];

const allowedOrder = [
    "ASC",
    "DESC"
];


if (!allowedSortFields.includes(sortBy)) {
    sortBy = "created_at";
}


if (!allowedOrder.includes(order.toUpperCase())) {
    order = "DESC";
} else {
    order = order.toUpperCase();
}


const bookings = await getPendingBookings(
    req.user.id,
    limit,
    offset,
    search,
    sortBy,
    order
);


const totalBookings =
    await getTotalPendingBookings(
        req.user.id,
        search
    );


const totalPages = Math.max(
    1,
    Math.ceil(totalBookings / limit)
);


return res.status(200).json({

    success: true,

    currentPage: page,

    limit,

    totalBookings,

    totalPages,

    bookings

});

} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};



const acceptProviderBooking = async (req, res) => {

try {

const { id } = req.params;


const booking = await acceptBooking(
    id,
    req.user.id
);


if (!booking) {

    return res.status(404).json({

        success: false,

        message:
            "Booking not found or already accepted"

    });

}


return res.status(200).json({

    success: true,

    message:
        "Booking accepted successfully",

    booking

});

} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};



const assignAgent = async (req, res) => {

try {

const { id } = req.params;

const { agent_id } = req.body;


if (!agent_id) {

    return res.status(400).json({
        success: false,
        message:
            "Agent ID is required"

    });

}


const booking = await assignAgentToBooking(

    id,
    req.user.id,
    agent_id

);


if (!booking) {

    return res.status(404).json({

        success: false,

        message:
            "Booking not found or agent cannot be assigned"

    });

}


return res.status(200).json({

    success: true,

    message:
        "Agent assigned successfully",

    booking

});

} catch (error) {

return res.status(500).json({
    success: false,
    message: error.message

});

}

};



const autoAssignAgent = async (req, res) => {

try {

const { id } = req.params;


const booking =
    await findBestAgentForBooking(
        id,
        req.user.id

    );


if (!booking) {

    return res.status(404).json({

        success: false,

        message:
            "No available agent found"

    });

}


return res.status(200).json({

    success: true,

    message:
        "Best available agent assigned successfully",

    booking

});

} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};



const completeProviderBooking = async (req, res) => {

try {

const { id } = req.params;


const booking = await completeBooking(

    id,

    req.user.id

);


if (!booking) {

    return res.status(404).json({

        success: false,

        message:
            "Booking not found or cannot be completed"

    });

}


return res.status(200).json({

    success: true,
    message:
        "Booking completed successfully",
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
getProviderPendingBookings,
acceptProviderBooking,
assignAgent,
autoAssignAgent,
completeProviderBooking

};