const db = require("./db");

db.query("SET FOREIGN_KEY_CHECKS = 0;", () => {
    db.query("TRUNCATE TABLE exams;", (err) => {
        if (err) console.error("Error truncating exams:", err);
        else console.log("Exams table truncated successfully.");

        db.query("TRUNCATE TABLE questions;", () => {
            db.query("SET FOREIGN_KEY_CHECKS = 1;", () => process.exit(0));
        });
    });
});
