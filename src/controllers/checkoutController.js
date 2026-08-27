const { createCheckoutSession } = require("../services/stripeService");

const createCheckout = async (req, res) => {
    try {
        const { tenant_id, plan_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is required"
            });
        }

        if (!plan_id) {
            return res.status(400).json({
                success: false,
                message: "plan_id is required"
            });
        }

        const result = await createCheckoutSession(
            Number(tenant_id),
            Number(plan_id)
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error("Checkout error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create checkout session"
        });
    }
};

module.exports = {
    createCheckout
};