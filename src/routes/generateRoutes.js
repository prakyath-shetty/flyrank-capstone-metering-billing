const express = require("express");
const router = express.Router();

const generateController = require("../controllers/generateController");
console.log("GENERATE ROUTES LOADED");
router.post("/generate",generateController.generate);

module.exports = router;