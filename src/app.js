const generateRoutes = require("./routes/generateRoutes");
const express = require("express");
const cors = require("cors");
const usageRoutes = require("./routes/usageRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const app = express();

//Middleware
app.use(cors());
app.use(express.json());
app.use("/",generateRoutes);
app.use("/",usageRoutes);
app.use("/", tenantRoutes);
//Health Check Route
app.get("/",(req,res) => {
    res.status(200).json({
        success:true,
        message:"Usage Metering & Billing Engine API is running"
    });
});

module.exports = app;