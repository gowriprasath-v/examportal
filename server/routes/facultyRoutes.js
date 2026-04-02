const express = require("express");
const router = express.Router();
const faculty = require("../controllers/facultyController");
const { verifyToken, verifyRole } = require("../middleware/authMiddleware");

// All faculty routes are protected
router.use(verifyToken);
router.use(verifyRole(['Faculty', 'Admin']));


router.post("/create-exam", faculty.createExam);
router.post("/add-questions", faculty.addQuestions);
router.post("/generate-ai-questions", faculty.generateAIQuestions);
router.get("/my-exams", faculty.getMyExams);
router.get("/exam/:id", faculty.getExamById);
router.patch("/exam/:id/status", faculty.updateExamStatus);
router.get("/exam/:id/questions", faculty.getExamQuestions);
router.get("/exam/:id/stats", faculty.getExamStats);
router.post("/exam/:id/duplicate", faculty.duplicateExam);
router.get("/notifications", faculty.getFacultyNotifications);
router.delete("/question/:question_id", faculty.deleteQuestion);

router.get("/exam/:exam_id/results", faculty.getExamResults);


module.exports = router;
