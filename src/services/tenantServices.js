const pool = require("../config/db");

const createTenant = async(data) => {
    const {company_name, email, phone ,website ,plan_id } = data;

    const query = `
        INSERT INTO tenants
        (company_name, email, phone ,website ,plan_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *;
        `;
     
    const values = [
        company_name,
        email,
        phone,
        website,
        plan_id
    ];
    const result = await pool.query(query, values);
     
    return result.rows[0];
};

module.exports = {
    createTenant
};