const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const agentRoutes = require("./routes/agentRoutes");
const providerProfileRoutes = require("./routes/providerProfileRoutes");
const providerServiceRoutes = require("./routes/providerServiceRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const providerVerificationRoutes = require("./routes/providerVerificationRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const providerAvailabilityRoutes = require("./routes/providerAvailabilityRoutes");
const providerAgentRoutes = require("./routes/providerAgentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

//middleware

app.use("/api/auth",authRoutes);
app.use("/api/customer",customerRoutes);
app.use("/api/booking",bookingRoutes);
app.use("/api/provider",providerRoutes);
app.use("/api/provider-profile", providerProfileRoutes);
app.use("/api/provider-services", providerServiceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/admin", adminVerificationRoutes);
app.use("/api/agent",agentRoutes);
app.use("/api/payment", paymentRoutes);
app.use(
    "/api/provider-verification",
    providerVerificationRoutes
);

app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);

app.use(
    "/api/provider-availability",
    providerAvailabilityRoutes
);

app.use(
    "/api/provider-agents",
    providerAgentRoutes
);


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

app.use(errorHandler);

module.exports = app;
