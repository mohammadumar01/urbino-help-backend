const {
getProviderServices,
addProviderService,
deleteProviderService
} = require("../models/providerServiceModel");


// GET Provider Services
const getServices = async (req, res) => {
try {

    const providerId = req.user.id;

    const services = await getProviderServices(providerId);

    res.status(200).json({
        success: true,
        services
    });

} catch (error) {

    console.error("Get Provider Services Error:", error);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
};


// ADD Provider Service
const addService = async (req, res) => {
try {

    const providerId = req.user.id;

    const {
        service_id,
        price
    } = req.body;

    if (!service_id || !price) {
        return res.status(400).json({
            success: false,
            message: "service_id and price are required"
        });
    }

    const service = await addProviderService(
        providerId,
        service_id,
        price
    );

    res.status(201).json({
        success: true,
        message: "Service added successfully",
        service
    });

} catch (error) {

    console.error("Add Provider Service Error:", error);

    // Duplicate service
    if (error.code === "23505") {
        return res.status(400).json({
            success: false,
            message: "Service already added to provider"
        });
    }

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
};


// DELETE Provider Service
const deleteService = async (req, res) => {
try {

    const providerId = req.user.id;

    const serviceId = req.params.serviceId;

    const service = await deleteProviderService(
        providerId,
        serviceId
    );

    if (!service) {
        return res.status(404).json({
            success: false,
            message: "Provider service not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Service removed successfully",
        service
    });

} catch (error) {

    console.error("Delete Provider Service Error:", error);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
};


module.exports = {
getServices,
addService,
deleteService
};