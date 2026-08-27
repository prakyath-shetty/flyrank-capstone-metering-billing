const validateUsage = (req, res, next) => {
    const {
        tenant_id,
        request_id,
        input_tokens,
        output_tokens,
        cached_input_tokens,
        reasoning_tokens,
        total_tokens,
        api_calls
    } = req.body;

    if (!tenant_id) {
        return res.status(400).json({
            success: false,
            message: "tenant_id is required"
        });
    }

    if (!request_id) {
        return res.status(400).json({
            success: false,
            message: "request_id is required"
        });
    }

    const numericFields = {
        input_tokens,
        output_tokens,
        cached_input_tokens,
        reasoning_tokens,
        total_tokens,
        api_calls
    };

    for (const [field, value] of Object.entries(numericFields)) {
        if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < 0)) {
            return res.status(400).json({
                success: false,
                message: `${field} must be a non-negative integer`
            });
        }
    }

    if (api_calls !== undefined && Number(api_calls) < 1) {
        return res.status(400).json({
            success: false,
            message: "api_calls must be at least 1"
        });
    }

    next();
};

module.exports = validateUsage;