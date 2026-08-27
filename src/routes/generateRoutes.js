const express = require("express");
const router = express.Router();

const generateController = require("../controllers/generateController");
const validateUsage = require("../middleware/validateUsage");

console.log("GENERATE ROUTES LOADED");

router.post(
    "/generate",
    validateUsage,
    generateController.generate
);

module.exports = router;