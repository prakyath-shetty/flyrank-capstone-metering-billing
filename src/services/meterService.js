const pool = require("../config/db");

const record = async (req) => {
    const idempotencyKey = req.header("Idempotency-Key");
    const existing = await pool.query(`SELECT * FROM usage_events WHERE idempotency_key = $1`,
        [idempotencyKey]
    );

    if(existing.rows.length > 0){
        return{
            success:true,
            duplicate:true,
            data:existing.rows[0],
        };
    }
    //Get tenant's active plan and quota limits
    const planResult = await pool.query(
        `SELECT p.monthly_request_limit,p.monthly_token_limit
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.tenant_id = $1
        AND s.status = 'active'
        ORDER BY s.id DESC
        LIMIT 1`,
        [req.body.tenant_id]
    );

    if(planResult.rows.length === 0){
        const error = new Error("No active subscription found");
        error.statusCode = 402;
        throw error;
    }

    const plan = planResult.rows[0];

    //Get current month's usage
    const usageResult = await pool.query(
        `SELECT 
        COALESCE(SUM(api_calls),0) AS used_requests,
        COALESCE(SUM(total_tokens),0) AS used_tokens
        FROM usage_events
        WHERE tenant_id = $1
        AND created_at >= date_trunc('month',NOW())
        `,
        [req.body.tenant_id]
    );

    const usage = usageResult.rows[0];

    const usedRequests = Number(usage.used_requests);
    const usedTokens = Number(usage.used_tokens);

    const requestedRequests = Number(req.body.api_calls || 1);
    const requestedTokens  = Number(req.body.total_tokens || 0);

    const requestLimit = Number(plan.monthly_request_limit);
    const tokenLimit = Number(plan.monthly_token_limit);

    //Quota check 
    if(usedRequests + requestedRequests > requestLimit){
        const error = new Error(
            `API request quota exceeded. Used ${usedRequests} of ${requestLimit} requests this month.`
        );
        error.statusCode = 429;
        throw error;
    }

    if(usedTokens + requestedTokens > tokenLimit){
        const error = new Error(
            `AI token quota exceeded. Used ${usedTokens} of ${tokenLimit} tokens this months. `
        );
        error.statusCode = 429;
        throw error;
    }

     if(!idempotencyKey){
        throw new Error("Idempotency-Key header is required");
    }

    await pool.query(
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
            req.body.tenant_id,
            req.body.request_id,
            req.body.input_tokens,
            req.body.output_tokens,
            req.body.cached_input_tokens,
            req.body.reasoning_tokens,
            req.body.total_tokens,
            req.body.api_calls,
            req.body.cost,
            idempotencyKey,
        ]
    );

    return{
        success:true,
        message:"Meter service reached",
         idempotencyKey
    };
};


module.exports = {
    record
};