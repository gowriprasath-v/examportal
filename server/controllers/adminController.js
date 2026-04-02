const db = require("../db/db");
const bcrypt = require("bcrypt");

// --- USER MANAGEMENT ---

exports.getAllUsers = (req, res) => {
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Faculty'";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: result.rows });
    });
};

exports.getFaculty = (req, res) => {
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Faculty'";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: result.rows });
    });
};

exports.getStudents = (req, res) => {
    const sql = "SELECT id, name, email, role, created_at FROM users WHERE role = 'Student'";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, users: result.rows });
    });
};

exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const requestorRole = req.user.role;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (requestorRole === 'Student' && role !== 'Student') {
        return res.status(403).json({ success: false, message: "Forbidden: Students can only create Students" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Postgres: Use RETURNING id
        const sql = "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id";
        db.query(sql, [name, email, hashedPassword, role], (err, result) => {
            if (err) {
                if (err.code === '23505') return res.status(400).json({ success: false, message: "User or Email already exists" });
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, message: "User created successfully", userId: result.rows[0].id });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Hashing error" });
    }
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    const requestorRole = req.user.role;

    let sql = "DELETE FROM users WHERE id = $1 AND role != 'Admin'";
    if (requestorRole === 'Student') {
        sql = "DELETE FROM users WHERE id = $1 AND role = 'Student'";
    }

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "User not found or permission denied" });
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
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, exams: result.rows });
    });
};

exports.updateExamStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const sql = "UPDATE exams SET status = $1 WHERE id = $2";
    db.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, message: "Exam status updated" });
    });
};

exports.getStats = async (req, res) => {
    try {
        const stats = {};

        // In pg, db.query returns a promise if no callback is passed
        const examsRes = await db.query("SELECT COUNT(*) as count FROM exams");
        stats.totalExams = parseInt(examsRes.rows[0].count);

        const questionsRes = await db.query("SELECT COUNT(*) as count FROM questions");
        stats.totalQuestions = parseInt(questionsRes.rows[0].count);

        const facultyRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'Faculty'");
        stats.totalFaculty = parseInt(facultyRes.rows[0].count);

        const studentsRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'Student'");
        stats.totalStudents = parseInt(studentsRes.rows[0].count);

        res.json({ success: true, stats });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, message: "Error fetching statistics" });
    }
};

exports.deleteExam = (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM exams WHERE id = $1", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Exam not found" });
        res.json({ success: true, message: "Exam deleted successfully" });
    });
};
