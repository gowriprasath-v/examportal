const db = require("../db/db");
const { logEvent } = require("../utils/auditLogger");


exports.getPublishedExams = (req, res) => {
    const student_id = req.user.id;
    // Return published exams with a count of their questions,
    // only if the student hasn't completed them yet.
    const sql = `
        SELECT e.id, e.title, e.description, e.duration, e.status, e.scheduled_at, e.instructions,
               COUNT(q.id) AS question_count
        FROM exams e
        LEFT JOIN questions q ON q.exam_id = e.id
        LEFT JOIN student_exam_status ses ON ses.exam_id = e.id AND ses.student_id = ?
        WHERE e.status = 'published' AND (ses.status IS NULL OR ses.status != 'COMPLETED')
        GROUP BY e.id
        ORDER BY e.scheduled_at ASC, e.id DESC
    `;

    db.query(sql, [student_id], (err, results) => {
        if (err) {
            console.error("[Student] getPublishedExams error:", err.message);
            return res.status(500).json({ success: false, message: "Database error fetching exams" });
        }
        console.log(`[Student] Published exams found for student ${student_id}: ${results.length}`);
        res.json({ success: true, exams: results });
    });
};

exports.getExamById = (req, res) => {
    const { id } = req.params;
    console.log(`Student fetching exam details for ID: ${id}`);

    const sql = "SELECT * FROM exams WHERE id = ?";
    db.query(sql, [id], (err, examResults) => {
        if (err) {
            console.error("Database error fetching exam:", err);
            return res.status(500).json({ success: false, message: "Database error fetching exam details" });
        }
        if (examResults.length === 0) return res.status(404).json({ success: false, message: "Exam not found" });

        const exam = examResults[0];
        // Actual schema: question, option1, option2, option3, option4, correct_option
        const questionSql = "SELECT id, question, option1, option2, option3, option4, correct_option FROM questions WHERE exam_id = ?";

        db.query(questionSql, [id], (err, questionResults) => {
            if (err) {
                console.error("Database error fetching questions:", err);
                return res.status(500).json({ success: false, message: "Database error fetching questions" });
            }

            // Map separate option columns back to an array for the frontend
            const formattedQuestions = questionResults.map(q => ({
                id: q.id,
                question: q.question,
                options: [q.option1, q.option2, q.option3, q.option4].filter(opt => opt !== null),
                correct_answer: q.correct_option // Keep as correct_answer if frontend expects it, or use correct_option
            }));

            exam.questions = formattedQuestions;
            res.json({ success: true, exam });
        });
    });
};

exports.getMyResults = (req, res) => {
    const student_id = req.user.id;
    console.log(`Fetching results for student ID: ${student_id}`);

    const sql = `
        SELECT e.title as exam_title, r.score, r.total_questions as total_marks, (r.score / r.total_questions * 100) as percentage, r.created_at as date
        FROM results r
        JOIN exams e ON r.exam_id = e.id
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
    `;


    db.query(sql, [student_id], (err, results) => {
        if (err) {
            console.error("Database error fetching results:", err);
            return res.status(500).json({ success: false, message: "Database error fetching results" });
        }
        res.json({ success: true, results });
    });
};

exports.submitExam = (req, res) => {
    const student_id = req.user.id;
    const { examId, answers } = req.body;
    // answers is expected to be an object: { [question_id]: selected_option_index }

    if (!examId || !answers) {
        return res.status(400).json({ success: false, message: "Missing examId or answers payload" });
    }

    // 1. Fetch correct answers for this exam
    const questionSql = "SELECT id, correct_option FROM questions WHERE exam_id = ?";
    db.query(questionSql, [examId], (err, questions) => {
        if (err) {
            console.error("Database error fetching questions for scoring:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        let score = 0;
        const total_questions = questions.length;

        // 2. Compare answers
        questions.forEach(q => {
            const studentAnswer = answers[q.id];
            if (studentAnswer && parseInt(studentAnswer) === parseInt(q.correct_option)) {
                score++;
            }
        });

        // 3. Save to results table
        // Notice: The results table schema uses `total_questions` not `total`
        const insertSql = "INSERT INTO results (student_id, exam_id, score, total_questions) VALUES (?, ?, ?, ?)";
        db.query(insertSql, [student_id, examId, score, total_questions], (insertErr) => {
            if (insertErr) {
                console.error("Database error saving result:", insertErr);
                return res.status(500).json({ success: false, message: "Error saving exam results" });
            }

            // 4. Update student_exam_status to COMPLETED
            const statusSql = `
                INSERT INTO student_exam_status (student_id, exam_id, status) 
                VALUES (?, ?, 'COMPLETED')
                ON DUPLICATE KEY UPDATE status = 'COMPLETED'
            `;
            db.query(statusSql, [student_id, examId], (statusErr) => {
                if (statusErr) {
                    console.error("Error updating exam status:", statusErr);
                    // Don't fail the submission if status update fails, just log it
                }
                logEvent(req.user.username, req.user.role, req.ip, "Exam Submitted", `Exam ID: ${examId}, Score: ${score}/${total_questions}`);
                res.json({ success: true, score, total_marks: total_questions, total_questions });
            });

        });
    });
};
exports.updateExamStatus = (req, res) => {
    const student_id = req.user.id;
    const { examId, status } = req.body;

    if (!examId || !status) {
        return res.status(400).json({ success: false, message: "Missing examId or status" });
    }

    const sql = `
        INSERT INTO student_exam_status (student_id, exam_id, status) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE status = ?
    `;
    db.query(sql, [student_id, examId, status, status], (err) => {
        if (err) {
            console.error("Error updating exam status:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Exam status updated" });
    });
};

exports.getStudentNotifications = (req, res) => {
    const student_id = req.user.id;
    // 1. Get upcoming exams (scheduled in the next 24h)
    const sqlExams = `
        SELECT title, scheduled_at 
        FROM exams 
        WHERE status = 'published' 
        AND scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)
        AND id NOT IN (SELECT exam_id FROM results WHERE student_id = ?)
    `;
    db.query(sqlExams, [student_id], (err, exams) => {
        if (err) return res.status(500).json({ success: false, message: "Error" });
        
        const alerts = [];
        exams.forEach(ex => {
            alerts.push({ type: 'upcoming', message: `Upcoming Exam: ${ex.title} scheduled for ${new Date(ex.scheduled_at).toLocaleTimeString()}` });
        });

        // 2. Get newest results (last 24h)
        const sqlResults = `SELECT COUNT(*) as count FROM results WHERE student_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`;
        db.query(sqlResults, [student_id], (err2, resCount) => {
            if (!err2 && resCount[0].count > 0) {
                alerts.push({ type: 'result', message: `You have ${resCount[0].count} new exam result(s) today.` });
            }
            res.json({ success: true, alerts });
        });
    });
};

