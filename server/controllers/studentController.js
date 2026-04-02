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
        LEFT JOIN student_exam_status ses ON ses.exam_id = e.id AND ses.student_id = $1
        WHERE e.status = 'published' AND (ses.status IS NULL OR ses.status != 'COMPLETED')
        GROUP BY e.id
        ORDER BY e.scheduled_at ASC, e.id DESC
    `;

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("[Student] getPublishedExams error:", err.message);
            return res.status(500).json({ success: false, message: "Database error fetching exams" });
        }
        console.log(`[Student] Published exams found for student ${student_id}: ${result.rows.length}`);
        res.json({ success: true, exams: result.rows });
    });
};

exports.getExamById = (req, res) => {
    const { id } = req.params;
    console.log(`Student fetching exam details for ID: ${id}`);

    const sql = "SELECT * FROM exams WHERE id = $1";
    db.query(sql, [id], (err, examResult) => {
        if (err) {
            console.error("Database error fetching exam:", err);
            return res.status(500).json({ success: false, message: "Database error fetching exam details" });
        }
        if (examResult.rows.length === 0) return res.status(404).json({ success: false, message: "Exam not found" });

        const exam = examResult.rows[0];
        // Actual schema: question, option1, option2, option3, option4, correct_option
        const questionSql = "SELECT id, question, option1, option2, option3, option4, correct_option FROM questions WHERE exam_id = $1";

        db.query(questionSql, [id], (err, questionResult) => {
            if (err) {
                console.error("Database error fetching questions:", err);
                return res.status(500).json({ success: false, message: "Database error fetching questions" });
            }

            // Map separate option columns back to an array for the frontend
            const formattedQuestions = questionResult.rows.map(q => ({
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
        SELECT e.title as exam_title, r.score, r.total_questions as total_marks, (CAST(r.score AS FLOAT) / r.total_questions * 100) as percentage, r.created_at as date
        FROM results r
        JOIN exams e ON r.exam_id = e.id
        WHERE r.student_id = $1
        ORDER BY r.created_at DESC
    `;


    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Database error fetching results:", err);
            return res.status(500).json({ success: false, message: "Database error fetching results" });
        }
        res.json({ success: true, results: result.rows });
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
    const questionSql = "SELECT id, correct_option FROM questions WHERE exam_id = $1";
    db.query(questionSql, [examId], (err, result) => {
        if (err) {
            console.error("Database error fetching questions for scoring:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        const questions = result.rows;
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
        const insertSql = "INSERT INTO results (student_id, exam_id, score, total_questions) VALUES ($1, $2, $3, $4)";
        db.query(insertSql, [student_id, examId, score, total_questions], (insertErr) => {
            if (insertErr) {
                console.error("Database error saving result:", insertErr);
                return res.status(500).json({ success: false, message: "Error saving exam results" });
            }

            // 4. Update student_exam_status to COMPLETED
            const statusSql = `
                INSERT INTO student_exam_status (student_id, exam_id, status) 
                VALUES ($1, $2, 'COMPLETED')
                ON CONFLICT (student_id, exam_id) DO UPDATE SET status = 'COMPLETED'
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
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, exam_id) DO UPDATE SET status = $4
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
    // 1. Get upcoming exams (scheduled for current/future time)
    const sqlExams = `
        SELECT title, scheduled_at 
        FROM exams 
        WHERE status = 'published' 
        AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '1 day'
        AND id NOT IN (SELECT exam_id FROM results WHERE student_id = $1)
    `;
    db.query(sqlExams, [student_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Error" });
        
        const exams = result.rows;
        const alerts = [];
        exams.forEach(ex => {
            alerts.push({ type: 'upcoming', message: `Upcoming Exam: ${ex.title} scheduled for ${new Date(ex.scheduled_at).toLocaleTimeString()}` });
        });

        // 2. Get newest results (last 24h)
        const sqlResults = `SELECT COUNT(*) as count FROM results WHERE student_id = $1 AND created_at > NOW() - INTERVAL '1 day'`;
        db.query(sqlResults, [student_id], (err2, result2) => {
            if (!err2 && result2.rows[0].count > 0) {
                alerts.push({ type: 'result', message: `You have ${result2.rows[0].count} new exam result(s) today.` });
            }
            res.json({ success: true, alerts });
        });
    });
};
