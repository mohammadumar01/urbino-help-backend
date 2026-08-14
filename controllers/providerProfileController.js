const {
    createProviderProfile,
    getProviderProfile,
    updateProviderProfile,
    getPublicProviderProfile
} = require("../models/providerProfileModel");


// CREATE PROVIDER PROFILE
const createProfile = async (req, res) => {
    try {

        const providerId = req.user.id;

        const {
            bio,
            experience_years,
            skills,
            service_area,
            hourly_rate,
            profile_image
        } = req.body;

        const existingProfile = await getProviderProfile(providerId);

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: "Provider profile already exists"
            });
        }

        const profile = await createProviderProfile(
            providerId,
            bio,
            experience_years,
            skills,
            service_area,
            hourly_rate,
            profile_image
        );

        res.status(201).json({
            success: true,
            message: "Provider profile created successfully",
            profile
        });

    } catch (error) {

        console.error("Create Provider Profile Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// GET PROVIDER PROFILE
const getProfile = async (req, res) => {
    try {

        const providerId = req.user.id;

        const profile = await getProviderProfile(providerId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            });
        }

        res.status(200).json({
            success: true,
            profile
        });

    } catch (error) {

        console.error("Get Provider Profile Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// UPDATE PROVIDER PROFILE
const updateProfile = async (req, res) => {
    try {

        const providerId = req.user.id;

        const {
            bio,
            experience_years,
            skills,
            service_area,
            hourly_rate,
            profile_image
        } = req.body;

        const existingProfile = await getProviderProfile(providerId);

        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            });
        }

        const profile = await updateProviderProfile(
            providerId,
            bio,
            experience_years,
            skills,
            service_area,
            hourly_rate,
            profile_image
        );

        res.status(200).json({
            success: true,
            message: "Provider profile updated successfully",
            profile
        });

    } catch (error) {

        console.error("Update Provider Profile Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// GET PUBLIC PROVIDER PROFILE
const getPublicProfile = async (req, res) => {
    try {

        const providerId = req.params.id;

        const profile = await getPublicProviderProfile(providerId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            });
        }

        res.status(200).json({
            success: true,
            profile
        });

    } catch (error) {

        console.error("Get Public Provider Profile Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
    getPublicProfile
};