const {
    getPendingVerifications,
    updateVerificationStatus,
     verifyProviderProfile
} = require("../models/adminVerificationModel");

const {
    createNotification
} = require("../models/notificationModel");

// Get Pending Verification

const getAllPendingVerification = async (req,res)=>{

try{

const verifications = await getPendingVerifications();


return res.status(200).json({

    success:true,
    verifications

});


}catch(error){

return res.status(500).json({

    success:false,
    message:error.message

});

}

};



// Approve Verification

const approveVerification = async(req,res)=>{

try{

const { id } = req.params;


const verification = await updateVerificationStatus(
    id,
    "approved",
    null,
    req.user.id
);


if(!verification){

    return res.status(404).json({

        success:false,
        message:"Verification not found"

    });

}

await verifyProviderProfile(
    verification.provider_id
);

await createNotification(
    verification.provider_id,
    null,
    "Verification Approved",
    "Your provider verification has been approved successfully.",
    "verification_approved"
);

return res.status(200).json({

    success:true,
    message:"Verification approved successfully",
    verification

});


}catch(error){

return res.status(500).json({

    success:false,
    message:error.message

});

}

};



// Reject Verification

const rejectVerification = async(req,res)=>{

try{

const { id } = req.params;

const { rejection_reason } = req.body;


const verification = await updateVerificationStatus(
    id,
    "rejected",
    rejection_reason,
    req.user.id
);


if(!verification){

    return res.status(404).json({

        success:false,
        message:"Verification not found"

    });

}


await createNotification(
    verification.provider_id,
    null,
    "Verification Rejected",
    `Your provider verification was rejected. Reason: ${rejection_reason}`,
    "verification_rejected"
);

return res.status(200).json({

    success:true,
    message:"Verification rejected successfully",
    verification

});


}catch(error){

return res.status(500).json({

    success:false,
    message:error.message

});

}

};


module.exports = {

getAllPendingVerification,
approveVerification,
rejectVerification

};