const { getProfileById }  = require("../models/profileModel");

const getProfile = async(req,res) => {
    
    try {

        const user = await getProfileById(req.user.id);

        if(!user) {

             return res.status(404).json({
            success:false,
            message:"User not found"
        });

        }

        return res.status(200).json({
            success: true,
            message: "profile fatched succeesfully",
            user
        });
       

    }
    catch (error) {
        return res.status(500).json({
            sucess: false,
            message: error.message
        });
    }

};

module.exports = {
    getProfile
};