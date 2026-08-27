const tenantService = require("../services/tenantServices");

const createTenant = async (req, res) => {
    try {
        const tenant = await tenantService.createTenant(req.body);

        return res.status(201).json({
            success: true,
            data: tenant
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A tenant with this email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    createTenant
};