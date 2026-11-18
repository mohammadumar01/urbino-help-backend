const {
    discoverProviders
} = require("../models/serviceDiscoveryModel");
const { readLatLng } = require("../utils/geo");


const getDiscoveredProviders = async (req, res) => {

    try {

        const {
            service_id,
            service_area
        } = req.query;


        if (!service_id) {

            return res.status(400).json({
                success: false,
                message: "Service ID is required"
            });

        }


        const near = readLatLng(req.query) || null;
        const providers = await discoverProviders(
            service_id,
            service_area,
            near
        );


        return res.status(200).json({
            success: true,
            totalProviders: providers.length,
            providers
        });

    } catch (error) {

        console.error(
            "Provider Discovery Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


module.exports = {
    getDiscoveredProviders
};