const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

router.post("/login", auth.login);
router.post("/register", auth.register);
router.get("/users", auth.getUsers);
router.get("/audit-logs", auth.getAuditLogs);
router.delete("/clear-audit-logs", auth.clearAuditLogs);

module.exports = router;
