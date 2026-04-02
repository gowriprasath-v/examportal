const db = require("../db/db");

/**
 * Log an event to the audit_logs table.
 * @param {string} username - Name of the user (or 'system'/'unknown').
 * @param {string} role - Role of the user (Admin, Faculty, Student, Unknown).
 * @param {string} ip - IP address of the requestor.
 * @param {string} eventType - Type of event (Login Success, Exam Created, etc.).
 * @param {string} details - Additional information about the event.
 */
const logEvent = (username, role, ip, eventType, details) => {
    // Postgres uses $1, $2, etc.
    const sql = "INSERT INTO audit_logs (username, role, ip, event_type, details) VALUES ($1, $2, $3, $4, $5)";
    db.query(sql, [username || 'unknown', role || 'Unknown', ip || '0.0.0.0', eventType, details], (err) => {
        if (err) {
            console.error("Audit Log Error:", err);
        }
    });
};

module.exports = { logEvent };
