const crypto = require("crypto");

const createMockCheckoutSession = async ({
    tenantId,
    tenantEmail,
    planId,
    planName,
    monthlyPrice
}) => {
    const sessionId = `cs_test_${crypto.randomUUID()}`;

    return {
        id: sessionId,
        url: `http://localhost:3000/mock-checkout/${sessionId}`,
        mode: "subscription",
        customer_email: tenantEmail,
        metadata: {
            tenant_id: String(tenantId),
            plan_id: String(planId)
        },
        subscription_data: {
            metadata: {
                tenant_id: String(tenantId),
                plan_id: String(planId)
            }
        },
        amount: Math.round(Number(monthlyPrice) * 100),
        currency: "usd",
        plan_name: planName
    };
};

module.exports = {
    createMockCheckoutSession
};