const tenantService = require("../services/tenantServices");

const createTenant = async(req,res) => {
    try{
        const tenant = await tenantService.createTenant(req.body);

        res.status(201).json({
            success:true,
            data:tenant
        });
    }catch (err){
        res.status(500).json({
            success:false,
            message:err.message
        });
    }
};

module.exports = {
    createTenant
};