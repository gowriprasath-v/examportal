const db = require("../db/db");
const bcrypt = require("bcrypt");

// --- USER MANAGEMENT ---

// --- USER MANAGEMENT ---

exports.getAllUsers = (req, res) => {
    // Admin dashboard now focuses on Faculty management
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Faculty'";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: results });
    });
};

exports.getFaculty = (req, res) => {
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Faculty'";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: results });
    });
};

exports.getStudents = (req, res) => {
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Student'";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: results });
    });
};

exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const requestorRole = req.user.role;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Security: Students can only create Students
    if (requestorRole === 'Student' && role !== 'Student') {
        return res.status(403).json({ success: false, message: "Forbidden: Students can only create Students" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
        db.query(sql, [name, email, hashedPassword, role], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: "User or Email already exists" });
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, message: "User created successfully", userId: result.insertId });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Hashing error" });
    }
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    const requestorRole = req.user.role;

    let sql = "DELETE FROM users WHERE id = ? AND role != 'Admin'";
    if (requestorRole === 'Student') {
        // Students can only delete other students
        sql = "DELETE FROM users WHERE id = ? AND role = 'Student'";
    }

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "User not found or permission denied" });
        res.json({ success: true, message: "User deleted successfully" });
    });
};

// --- EXAM MANAGEMENT ---

exports.getAllExams = (req, res) => {
    const sql = `
    SELECT e.*, u.name as faculty_name 
    FROM exams e 
    JOIN users u ON e.created_by = u.id
  `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, exams: results });
    });
};

exports.updateExamStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // draft, published, disabled
    const sql = "UPDATE exams SET status = ? WHERE id = ?";
    db.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, message: "Exam status updated" });
    });
};

exports.getStats = async (req, res) => {
    try {
        const stats = {};

        // 1. Total Exams
        const [exams] = await db.promise().query("SELECT COUNT(*) as count FROM exams");
        stats.totalExams = exams[0].count;

        // 2. Total Questions
        const [questions] = await db.promise().query("SELECT COUNT(*) as count FROM questions");
        stats.totalQuestions = questions[0].count;

        // 3. Total Faculty
        const [faculty] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'Faculty'");
        stats.totalFaculty = faculty[0].count;

        // 4. Total Students
        const [students] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'Student'");
        stats.totalStudents = students[0].count;

        res.json({ success: true, stats });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, message: "Error fetching statistics" });
    }
};

exports.deleteExam = (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM exams WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Exam not found" });
        res.json({ success: true, message: "Exam deleted successfully" });
    });
};
