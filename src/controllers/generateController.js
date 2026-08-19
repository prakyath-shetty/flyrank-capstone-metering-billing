const meterService = require("../services/meterService");

const generate = async(req,res) => {
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
    generate
};