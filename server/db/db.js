const { Pool } = require("pg");

/**
 * DATABASE CONNECTION - TOTAL FIX
 * 1. Uses native URL parser to ensure delimiters (?, &) are preserved.
 * 2. Explicitly sets rejectUnauthorized: false for all remote connections.
 */

let connectionString = process.env.POSTGRES_URL || "postgres://root:dakshana2005@127.0.0.1:5432/secure_exam_portal";

// Check if we are in a production/remote context
const isProduction = process.env.NODE_ENV === "production" || (!connectionString.includes("127.0.0.1") && !connectionString.includes("localhost"));

if (isProduction) {
    try {
        // Use Node's built-in URL parser to handle the connection string safely
        const dbUrl = new URL(connectionString);
        
        // Ensure sslmode is set to 'require' but rely on the Pool object's 
        // rejectUnauthorized setting to bypass self-signed cert checks.
        dbUrl.searchParams.set("sslmode", "require");
        
        connectionString = dbUrl.toString();
        
        // Final fallback for certain serverless drivers
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    } catch (e) {
        console.error("Error parsing connection string:", e.message);
    }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log("PostgreSQL Connection established successfully.");
});

pool.on('error', (err) => {
    console.error("Postgres Pool Error:", err.message);
});

module.exports = pool;
