const bcrypt = require("bcrypt");
const db = require("./db"); // Import our db connection

async function seedDB() {
    console.log("Starting DB Seeding...");

    // 1. Insert default users
    const defaultUsers = [
        { name: "admin", email: "admin@examguard.com", password: "adminpassword", role: "Admin" },
        { name: "faculty", email: "faculty@examguard.com", password: "facultypassword", role: "Faculty" },
        { name: "student", email: "student@examguard.com", password: "studentpassword", role: "Student" },
    ];

    let completed = 0;
    for (const user of defaultUsers) {
        try {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            // Check if user already exists
            db.query("SELECT * FROM users WHERE name = ?", [user.name], (selectErr, results) => {
                if (selectErr) {
                    console.error(`Error querying user ${user.name}:`, selectErr);
                    completed++;
                    checkDone(completed, defaultUsers.length);
                    return;
                }

                if (results.length > 0) {
                    console.log(`User ${user.name} already exists. Skipping.`);
                    completed++;
                    checkDone(completed, defaultUsers.length);
                    return;
                }

                // Insert new user
                db.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                    [user.name, user.email, hashedPassword, user.role],
                    (insertErr) => {
                        if (insertErr) {
                            console.error(`Error inserting user ${user.name}:`, insertErr);
                        } else {
                            console.log(`Inserted default user: ${user.name} (${user.role})`);
                        }
                        completed++;
                        checkDone(completed, defaultUsers.length);
                    }
                );
            });

        } catch (hashError) {
            console.error(`Error hashing password for ${user.name}:`, hashError);
            completed++;
            checkDone(completed, defaultUsers.length);
        }
    }
}

function checkDone(current, total) {
    if (current === total) {
        console.log("DB Seeding script finished.");
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

seedDB();
