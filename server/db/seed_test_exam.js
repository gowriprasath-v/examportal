const db = require("./db");

const insertExam = "INSERT INTO exams (title, description, duration, status, created_by) VALUES (?, ?, ?, ?, ?)";
db.query(insertExam, ['Student Test Exam', 'Directly seeded exam for student testing.', 15, 'published', 1], (err, result) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    const examId = result.insertId;
    const insertQ = "INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_option) VALUES ?";
    const questions = [
        [examId, 'What is 2+2?', '3', '4', '5', '6', 2],
        [examId, 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 3]
    ];

    db.query(insertQ, [questions], (err2) => {
        if (err2) {
            console.error(err2);
            process.exit(1);
        }
        console.log("Successfully seeded test exam for student with ID:", examId);
        process.exit(0);
    });
});
