const express = require("express");
const cors = require("cors");

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//Test Route
app.get("/",(req,res) => {
    res.json({
        message:" Usage Metering & Billing Engine API is running" 
    });
});

module.exports = app;