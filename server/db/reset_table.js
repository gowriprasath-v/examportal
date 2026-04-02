const db = require("./db");
const bcrypt = require("bcrypt");

const query = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});

async function run() {
    try {
        console.log("Disabling foreign key checks...");
        await query("SET FOREIGN_KEY_CHECKS = 0");

        console.log("Dropping users table...");
        await query("DROP TABLE IF EXISTS users");

        console.log("Creating users table with VARCHAR(255) and email...");
        await query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('Admin', 'Faculty', 'Student') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

        console.log("Enabling foreign key checks...");
        await query("SET FOREIGN_KEY_CHECKS = 1");

        const defaultUsers = [
            { name: "admin", email: "admin@example.com", password: "adminpassword", role: "Admin" },
            { name: "faculty", email: "faculty@example.com", password: "facultypassword", role: "Faculty" },
            { name: "student", email: "student@example.com", password: "studentpassword", role: "Student" },
        ];

        for (const user of defaultUsers) {
            const hashed = await bcrypt.hash(user.password, 10);
            await query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [user.name, user.email, hashed, user.role]);
            console.log(`Inserted ${user.name}`);
        }

        console.log("Verifying DB...");
        const rows = await query("SELECT * FROM users WHERE role = 'Admin'");
        console.log("Found Admins:", rows.length);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
