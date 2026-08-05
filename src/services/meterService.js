const pool = require("../config/db");

const record = async (req) => {
    const idempotencyKey = req.header("Idempotency-Key");

    if(!idempotencyKey){
        throw new Error("Idempotency-Key header is required");
    }
    return{
        success:true,
        message:"Meter service reached",
         idempotencyKey
    };
};

module.exports = {
    record
};