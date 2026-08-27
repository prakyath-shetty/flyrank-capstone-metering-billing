const express = require("express");
const router = express.Router();

const usageController = require("../controllers/usageController");

router.get("/usage",usageController.getUsage);

router.post("/usage/record",usageController.record);

module.exports = router;