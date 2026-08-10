const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const agentRoutes = require("./routes/agentRoutes");
const app = express();

app.use(cors());
app.use(express.json());

//middleware

app.use("/api/auth",authRoutes);
app.use("/api/customer",customerRoutes);
app.use("/api/booking",bookingRoutes);
app.use("/api/provider",providerRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/agent",agentRoutes);

app.get("/",(req,res) => {
    res.json({
        success: true,
        message: "Urbino Help Backend running "
       });

});

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);
module.exports = app;
