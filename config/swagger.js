const swaggerJsDoc = require("swagger-jsdoc");

const swaggerOptions = {
    definition : {
        openapi: "3.0.0",

        info: {
            title: "Urbino Help API",
            version:"1.0.0",
            description:"Backend APIs for Urbino Help Servie Marketplace",

        },

        servers: [
            {
                url: "http://localhost:5500",
            },
        ],

        components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },

    },

    apis: ["**/*.js"]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
module.exports = swaggerSpec;