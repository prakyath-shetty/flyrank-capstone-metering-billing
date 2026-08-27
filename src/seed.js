require("dotenv").config();

const pool = require("./config/db");

async function seed() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Create/find Free plan
        let result = await client.query(
            "SELECT id FROM plans WHERE name = $1",
            ["Free"]
        );

        let freePlanId;

        if (result.rows.length === 0) {
            result = await client.query(
                `INSERT INTO plans
                (name, monthly_price, monthly_request_limit, monthly_token_limit)
                VALUES ($1, $2, $3, $4)
                RETURNING id`,
                ["Free", 0.00, 1000, 100000]
            );

            freePlanId = result.rows[0].id;
        } else {
            freePlanId = result.rows[0].id;
        }

        // 2. Create/find Pro plan
        result = await client.query(
            "SELECT id FROM plans WHERE name = $1",
            ["Pro"]
        );

        let proPlanId;

        if (result.rows.length === 0) {
            result = await client.query(
                `INSERT INTO plans
                (name, monthly_price, monthly_request_limit, monthly_token_limit)
                VALUES ($1, $2, $3, $4)
                RETURNING id`,
                ["Pro", 49.00, 10000, 1000000]
            );

            proPlanId = result.rows[0].id;
        } else {
            proPlanId = result.rows[0].id;
        }

        // 3. Create/find demo tenant
        result = await client.query(
            "SELECT id FROM tenants WHERE email = $1",
            ["demo@example.com"]
        );

        let tenantId;

        if (result.rows.length === 0) {
            result = await client.query(
                `INSERT INTO tenants
                (company_name, email, phone, website, plan_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [
                    "Demo Company",
                    "demo@example.com",
                    null,
                    null,
                    freePlanId
                ]
            );

            tenantId = result.rows[0].id;
        } else {
            tenantId = result.rows[0].id;
        }

        // 4. Create/find demo subscription
        result = await client.query(
            `SELECT id
             FROM subscriptions
             WHERE tenant_id = $1
             AND status = 'active'
             LIMIT 1`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            await client.query(
                `INSERT INTO subscriptions
                (tenant_id, plan_id, stripe_subscription_id, status)
                VALUES ($1, $2, $3, $4)`,
                [
                    tenantId,
                    freePlanId,
                    "test-sub-001",
                    "active"
                ]
            );
        }

        // Keep the demo tenant on the Free plan for a clean seed state.
        await client.query(
            `UPDATE tenants
             SET plan_id = $1
             WHERE id = $2`,
            [freePlanId, tenantId]
        );

        await client.query("COMMIT");

        console.log("Seed completed successfully.");
        console.log(`Free plan ID: ${freePlanId}`);
        console.log(`Pro plan ID: ${proPlanId}`);
        console.log(`Demo tenant ID: ${tenantId}`);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();