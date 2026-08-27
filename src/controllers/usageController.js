const meterService = require("../services/meterService");
const pool = require("../config/db");
const PRICING = require("../config/pricing");

const getUsage = async (req, res) => {
    try{
        const tenantId = Number(req.query.tenant_id);

        console.log("tenantId:",tenantId);
        console.log("query:",req.query);



        if(!tenantId){
            return res.status(400).json({
                success:false,
                message:"tenant_id is required"
            });
        }

        //Get tenant's active plan and limits
        const planResult = await pool.query(
            `SELECT
            p.monthly_request_limit,
            p.monthly_token_limit
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1
            AND s.status = 'active'
            LIMIT 1`,
            [tenantId]
        );

        if(planResult.rows.length === 0){
            return res.status(404).json({
                success:false,
                message:"No active subscription found"
            });
        }


        const plan = planResult.rows[0];

        //Roll up current month's usage
        const usageResult = await pool.query(
            `SELECT
            COALESCE(SUM(api_calls),0) AS used_requests,
            COALESCE(SUM(total_tokens),0) AS used_tokens,
            COALESCE(SUM(cost),0) AS cost
            FROM usage_events
            WHERE tenant_id = $1
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            `,
            [tenantId]
        );

        const usage = usageResult.rows[0];

        return res.status(200).json({
            success:true,
            data:{
                used:{
                    requests:Number(usage.used_requests),
                    tokens:Number(usage.used_tokens)
                },
                limits:{
                    requests:Number(plan.monthly_request_limit),
                    tokens:Number(plan.monthly_token_limit)
                },
                cost:Number(usage.cost)
            }
        });

    }catch(error){
        console.log("Get usage error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to get usage"
        });
    }
};

const record = async (req, res) => {
    try{
        const result = await meterService.record(req);

        return res.status(200).json(result);
    }catch(error){
        return res.status(error.statusCode || 500).json({
            success:false,
            message:error.message
        });

    }
};
module.exports = {
    getUsage,
    record
};
