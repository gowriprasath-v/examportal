const db = require("./db");

const query = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});

async function run() {
    try {
        console.log("Creating audit_logs table...");
        await query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(255),
                role VARCHAR(50),
                ip VARCHAR(45),
                event_type VARCHAR(100),
                details TEXT
            )
        `);
        console.log("Audit Logs table created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating audit_logs table:", err);
        process.exit(1);
    }
}

run();
