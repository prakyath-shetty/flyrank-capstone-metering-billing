const {
    verifySignature,
    handleWebhook
} = require("../services/mockWebhookService");

const receiveWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-mock-signature"];

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: "x-mock-signature header is required"
            });
        }

        const isValid = verifySignature(req.body, signature);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature"
            });
        }

        const result = await handleWebhook(req.body);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Mock webhook error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Webhook processing failed"
        });
    }
};

module.exports = {
    receiveWebhook
};