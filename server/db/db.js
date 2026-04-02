const { Pool } = require("pg");

// 1. Get the connection string
let connectionString = process.env.POSTGRES_URL || "postgres://root:dakshana2005@127.0.0.1:5432/secure_exam_portal";

// 2. Determine if we are in a production/remote environment
const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");

// 3. For remote connections, we must handle the Vercel/Neon SSL requirements.
// Often, the connection string contains ?sslmode=require which can force strict checking.
// We clean the URL to ensure our programmatic 'ssl' object takes precedence.
if (isRemote) {
    // If it's a remote connection, ensure we don't have conflicting sslmode in the URL
    // but we can append it if the driver requires it.
    if (!connectionString.includes("sslmode=")) {
        connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=require";
    }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log("PostgreSQL Connected successfully.");
});

pool.on('error', (err) => {
    console.error("Postgres Pool Error:", err.message);
});

module.exports = pool;
