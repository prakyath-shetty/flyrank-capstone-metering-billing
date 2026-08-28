const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.query("SELECT 1")
    .then(() => console.log("Connected to PostgreSQL"))
    .catch((err) => console.error("Database Connection Error:", err));

module.exports = pool;