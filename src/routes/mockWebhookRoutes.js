const express = require("express");
const router = express.Router();

const {
    receiveWebhook
} = require("../controllers/mockWebhookController");

router.post(
    "/mock-webhook",
    receiveWebhook
);

module.exports = router;