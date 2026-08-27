const pool = require("../config/db");
const PRICING = require("../config/pricing");

const record = async (req) => {
    const idempotencyKey = req.header("Idempotency-Key");

    if (!idempotencyKey) {
        const error = new Error("Idempotency-Key header is required");
        error.statusCode = 400;
        throw error;
    }

    // First check: return the original result for a retry.
    const existing = await pool.query(
        `SELECT
            id,
            tenant_id,
            request_id,
            input_tokens,
            output_tokens,
            cached_input_tokens,
            reasoning_tokens,
            total_tokens,
            api_calls,
            cost,
            idempotency_key,
            created_at
         FROM usage_events
         WHERE idempotency_key = $1
         LIMIT 1`,
        [idempotencyKey]
    );

    if (existing.rows.length > 0) {
        const event = existing.rows[0];

        return {
            success: true,
            duplicate: true,
            data: event
        };
    }

    const tenantId = Number(req.body.tenant_id);

    // Get tenant's active plan and quota limits.
    const planResult = await pool.query(
        `SELECT
            p.monthly_request_limit,
            p.monthly_token_limit
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.tenant_id = $1
         AND s.status = 'active'
         ORDER BY s.id DESC
         LIMIT 1`,
        [tenantId]
    );

    if (planResult.rows.length === 0) {
        const error = new Error("No active subscription found");
        error.statusCode = 402;
        throw error;
    }

    const plan = planResult.rows[0];

    // Get current month's usage.
    const usageResult = await pool.query(
        `SELECT
            COALESCE(SUM(api_calls), 0) AS used_requests,
            COALESCE(SUM(total_tokens), 0) AS used_tokens
         FROM usage_events
         WHERE tenant_id = $1
         AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
    );

    const usage = usageResult.rows[0];

    const usedRequests = Number(usage.used_requests);
    const usedTokens = Number(usage.used_tokens);

    const requestedRequests = Number(req.body.api_calls || 1);
    const requestedTokens = Number(req.body.total_tokens || 0);

    const inputTokens = Number(req.body.input_tokens || 0);
    const cachedInputTokens = Number(req.body.cached_input_tokens || 0);
    const outputTokens = Number(req.body.output_tokens || 0);
    const reasoningTokens = Number(req.body.reasoning_tokens || 0);

    const billableInputTokens = Math.max(
        inputTokens - cachedInputTokens,
        0
    );

    const calculatedCost =
        requestedRequests * PRICING.apiCall +
        billableInputTokens * PRICING.inputToken +
        cachedInputTokens * PRICING.cachedInputToken +
        (outputTokens + reasoningTokens) * PRICING.outputToken;

    const requestLimit = Number(plan.monthly_request_limit);
    const tokenLimit = Number(plan.monthly_token_limit);

    // Request quota.
    if (usedRequests + requestedRequests > requestLimit) {
        const error = new Error(
            `API request quota exceeded. Used ${usedRequests} of ${requestLimit} requests this month.`
        );
        error.statusCode = 429;
        throw error;
    }

    // Token quota.
    if (usedTokens + requestedTokens > tokenLimit) {
        const error = new Error(
            `AI token quota exceeded. Used ${usedTokens} of ${tokenLimit} tokens this month.`
        );
        error.statusCode = 429;
        throw error;
    }

    // Insert exactly one usage event.
    try {
        const insertResult = await pool.query(
            `INSERT INTO usage_events (
                tenant_id,
                request_id,
                input_tokens,
                output_tokens,
                cached_input_tokens,
                reasoning_tokens,
                total_tokens,
                api_calls,
                cost,
                idempotency_key
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING
                id,
                tenant_id,
                request_id,
                input_tokens,
                output_tokens,
                cached_input_tokens,
                reasoning_tokens,
                total_tokens,
                api_calls,
                cost,
                idempotency_key,
                created_at`,
            [
                tenantId,
                req.body.request_id,
                inputTokens,
                outputTokens,
                cachedInputTokens,
                reasoningTokens,
                requestedTokens,
                requestedRequests,
                calculatedCost,
                idempotencyKey
            ]
        );

        return {
            success: true,
            duplicate: false,
            data: insertResult.rows[0]
        };
    } catch (error) {
        // Another concurrent request may have inserted the same
        // idempotency key after our first SELECT.
        if (error.code === "23505") {
            const duplicateResult = await pool.query(
                `SELECT
                    id,
                    tenant_id,
                    request_id,
                    input_tokens,
                    output_tokens,
                    cached_input_tokens,
                    reasoning_tokens,
                    total_tokens,
                    api_calls,
                    cost,
                    idempotency_key,
                    created_at
                 FROM usage_events
                 WHERE idempotency_key = $1
                 LIMIT 1`,
                [idempotencyKey]
            );

            if (duplicateResult.rows.length > 0) {
                return {
                    success: true,
                    duplicate: true,
                    data: duplicateResult.rows[0]
                };
            }
        }

        throw error;
    }
};

module.exports = {
    record
};