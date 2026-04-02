const { Pool } = require("pg");

// Configuration for local and Vercel environments
const connectionString = process.env.POSTGRES_URL || "postgres://root:dakshana2005@127.0.0.1:5432/secure_exam_portal";

// Vercel Postgres/Neon requires SSL. 
// We use rejectUnauthorized: false to handle self-signed certs in the chain.
const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") 
    ? false 
    : { rejectUnauthorized: false }
});

// For serverless functions, we don't necessarily need a persistent connection check on startup,
// but we'll log once if a connection is established.
pool.on('connect', () => {
    console.log("PostgreSQL Connected...");
});

pool.on('error', (err) => {
    console.error("Postgres Pool Error:", err.message);
});

module.exports = pool;
