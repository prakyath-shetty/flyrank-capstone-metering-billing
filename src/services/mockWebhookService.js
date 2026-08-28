const crypto = require("crypto");
const pool = require("../config/db");

const WEBHOOK_SECRET =
    process.env.MOCK_WEBHOOK_SECRET || "mock_webhook_secret";

const generateSignature = (payload) => {
    return crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest("hex");
};

const verifySignature = (payload, signature) => {
    const expectedSignature = generateSignature(payload);

    if (!signature) {
        return false;
    }

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        expectedBuffer,
        signatureBuffer
    );
};

const handleWebhook = async (payload) => {
    const { event_id, type, data } = payload;

    if (!event_id) {
        const error = new Error("event_id is required");
        error.statusCode = 400;
        throw error;
    }

    if (!type) {
        const error = new Error("event type is required");
        error.statusCode = 400;
        throw error;
    }

    if (!data || !data.tenant_id || !data.plan_id) {
        const error = new Error("Invalid webhook data");
        error.statusCode = 400;
        throw error;
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const existingEvent = await client.query(
            `SELECT id
             FROM payment_webhook_events
             WHERE event_id = $1`,
            [event_id]
        );

        if (existingEvent.rows.length > 0) {
            await client.query("ROLLBACK");

            return {
                success: true,
                duplicate: true,
                message: "Webhook already processed"
            };
        }

        if (type === "subscription.created" ||
            type === "subscription.updated") {

            const subscriptionId =
                data.subscription_id ||
                `mock_sub_${crypto.randomUUID()}`;

            await client.query(
                `INSERT INTO subscriptions (
                    tenant_id,
                    plan_id,
                    stripe_subscription_id,
                    status,
                    start_date
                )
                VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)
                ON CONFLICT (stripe_subscription_id)
                DO UPDATE SET
                    plan_id = EXCLUDED.plan_id,
                    status = EXCLUDED.status`,
                [
                    Number(data.tenant_id),
                    Number(data.plan_id),
                    subscriptionId
                ]
            );

            await client.query(
                `UPDATE tenants
                 SET plan_id = $1
                 WHERE id = $2`,
                [
                    Number(data.plan_id),
                    Number(data.tenant_id)
                ]
            );
        }

        if (type === "subscription.cancelled") {
            await client.query(
                `UPDATE subscriptions
                 SET status = 'cancelled',
                     end_date = CURRENT_TIMESTAMP
                 WHERE stripe_subscription_id = $1`,
                [data.subscription_id]
            );
        }

        await client.query(
            `INSERT INTO payment_webhook_events (
                event_id,
                event_type
            )
            VALUES ($1, $2)`,
            [event_id, type]
        );

        await client.query("COMMIT");

        return {
            success: true,
            duplicate: false,
            message: "Webhook processed successfully"
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    generateSignature,
    verifySignature,
    handleWebhook
};