const { Pool } = require("pg");

// 1. Get the connection string
let connectionString = process.env.POSTGRES_URL || "postgres://root:dakshana2005@127.0.0.1:5432/secure_exam_portal";

// 2. Identify if we are in production
const isProduction = process.env.NODE_ENV === "production" || (!connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));

if (isProduction) {
    // 3. STRIP sslmode from the URL to prevent it from forcing 'verify-full'
    // Vercel/Neon defaults often include ?sslmode=require which overrides programmatic settings
    connectionString = connectionString.replace(/(\?|&|#)sslmode=[^&^#]*/, "");
    
    // 4. Force Node to ignore self-signed certificate errors globally for this process
    // This is a common requirement for connecting to certain hosted Postgres instances from Serverless
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const pool = new Pool({
  connectionString: connectionString,
  // 5. Explicitly set SSL object for production
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log("PostgreSQL Connected successfully.");
});

pool.on('error', (err) => {
    console.error("Postgres Pool Error:", err.message);
});

module.exports = pool;
