const OpenAI = require("openai");


const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});


const generateAIResponse = async (message) => {

try {

    const response = await openai.responses.create({

        model: "gpt-5.6-luna",

        input: [
            {
                role: "system",

                content: `
You are an AI assistant for Urbino Help.

Urbino Help is a home service marketplace.

You help users with:

- Finding services
- Booking services
- AC repair
- Plumbing
- Electrical services
- Cleaning services
- Booking related questions
- Provider related questions

Rules:

- Be helpful and professional.
- Keep responses concise.
- Do not provide false information.
- If you don't know something about Urbino Help, clearly say so.
`
            },

            {
                role: "user",

                content: message
            }
        ]

    });


    return response.output_text;

} catch (error) {

    console.error(
        "OpenAI Service Error:",
        error.message
    );

    throw error;

}

};


module.exports = {
generateAIResponse
};