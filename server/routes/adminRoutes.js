const express = require("express");
const router = express.Router();
const admin = require("../controllers/adminController");
const { verifyToken, verifyRole } = require("../middleware/authMiddleware");

// All admin routes are protected
router.use(verifyToken);
router.use(verifyRole(['Admin']));

// MONITORING & STATS
router.get("/stats", verifyRole(['Admin']), admin.getStats);
router.get("/users", verifyRole(['Admin']), admin.getAllUsers);
router.get("/faculty", verifyRole(['Admin']), admin.getFaculty);
router.get("/students", verifyRole(['Admin']), admin.getStudents);

// USER MANAGEMENT (create & delete)
router.post("/users", verifyRole(['Admin']), admin.createUser);
router.delete("/users/:id", verifyRole(['Admin']), admin.deleteUser);

// EXAM MANAGEMENT
router.get("/exams", verifyRole(['Admin']), admin.getAllExams);
router.patch("/exams/:id", verifyRole(['Admin']), admin.updateExamStatus);
router.delete("/exams/:id", verifyRole(['Admin']), admin.deleteExam);

module.exports = router;
