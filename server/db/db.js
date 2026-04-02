const { Pool } = require("pg");

// Configuration for local and Vercel environments
const connectionString = process.env.POSTGRES_URL || "postgres://root:dakshana2005@127.0.0.1:5432/secure_exam_portal";

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

function connectWithRetry() {
  pool.connect((err, client, release) => {
    if (err) {
      console.error("Postgres Connection Failed (Retrying in 5s):", err.code || err.message);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log("PostgreSQL Connected...");
      release(); // Release client back into the pool
    }
  });
}

connectWithRetry();

// Add promise compatibility layer if needed (mysql2 had both)
// But here we'll just export the pool as the default
module.exports = pool;
