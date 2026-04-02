const db = require("../db/db");
const { logEvent } = require("../utils/auditLogger");


// --- EXAM CREATION ---

exports.createExam = (req, res) => {
    const { title, subject, description, duration, scheduled_at, instructions } = req.body;
    const faculty_id = req.user.id;
 
    console.log(`[Faculty] createExam called by user ID: ${faculty_id}, title: ${title}, subject: ${subject}`);
 
    if (!title || !duration) {
        return res.status(400).json({ success: false, message: "Title and duration are required" });
    }
 
    // Save as 'draft' initially; faculty must publish later
    const sql = "INSERT INTO exams (title, subject, description, duration, scheduled_at, instructions, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')";
    db.query(sql, [title, subject || null, description, duration, scheduled_at || null, instructions || null, faculty_id], (err, result) => {

        if (err) {
            console.error("[Faculty] createExam DB error:", err);
            return res.status(500).json({ success: false, message: "Database error creating exam" });
        }
        console.log(`[Faculty] Exam created with ID: ${result.insertId}`);
        logEvent(req.user.username, req.user.role, req.ip, "Exam Created", `Exam ID: ${result.insertId}, Title: ${title}`);
        res.json({ success: true, message: "Exam created as draft", examId: result.insertId });
    });

};

// --- GET SINGLE EXAM BY ID ---

exports.getExamById = (req, res) => {
    const { id } = req.params;
    const faculty_id = req.user.id;
    console.log(`[Faculty] getExamById: id=${id}, faculty=${faculty_id}`);

    const sql = "SELECT * FROM exams WHERE id = ? AND created_by = ?";
    db.query(sql, [id, faculty_id], (err, results) => {
        if (err) {
            console.error("[Faculty] getExamById DB error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (results.length === 0) return res.status(404).json({ success: false, message: "Exam not found" });
        res.json({ success: true, exam: results[0] });
    });
};

// --- PUBLISH / UPDATE STATUS ---

exports.updateExamStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const faculty_id = req.user.id;

    console.log(`[Faculty] updateExamStatus: examId=${id}, newStatus=${status}, faculty=${faculty_id}`);

    const allowed = ['draft', 'published', 'disabled'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const sql = "UPDATE exams SET status = ? WHERE id = ? AND created_by = ?";
    db.query(sql, [status, id, faculty_id], (err, result) => {
        if (err) {
            console.error("[Faculty] updateExamStatus DB error:", err);
            return res.status(500).json({ success: false, message: "Database error updating status" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Exam not found or permission denied" });
        }
        console.log(`[Faculty] Exam ${id} status updated to '${status}'`);
        res.json({ success: true, message: `Exam status updated to ${status}` });
    });
};

exports.addQuestions = (req, res) => {
    const { exam_id, questions } = req.body;

    if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "exam_id and a non-empty questions array are required" });
    }

    console.log(`[Faculty] addQuestions: exam_id=${exam_id}, count=${questions.length}`);

    // Real schema: question, option1, option2, option3, option4, correct_option (1-4)
    const sql = "INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)";

    let completed = 0;
    let errors = [];

    questions.forEach((q, i) => {
        const correctVal = parseInt(q.correct_option) || 1;
        db.query(sql, [exam_id, q.question, q.option1, q.option2, q.option3, q.option4, correctVal], (err) => {
            if (err) {
                console.error(`[Faculty] Error inserting question ${i + 1}:`, err.message);
                errors.push(err.message);
            }
            completed++;
            if (completed === questions.length) {
                if (errors.length > 0) {
                    return res.status(500).json({ success: false, message: `${errors.length} question(s) failed to save`, errors });
                }
                console.log(`[Faculty] All ${questions.length} questions saved for exam ${exam_id}`);
                res.json({ success: true, message: `${questions.length} question(s) added successfully` });
            }
        });
    });
};

// --- GET QUESTIONS FOR AN EXAM ---

exports.getExamQuestions = (req, res) => {
    const { id } = req.params;
    const faculty_id = req.user.id;
    console.log(`[Faculty] getExamQuestions: exam_id=${id}, faculty=${faculty_id}`);

    // Verify exam belongs to this faculty first
    db.query("SELECT id FROM exams WHERE id = ? AND created_by = ?", [id, faculty_id], (err, exams) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (exams.length === 0) return res.status(403).json({ success: false, message: "Exam not found or permission denied" });

        db.query("SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC", [id], (err2, results) => {
            if (err2) {
                console.error("[Faculty] getExamQuestions DB error:", err2.message);
                return res.status(500).json({ success: false, message: "Error fetching questions" });
            }
            console.log(`[Faculty] Found ${results.length} questions for exam ${id}`);
            res.json({ success: true, questions: results });
        });
    });
};

// --- DELETE A QUESTION ---

exports.deleteQuestion = (req, res) => {
    const { question_id } = req.params;
    const faculty_id = req.user.id;
    console.log(`[Faculty] deleteQuestion: id=${question_id}, faculty=${faculty_id}`);

    // Only allow delete if exam belongs to faculty
    const sql = `
        DELETE q FROM questions q
        JOIN exams e ON q.exam_id = e.id
        WHERE q.id = ? AND e.created_by = ?
    `;
    db.query(sql, [question_id, faculty_id], (err, result) => {
        if (err) {
            console.error("[Faculty] deleteQuestion error:", err.message);
            return res.status(500).json({ success: false, message: "Error deleting question" });
        }
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Question not found or permission denied" });
        res.json({ success: true, message: "Question deleted" });
    });
};

// --- REPORTS ---

exports.getMyExams = (req, res) => {
    const faculty_id = req.user.id;
    console.log(`[Faculty] getMyExams for faculty ID: ${faculty_id}`);

    // NOTE: exams table columns: id, title, description, duration, created_by, status
    // There is NO created_at column — do NOT use ORDER BY created_at
    const sql = "SELECT * FROM exams WHERE created_by = ? ORDER BY id DESC";
    db.query(sql, [faculty_id], (err, results) => {
        if (err) {
            console.error("[Faculty] getMyExams DB error:", err.message);
            return res.status(500).json({ success: false, message: "Database error fetching exams" });
        }
        console.log(`[Faculty] Found ${results.length} exams for faculty ${faculty_id}`);
        res.json({ success: true, exams: results }); // returns [] when no exams exist
    });
};

exports.getExamResults = (req, res) => {
    const { exam_id } = req.params;
    const sql = `
    SELECT r.student_id, u.name as student_name, r.score, r.total_questions as total_marks, (r.score / r.total_questions * 100) as percentage, r.created_at as date
    FROM results r 
    JOIN users u ON r.student_id = u.id 
    WHERE r.exam_id = ?
  `;
    db.query(sql, [exam_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, results });
    });
};

exports.getDetailedResults = (req, res) => {
    const { result_id } = req.params;
    const sql = `
        SELECT r.*, u.name as student_name, e.title as exam_title
        FROM results r
        JOIN users u ON r.student_id = u.id
        JOIN exams e ON r.exam_id = e.id
        WHERE r.id = ?
    `;
    db.query(sql, [result_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (results.length === 0) return res.status(404).json({ success: false, message: "Result not found" });
        res.json({ success: true, result: results[0] });
    });
};

exports.getExamStats = (req, res) => {
    const { exam_id } = req.params;
    const sql = `
        SELECT 
            COUNT(*) as total_submissions,
            AVG(score) as avg_score,
            (SUM(CASE WHEN score >= (total_questions * 0.5) THEN 1 ELSE 0 END) / COUNT(*)) * 100 as pass_rate
        FROM results 
        WHERE exam_id = ?
    `;
    db.query(sql, [exam_id], (err, results) => {
        if (err) {
            console.error("Stats Error:", err);
            return res.status(500).json({ success: false, message: "Error fetching stats" });
        }
        res.json({ success: true, stats: results[0] });
    });
};

exports.duplicateExam = (req, res) => {
    const { id } = req.params;
    const faculty_id = req.user.id;

    // 1. Get original exam
    db.query("SELECT * FROM exams WHERE id = ? AND created_by = ?", [id, faculty_id], (err, exams) => {
        if (err || exams.length === 0) return res.status(404).json({ success: false, message: "Exam not found" });

        const oldExam = exams[0];
        const newTitle = `Copy of ${oldExam.title}`;
 
        // 2. Create new exam draft
        const insertExSql = "INSERT INTO exams (title, subject, description, duration, scheduled_at, instructions, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')";
        db.query(insertExSql, [newTitle, oldExam.subject, oldExam.description, oldExam.duration, oldExam.scheduled_at, oldExam.instructions, faculty_id], (err2, result) => {

            if (err2) return res.status(500).json({ success: false, message: "Error duplicating exam header" });

            const newExamId = result.insertId;

            // 3. Duplicate questions
            const qSql = "INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_option) SELECT ?, question, option1, option2, option3, option4, correct_option FROM questions WHERE exam_id = ?";
            db.query(qSql, [newExamId, id], (err3) => {
                if (err3) console.error("Error duplicating questions:", err3);
                logEvent(req.user.username, req.user.role, req.ip, "Exam Duplicated", `Old ID: ${id}, New ID: ${newExamId}`);
                res.json({ success: true, message: "Exam duplicated successfully as draft", newId: newExamId });
            });
        });
    });
};

exports.getFacultyNotifications = (req, res) => {
    const faculty_id = req.user.id;
    // Mocking some notifications logic based on pending reviews or new results
    const sql = `
        SELECT COUNT(*) as count 
        FROM results r 
        JOIN exams e ON r.exam_id = e.id 
        WHERE e.created_by = ? AND r.timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY)
    `;
    db.query(sql, [faculty_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Error" });
        const alerts = [];
        if (results[0].count > 0) {
            alerts.push({ type: 'info', message: `${results[0].count} new results in the last 24h` });
        }
        res.json({ success: true, count: alerts.length, alerts });
    });
};


// --- AI QUESTION GENERATION (Simulated) ---
exports.generateAIQuestions = (req, res) => {
    const { topic } = req.body;
    console.log(`AI question generation requested for topic: ${topic}`);

    const questions = [
        {
            question: "Which layer of the OSI model is responsible for routing?",
            option1: "Network Layer",
            option2: "Data Link Layer",
            option3: "Transport Layer",
            option4: "Physical Layer",
            correct_option: 1
        },
        {
            question: "What does IP stand for?",
            option1: "Internet Protocol",
            option2: "Internal Process",
            option3: "Interface Program",
            option4: "Internet Process",
            correct_option: 1
        },
        {
            question: "Which device is used to connect different networks?",
            option1: "Router",
            option2: "Switch",
            option3: "Hub",
            option4: "Bridge",
            correct_option: 1
        },
        {
            question: "Which protocol is used to transfer web pages?",
            option1: "HTTP",
            option2: "FTP",
            option3: "SMTP",
            option4: "TCP",
            correct_option: 1
        },
        {
            question: "Which topology connects all devices to a central node?",
            option1: "Star Topology",
            option2: "Ring Topology",
            option3: "Bus Topology",
            option4: "Mesh Topology",
            correct_option: 1
        },
        {
            question: "What is the main function of a switch?",
            option1: "Forward data based on MAC address",
            option2: "Assign IP addresses",
            option3: "Convert signals",
            option4: "Provide internet access",
            correct_option: 1
        },
        {
            question: "Which layer ensures reliable data delivery?",
            option1: "Transport Layer",
            option2: "Network Layer",
            option3: "Session Layer",
            option4: "Physical Layer",
            correct_option: 1
        },
        {
            question: "Which protocol is used for sending emails?",
            option1: "SMTP",
            option2: "HTTP",
            option3: "FTP",
            option4: "DNS",
            correct_option: 1
        },
        {
            question: "What does DNS do?",
            option1: "Translates domain names to IP addresses",
            option2: "Sends emails",
            option3: "Transfers files",
            option4: "Encrypts data",
            correct_option: 1
        },
        {
            question: "Which transmission media uses light signals?",
            option1: "Optical Fiber",
            option2: "Twisted Pair",
            option3: "Coaxial Cable",
            option4: "Radio Waves",
            correct_option: 1
        }
    ];

    res.json({
        success: true,
        message: `Generated ${questions.length} questions for ${topic}.`,
        questions: questions
    });
};
