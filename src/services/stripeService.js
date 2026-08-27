const pool = require("../config/db");
const {
    createMockCheckoutSession
} = require("./mockPaymentService");

const createCheckoutSession = async (tenantId, planId) => {
    const tenantResult = await pool.query(
        `SELECT
            t.id,
            t.company_name,
            t.email
         FROM tenants t
         WHERE t.id = $1`,
        [tenantId]
    );

    if (tenantResult.rows.length === 0) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
    }

    const tenant = tenantResult.rows[0];

    const planResult = await pool.query(
        `SELECT
            id,
            name,
            monthly_price
         FROM plans
         WHERE id = $1`,
        [planId]
    );

    if (planResult.rows.length === 0) {
        const error = new Error("Plan not found");
        error.statusCode = 404;
        throw error;
    }

    const plan = planResult.rows[0];

    if (plan.name !== "Pro") {
        const error = new Error(
            "Only the Pro plan is available for checkout"
        );
        error.statusCode = 400;
        throw error;
    }

    const session = await createMockCheckoutSession({
        tenantId: tenant.id,
        tenantEmail: tenant.email,
        planId: plan.id,
        planName: plan.name,
        monthlyPrice: plan.monthly_price
    });

    return {
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        test_mode: true,
        provider: "mock"
    };
};

module.exports = {
    createCheckoutSession
};