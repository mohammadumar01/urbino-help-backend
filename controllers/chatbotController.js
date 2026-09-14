const {
    
generateAIResponse

} = require("../services/aiService");


const sendMessage = async (req, res) => {

try {

    const { message } = req.body;


    // Validate message

    if (!message) {

        return res.status(400).json({
            success: false,
            message: "Message is required"
        });

    }


    // Generate AI response

    const aiResponse =
        await generateAIResponse(message);


    return res.status(200).json({

        success: true,

        message: "AI response generated successfully",

        response: aiResponse

    });


} catch (error) {

    console.error(
        "Chatbot Error:",
        error.message
    );


    return res.status(500).json({

        success: false,

        message: "Failed to generate AI response"

    });

}

};


module.exports = {
sendMessage
};