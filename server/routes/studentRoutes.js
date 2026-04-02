const express = require("express");
const router = express.Router();
const student = require("../controllers/studentController");
const { verifyToken } = require("../middleware/authMiddleware");

// Student routes
router.use(verifyToken);
const { verifyRole } = require("../middleware/authMiddleware");
router.use(verifyRole(['Student']));


router.get("/exams", student.getPublishedExams);
router.get("/exam/:id", student.getExamById);
router.get("/my-results", student.getMyResults);
router.get("/notifications", student.getStudentNotifications);
router.post("/submit", student.submitExam);

router.post("/update-status", student.updateExamStatus);

module.exports = router;
