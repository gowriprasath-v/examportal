const db = require("../db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_123";

const { logEvent } = require("../utils/auditLogger");


exports.login = (req, res) => {
  const { username, password, captcha } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required" });
  }

  // Simple Mock CAPTCHA check
  if (captcha !== "1234") { // Temporary mock captcha
    logEvent(username, "Unknown", ip, "Login Failure", "Incorrect CAPTCHA");
    return res.status(400).json({ success: false, message: "Invalid CAPTCHA" });
  }

  // Fetch user by username only
  const sql = "SELECT * FROM users WHERE name=?";

  db.query(sql, [username], async (err, result) => {
    if (err) {
      console.error("Login Query Error:", err);
      logEvent(username, "Unknown", ip, "Login Error", "Database query failed");
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (result.length === 0) {
      logEvent(username, "Unknown", ip, "Login Failure", "User not found");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        logEvent(username, user.role, ip, "Login Failure", "Invalid password");
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      logEvent(username, user.role, ip, "Login Success", "User authenticated successfully");
      const token = jwt.sign(
        { id: user.id, username: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.name,
          role: user.role
        },
        role: user.role
      });
    } catch (error) {
      console.error("Compare Error:", error);
      logEvent(username, user.role, ip, "Login Error", "Password comparison failed");
      res.status(500).json({ success: false, message: "Server error" });
    }
  });
};

exports.register = async (req, res) => {
  const { username, password, email, phone, captcha } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  // Role is now hardcoded to 'Student' for self-registration
  const role = "Student";

  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: "Username, password, and email are required" });
  }

  if (captcha !== "1234") {
    logEvent(username, role, ip, "Registration Failure", "Invalid CAPTCHA");
    return res.status(400).json({ success: false, message: "Invalid CAPTCHA" });
  }

  try {
    // Check if user already exists
    const checkSql = "SELECT id FROM users WHERE name = ? OR email = ?";
    db.query(checkSql, [username, email], async (err, result) => {
      if (err) {
        console.error("Registration Check Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }

      if (result.length > 0) {
        logEvent(username, role, ip, "Registration Failure", "Username or Email already taken");
        return res.status(400).json({ success: false, message: "Username or Email already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const insertSql = "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)";
      db.query(insertSql, [username, email, phone || null, hashedPassword, role], (err) => {
        if (err) {
          console.error("Registration Insert Error:", err);
          logEvent(username, role, ip, "Registration Error", "Database insertion failed");
          return res.status(500).json({ success: false, message: "Registration failed" });
        }

        logEvent(username, role, ip, "Registration Success", `New ${role} registered successfully`);
        res.json({ success: true, message: "Account created successfully. Please log in." });
      });
    });
  } catch (error) {
    console.error("Registration Error:", error);
    logEvent(username, role, ip, "Registration Error", "Unexpected server error");
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAuditLogs = (req, res) => {
  // Basic role check (assuming middleware will handle token verification)
  const sql = "SELECT * FROM audit_logs ORDER BY timestamp DESC";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to fetch logs" });
    res.json(result);
  });
};

exports.clearAuditLogs = (req, res) => {
  const sql = "DELETE FROM audit_logs";
  db.query(sql, (err) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to clear logs" });
    logEvent(req.user ? req.user.username : 'admin', 'Admin', req.ip, "Admin Action", "Cleared audit logs");
    res.json({ success: true, message: "Audit logs cleared" });
  });
};

exports.getUsers = (req, res) => {
  const sql = "SELECT id, name, role FROM users";

  db.query(sql, (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
};
