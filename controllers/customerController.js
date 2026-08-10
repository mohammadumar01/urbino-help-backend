const { updateProfile } = require("../models/customerModel");

const updateCustomerProfile = async (req,res) => {

    try {
        
        const { name, phone } = req.body;

        if(!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and PhoneNo are required"
            });
        }

        const user = await updateProfile(
            req.user.id,
            name,
            phone
        );
         if(!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
        
            });
         }
        return res.status(200).json({
            success: true,
            message: "profile Updated Successfully",
            user
        });


    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    updateCustomerProfile
};