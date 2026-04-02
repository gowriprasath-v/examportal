/**
 * CLEAN VANILLA JAVASCRIPT FOR EXAM GUARD PORTAL
 * Handles: Login simulation, Navigation, Logout, and Auth Guard
 */

// 1. AUTH GUARD: Run on every page to check if user is logged in
(function checkAuth() {
    const currentPage = window.location.pathname.split("/").pop();
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userRole = localStorage.getItem("role");

    // Don't check on login/auth page or role selection page
    const publicPages = ["index.html", "auth.html", "login.html", "register.html", ""];

    if (!isLoggedIn && !publicPages.includes(currentPage)) {
        window.location.href = "index.html";
    }
})();

// 2. NAVIGATION & BUTTON HANDLERS
document.addEventListener("DOMContentLoaded", () => {
    console.log("Exam Guard Script Active");

    // SIDEBAR NAVIGATION
    const sidebarLinks = document.querySelectorAll(".sidebar a, .sidebar-menu a, .sidebar-link");
    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const linkText = link.innerText.toLowerCase().trim();
            const sectionId = link.getAttribute("data-section");
            const userRole = localStorage.getItem("role") || "admin";

            // If it's an internal SPA link (Admin Dashboard context)
            if (sectionId) {
                e.preventDefault();
                showSection(sectionId);
                return;
            }

            if (linkText === "dashboard") {
                if (userRole === "admin") window.location.href = "admin-dashboard.html";
                else if (userRole === "faculty") window.location.href = "faculty-dashboard.html";
                else window.location.href = "student-dashboard.html";
            }
            if (linkText === "create exam") window.location.href = "create-exam.html";
            if (linkText === "profile") window.location.href = "profile.html";
            if (linkText === "logout") logoutUser();
        });
    });

    // Helper for Admin SPA navigation
    function showSection(sectionId) {
        document.querySelectorAll(".content-section").forEach(sec => sec.style.display = "none");
        document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"));

        const target = document.getElementById(sectionId);
        if (target) target.style.display = "block";

        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) activeLink.classList.add("active");

        // Load specific data per section
        if (sectionId === "dashboardSection") loadAdminStats();
        if (sectionId === "examSection") loadExamsForAdmin();
        if (sectionId === "userSection") loadUsersForAdmin();
    }

    // INITIAL LOAD
    if (window.location.pathname.includes("login.html")) {
        // No longer pre-filling or locking roles
    }

    if (window.location.pathname.includes("admin-dashboard.html")) {
        loadAdminStats();
        loadExamsForAdmin();
        loadUsersForAdmin();
    }
    if (window.location.pathname.includes("faculty-dashboard.html")) {
        loadFacultyExams();
    }
    if (window.location.pathname.includes("student-dashboard.html")) {
        // loadExams() is already inside student-dashboard.html
    }

    // LOGOUT FUNCTIONALITY
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = logoutUser;
    }

    // CREATE EXAM BUTTON
    const createBtn = document.querySelector(".create-btn");
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            window.location.href = "create-exam.html";
        });
    }

    // VIEW DETAILS BUTTONS
    const viewButtons = document.querySelectorAll(".exam-card button");
    viewButtons.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            // Simulate navigation to specific exam
            window.location.href = `exam-details.html?id=${index + 1}`;
        });
    });

    // WELCOME MESSAGE
    const welcomeMsg = document.getElementById("welcomeUsername");
    if (welcomeMsg) {
        const username = localStorage.getItem("username") || "Admin";
        welcomeMsg.innerText = `Welcome back, ${username}`;
    }

    // --- STUDENT MANAGEMENT (STUDENT DASHBOARD ONLY) ---
    const studentTableBody = document.getElementById("studentTableBody");
    if (studentTableBody) {
        loadStudents();
    }

    const addStudentForm = document.getElementById("addStudentForm");
    if (addStudentForm) {
        addStudentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            // Reuse createUser but targeting Student Dashboard list
            createUser("Student", "stuName", "stuEmail", "stuPass", "studentTableBody");
        });
    }
});

async function loadStudents() {
    const tableBody = document.getElementById("studentTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch("/api/admin/students", {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();

        if (data.success) {
            tableBody.innerHTML = data.users.map(user => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${user.name}</td>
                    <td style="padding: 1rem;">${user.email}</td>
                    <td style="padding: 1rem;">
                        <button onclick="deleteStudent(${user.id})" style="color: #ef4444; background: none; border: none; cursor: pointer; font-weight: 600;">Remove</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading students:", err);
    }
}

// Wrapper for deleting student from student dashboard
async function deleteStudent(id) {
    if (!confirm("Are you sure you want to remove this student?")) return;

    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();

        if (data.success) {
            alert("Student removed!");
            loadStudents();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (err) {
        console.error("Error deleting student:", err);
    }
}


async function loadUsers() {
    const tableBody = document.getElementById("userTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch("/api/admin/users", {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();

        if (data.success) {
            tableBody.innerHTML = data.users.map(user => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${user.name}</td>
                    <td style="padding: 1rem;">${user.email}</td>
                    <td style="padding: 1rem;"><span style="background: #e2e8f0; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem;">${user.role}</span></td>
                    <td style="padding: 1rem;">
                        <button onclick="deleteUser(${user.id})" style="color: #ef4444; background: none; border: none; cursor: pointer; font-weight: 600;">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading users:", err);
    }
}

// --- ADMIN DASHBOARD LOGIC (READ-ONLY) ---

async function loadAdminStats() {
    try {
        const response = await fetch("/api/admin/stats", {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById("totalExams").innerText = data.stats.totalExams;
            document.getElementById("totalQuestions").innerText = data.stats.totalQuestions;
            document.getElementById("totalFaculty").innerText = data.stats.totalFaculty;
            document.getElementById("totalStudents").innerText = data.stats.totalStudents;
        }
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadUsersForAdmin() {
    const facultyTable = document.getElementById("facultyTableBody");
    const studentTable = document.getElementById("studentTableBody");
    if (!facultyTable || !studentTable) return;

    try {
        const token = localStorage.getItem("token");
        // Load Faculty
        const facRes = await fetch("/api/admin/faculty", { headers: { 'Authorization': `Bearer ${token}` } });
        const facData = await facRes.json();
        if (facData.success) {
            facultyTable.innerHTML = facData.users.map(u => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${u.name}</td>
                    <td style="padding: 1rem;">${u.email}</td>
                    <td style="padding: 1rem;"><span style="color: #10b981;">● Active</span></td>
                </tr>
            `).join('');
        }

        // Load Students
        const stuRes = await fetch("/api/admin/students", { headers: { 'Authorization': `Bearer ${token}` } });
        const stuData = await stuRes.json();
        if (stuData.success) {
            studentTable.innerHTML = stuData.users.map(u => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${u.name}</td>
                    <td style="padding: 1rem;">${u.email}</td>
                    <td style="padding: 1rem;">${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading users for admin:", err);
    }
}

async function loadFacultyExams() {
    const examContainer = document.getElementById("facultyExamContainer");
    if (!examContainer) return;

    examContainer.innerHTML = "<p>Loading exams...</p>";

    try {
        const response = await fetch("/api/faculty/my-exams", {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();
        console.log("Faculty exams data:", data);

        // Always update the total count
        const totalExamsCount = document.getElementById("facultyTotalExams");
        if (totalExamsCount) totalExamsCount.innerText = data.success ? data.exams.length : 0;

        if (!data.success) {
            examContainer.innerHTML = `<p style="color: red;">Error: ${data.message}</p>`;
            return;
        }

        if (data.exams.length === 0) {
            examContainer.innerHTML = "<p>No examinations available.</p>";
            return;
        }

        examContainer.innerHTML = data.exams.map(exam => {
            const statusColor = exam.status === 'published' ? '#10b981' : exam.status === 'disabled' ? '#ef4444' : '#f59e0b';
            return `
                <div class="exam-card">
                    <h3>${exam.title}</h3>
                    <p>${exam.description || "No description"}</p>
                    <div class="exam-footer">
                        <span>${exam.duration} mins • Status: <b style="color: ${statusColor};">${exam.status}</b></span>
                        <button onclick="window.location.href='exam-details.html?id=${exam.id}'">View Details</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error loading faculty exams:", err);
        examContainer.innerHTML = "<p style='color: red;'>Failed to load exams. Please refresh the page.</p>";
    }
}


async function createUser(role, nameId, emailId, passId, refreshTable) {
    const name = document.getElementById(nameId).value;
    const email = document.getElementById(emailId).value;
    const password = document.getElementById(passId).value;

    try {
        const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await response.json();

        if (data.success) {
            alert(`${role} added successfully!`);
            if (refreshTable === "studentTableBody") {
                loadStudents();
            } else {
                // This would be for Admin, but Admin won't have this form anymore
                if (typeof loadUsers === "function") loadUsers();
            }
            // Clear inputs
            document.getElementById(nameId).value = "";
            document.getElementById(emailId).value = "";
            document.getElementById(passId).value = "";
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (err) {
        console.error("Error creating user:", err);
    }
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();

        if (data.success) {
            alert("User deleted!");
            loadUsers();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (err) {
        console.error("Error deleting user:", err);
    }
}


// 3. LOGOUT FUNCTION
function logoutUser() {
    console.log("Logging out...");

    // Clear Session
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("token");

    // Clear history to prevent going back
    window.location.replace("index.html");

    // Safety redirect
    setTimeout(() => {
        window.location.href = "index.html";
    }, 100);
}

// 4. UNIFIED AUTHENTICATION HANDLERS
async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    const captcha = document.getElementById("loginCaptcha").value;
    const errorMsg = document.getElementById('errorMessage');

    errorMsg.style.display = 'none';

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, captcha })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("role", data.user.role);
            localStorage.setItem("token", data.token);

            const userRole = data.user.role.toLowerCase();
            if (userRole === "admin") window.location.href = "admin-dashboard.html";
            else if (userRole === "faculty") window.location.href = "faculty-dashboard.html";
            else window.location.href = "student-dashboard.html";
        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error("Login error:", err);
        errorMsg.innerText = "Connection to server failed.";
        errorMsg.style.display = 'block';
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const phone = document.getElementById("regPhone").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;
    const captcha = document.getElementById("regCaptcha").value;
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');

    if (password !== confirmPassword) {
        if (errorMsg) {
            errorMsg.innerText = "Passwords do not match.";
            errorMsg.style.display = 'block';
        }
        return;
    }


    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, phone, password, captcha })
        });
        const data = await response.json();

        if (data.success) {
            if (successMsg) {
                successMsg.innerText = data.message;
                successMsg.style.display = 'block';
            }
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            if (errorMsg) {
                errorMsg.innerText = data.message;
                errorMsg.style.display = 'block';
            }
        }
    } catch (err) {
        console.error("Registration error:", err);
        if (errorMsg) {
            errorMsg.innerText = "Connection to server failed.";
            errorMsg.style.display = 'block';
        }
    }
}

// Keep legacy listener for back-compat if any page still uses the old ID
const legacyLoginForm = document.getElementById("loginForm");
if (legacyLoginForm && !legacyLoginForm.getAttribute('onsubmit')) {
    legacyLoginForm.addEventListener("submit", handleLoginSubmit);
}
