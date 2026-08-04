const express = require("express");
const cors = require("cors");

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//Health Check Route
app.get("/",(req,res) => {
    res.status(200).json({
        success:true,
        message:"Usage Metering & Billing Engine API is running"
    });
});

module.exports = app;