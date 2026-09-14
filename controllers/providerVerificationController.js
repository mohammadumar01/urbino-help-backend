const {
createVerification,
getVerificationByProvider,
checkAadhaarExists,
checkDocumentExists
} = require("../models/providerVerificationModel");


// Provider Submit Verification

const submitVerification = async (req,res) => {

try {

const provider_id = req.user.id;

const {
    document_type,
    document_number,
    document_url
} = req.body;
  
const allowedDocuments = [
    "Aadhaar",
    "PAN",
    "Driving License",
    "Skill Certificate",
    "Experience Proof",
    "Address Proof"
];


if(!allowedDocuments.includes(document_type)){

    return res.status(400).json({
        success:false,
        message:"Invalid document type"
    });

}

if(!document_type || !document_url){

    return res.status(400).json({
        success:false,
        message:"Document type and document url are required"
    });

}

if(document_type !== "Aadhaar"){

    const aadhaar = await checkAadhaarExists(provider_id);


    if(!aadhaar){

        return res.status(400).json({

            success:false,

            message:"First upload Aadhaar card. Aadhaar is mandatory."

        });

    }

}

const existingDocument = await checkDocumentExists(
    provider_id,
    document_type
);

if (existingDocument) {

    return res.status(409).json({
        success: false,
        message: `${document_type} document already submitted`
    });

}

const verification = await createVerification(
    provider_id,
    document_type,
    document_number,
    document_url
);

return res.status(201).json({

    success:true,
    message:"Verification submitted successfully",
    verification

});

}catch(error){

return res.status(500).json({
    
    success:false,
    message:error.message

});

}

};



// Provider Check Verification Status

const getMyVerification = async(req,res)=>{

try{

const provider_id = req.user.id;


const verification =
    await getVerificationByProvider(provider_id);



return res.status(200).json({

    success:true,
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

submitVerification,
getMyVerification

};