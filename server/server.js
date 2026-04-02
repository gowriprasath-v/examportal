const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");
require("./db/db"); // Ensures DB connection is made

const app = express();

app.use(cors());
app.use(express.json());

const clientPath = path.resolve(__dirname, "../client");

// Serve static files from the "client" directory
app.use(express.static(clientPath));

// Routes
app.use("/api/auth", authRoutes); // Login/Users
app.use("/api/admin", adminRoutes); // User management, Exam monitoring
app.use("/api/faculty", facultyRoutes); // Exam creation, Reports
app.use("/api/student", studentRoutes); // Student specific routes

// Catch-all: If no static file or API route matches, serve index.html
app.use((req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            if (!res.headersSent) {
                res.status(500).send("Internal Server Error: Could not load frontend.");
            }
        }
    });
});

/* ========================
   START SERVER
======================== */
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} at http://localhost:${PORT}`);
    });
}

module.exports = app;
