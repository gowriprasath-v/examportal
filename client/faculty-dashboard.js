// Faculty Dashboard Logic

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Protect Route
    if (!token || !role || role.toLowerCase() !== "faculty") {
        alert("Unauthorized access. Please login as Faculty.");
        window.location.href = "index.html";
        return;
    }

    // Set Welcome info
    const username = localStorage.getItem("username") || "Faculty";
    const welcomeEl = document.getElementById("welcomeUsername");
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome back, ${escapeHTML(username)}`;
    }
    const nameEl = document.querySelector(".sidebar .name");
    if (nameEl) {
        nameEl.textContent = escapeHTML(username);
    }

    // Logout setup
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    // Determine current page and initialize functionality
    const path = window.location.pathname;
    if (path.includes("faculty-dashboard.html") || path === "/" || path.endsWith("/client/")) {
        initDashboard();
    } else if (path.includes("create-exam.html")) {
        initCreateExam();
    }

    highlightActiveLink();
});

function highlightActiveLink() {
    let currentPath = window.location.pathname.split("/").pop();
    if (!currentPath || currentPath === "") currentPath = "faculty-dashboard.html";
    
    document.querySelectorAll(".sidebar a").forEach(link => {
        const linkPath = link.getAttribute("href");
        if (linkPath === currentPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}



// Helper: Secure text
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// ==========================================
// Main Dashboard Functionality
// ==========================================
let allExams = [];
let filteredExams = [];
let currentPage = 1;
const pageSize = 5;

async function initDashboard() {
    console.log("Initializing Faculty Dashboard...");
    await loadFacultyExams();
    loadNotifications();

    // Filters Init
    const filterIds = ["examSearch", "statusFilter", "subjectFilter"];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", () => {
                applyFilters();
            });
        }
    });
}

function applyFilters() {
    const titleQuery = (document.getElementById("examSearch")?.value || "").toLowerCase().trim();
    const statusQuery = document.getElementById("statusFilter")?.value || "";
    const subjectQuery = (document.getElementById("subjectFilter")?.value || "").toLowerCase().trim();

    filteredExams = allExams.filter(exam => {
        const matchTitle = exam.title.toLowerCase().includes(titleQuery);
        const matchStatus = statusQuery === "" || exam.status === statusQuery;
        const matchSubject = (exam.subject || "").toLowerCase().includes(subjectQuery);
        return matchTitle && matchStatus && matchSubject;
    });
    currentPage = 1;
    renderExamsTable();
}


async function loadNotifications() {
    const token = localStorage.getItem("token");
    const area = document.getElementById("notificationArea");
    const list = document.getElementById("notificationList");
    if (!area || !list) return;

    try {
        const res = await fetch("/api/faculty/notifications", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.alerts.length > 0) {
            area.style.display = "block";
            list.innerHTML = data.alerts.map(a => `
                <div class="notification-item ${a.type}">${escapeHTML(a.message)}</div>
            `).join('');
        }
    } catch (err) {
        console.error("Notif Error:", err);
    }
}


async function loadFacultyExams() {
    const token = localStorage.getItem("token");
    const container = document.getElementById("facultyExamContainer");
    
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading exams...</td></tr>';

    try {
        const response = await fetch("/api/faculty/my-exams", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            allExams = data.exams;
            filteredExams = [...allExams];
            updateDashboardStats();
            renderExamsTable();
        } else {
            container.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Failed to load exams: ${escapeHTML(data.message)}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading exams:", err);
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Error connecting to server</td></tr>`;
    }
}

function updateDashboardStats() {
    const totalExamsEl = document.getElementById("facultyTotalExams");
    const publishedCountEl = document.getElementById("publishedCount");
    const draftCountEl = document.getElementById("draftCount");

    if (totalExamsEl) totalExamsEl.textContent = allExams.length;
    if (publishedCountEl) publishedCountEl.textContent = allExams.filter(e => e.status === 'published').length;
    if (draftCountEl) draftCountEl.textContent = allExams.filter(e => e.status === 'draft').length;
}

function renderExamsTable() {
    const container = document.getElementById("facultyExamContainer");
    if (!container) return;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filteredExams.slice(start, end);

    if (paginated.length === 0 && filteredExams.length > 0) {
        // Edge case: page became empty due to filter
        currentPage = 1;
        renderExamsTable();
        return;
    }

    if (filteredExams.length === 0) {
        container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 2rem;">No matching exams found.</td></tr>`;
        renderPagination();
        return;
    }

    let html = "";
    paginated.forEach((exam, idx) => {
        const globalIdx = start + idx + 1;
        let badgeClass = "badge-draft";
        if (exam.status === "published") badgeClass = "badge-published";
        if (exam.status === "disabled") badgeClass = "badge-disabled";

        const publishToggle = exam.status === 'published'
            ? `<button class="action-btn disable-btn" onclick="updateExamStatus(${exam.id}, 'disabled')">Disable</button>`
            : `<button class="action-btn publish-btn" onclick="updateExamStatus(${exam.id}, 'published')">Publish</button>`;

        html += `
            <tr>
                <td>${globalIdx}</td>
                    <td>
                        <div style="font-weight: 600;">${escapeHTML(exam.title)}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">
                            Sub: ${escapeHTML(exam.subject || 'None')} 
                            ${exam.scheduled_at ? `| Sched: ${new Date(exam.scheduled_at).toLocaleString()}` : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b;" id="stats_${exam.id}">Loading summary...</div>
                    </td>

                <td>${exam.duration}m</td>
                <td><span class="badge ${badgeClass}">${exam.status.toUpperCase()}</span></td>
                <td class="action-cell" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${publishToggle}
                    <button class="action-btn view-btn" onclick="duplicateExam(${exam.id})">Duplicate</button>
                    <button class="action-btn" style="background:#e2e8f0; color:#1e293b;" onclick="window.location.href='exam-details.html?id=${exam.id}'">Edit / Questions</button>
                    <button class="action-btn view-btn" style="background:#4b45a3;" onclick="viewFullResults(${exam.id}, '${escapeHTML(exam.title)}')">Full Results</button>
                </td>
            </tr>
        `;
        // Async load stats for this row
        loadRowStats(exam.id);
    });

    container.innerHTML = html;
    renderPagination();
}

async function loadRowStats(examId) {
    const statsEl = document.getElementById(`stats_${examId}`);
    if (!statsEl) return;
    try {
        const res = await fetch(`/api/faculty/exam/${examId}/stats`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await res.json();
        if (data.success && data.stats) {
            const { total_submissions, avg_score, pass_rate } = data.stats;
            if (total_submissions > 0) {
                statsEl.innerHTML = `Avg: ${parseFloat(avg_score).toFixed(1)} | Pass: ${Math.round(pass_rate)}% | Submissions: ${total_submissions}`;
            } else {
                statsEl.textContent = "No submissions yet.";
            }
        }
    } catch (err) {
        statsEl.textContent = "Stats unavailable";
    }
}

function renderPagination() {
    const controls = document.getElementById("paginationControls");
    if (!controls) return;

    const totalPages = Math.ceil(filteredExams.length / pageSize);
    if (totalPages <= 1) {
        controls.innerHTML = "";
        return;
    }

    let html = `
        <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    html += `
        <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>
    `;

    controls.innerHTML = html;
}

window.changePage = function (page) {
    currentPage = page;
    renderExamsTable();
}

window.duplicateExam = async function (id) {
    if (!confirm("Create a copy of this exam? (It will be created as a draft)")) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/faculty/exam/${id}/duplicate`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast("Exam duplicated!", "success");
            loadFacultyExams();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Server error.");
    }
}


window.updateExamStatus = async function (examId, newStatus) {
    let confirmMsg = `Are you sure you want to change this exam's status to ${newStatus}?`;
    if (newStatus === 'disabled') {
        confirmMsg = "Warning: Disabling this exam will prevent any more students from taking it. Continue?";
    }
    if (!confirm(confirmMsg)) return;


    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`/api/faculty/exam/${examId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (data.success) {
            showToast(`Exam marked as ${newStatus}`, "success");
            loadFacultyExams(); // Reload immediate
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error("Error updating exam status:", err);
        alert("Server error");
    }
}

// ==========================================
// Create Exam Wizard Functionality
// ==========================================

let currentWizardStep = 1;
window.wizardExamId = null;
window.generatedQuestionsCache = [];

function initCreateExam() {
    showWizardStep(1);

    const generateAIBtn = document.getElementById("generateAIBtn");
    if (generateAIBtn) {
        generateAIBtn.addEventListener("click", handleAIGeneration);
    }
}

function showWizardStep(stepNumber) {
    const steps = [1, 2, 3];
    steps.forEach(n => {
        const el = document.getElementById(`wizardStep${n}`);
        if (el) {
            el.style.display = (n === stepNumber) ? "block" : "none";
        }

        // Update header UI
        const stepHeader = document.getElementById(`stepHeader${n}`);
        if (stepHeader) {
            if (n < stepNumber) {
                stepHeader.className = "wizard-step completed";
            } else if (n === stepNumber) {
                stepHeader.className = "wizard-step active";
            } else {
                stepHeader.className = "wizard-step";
            }
        }
    });
    currentWizardStep = stepNumber;
}

// Step 1 -> 2: Create the draft Exam record first, then proceed to AI gen
window.goToStep2 = async function () {
    const title = document.getElementById("examTitle").value.trim();
    const subject = document.getElementById("examSubject").value.trim();
    const desc = document.getElementById("examDesc").value.trim();
    const duration = document.getElementById("examDuration").value;
    const schedAt = document.getElementById("examScheduledAt").value;
    const instructions = document.getElementById("examInstructions").value.trim();

    if (!title || !desc || !duration) {
        alert("Please fill in all details.");
        return;
    }

    const token = localStorage.getItem("token");
    const publishBtn = document.getElementById("step1NextBtn");
    publishBtn.innerText = "Saving Draft...";
    publishBtn.disabled = true;

    try {
        const response = await fetch("/api/faculty/create-exam", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                title, 
                subject, 
                description: desc, 
                duration: parseInt(duration),
                scheduled_at: schedAt || null,
                instructions: instructions || null
            })
        });

        const data = await response.json();
        if (data.success) {
            window.wizardExamId = data.examId;
            // Pre-fill context for step 2
            document.getElementById("aiContextInfo").textContent = `Generating questions for: ${title} (${duration} mins)`;
            showWizardStep(2);
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Network error.");
    } finally {
        publishBtn.innerText = "Next: Add Questions ->";
        publishBtn.disabled = false;
    }
}

// AI Generation Trigger
async function handleAIGeneration() {
    const topic = document.getElementById("aiTopic").value.trim();
    if (!topic) {
        alert("Please enter a specific topic/instruction for the AI.");
        return;
    }

    const title = document.getElementById("examTitle").value;
    const desc = document.getElementById("examDesc").value;
    const duration = document.getElementById("examDuration").value;

    const btn = document.getElementById("generateAIBtn");
    btn.innerText = "Brainstorming Questions...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/faculty/generate-ai-questions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ title, description: desc, duration, topic })
        });
        const data = await response.json();
        if (data.success) {
            window.generatedQuestionsCache = data.questions;
            renderQuestionEditor();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("AI Service unreachable.");
    } finally {
        btn.innerText = "Generate Questions";
        btn.disabled = false;
    }
}

// Renders the editable cards
function renderQuestionEditor() {
    const container = document.getElementById("aiQuestionsEditor");
    container.innerHTML = "";

    if (window.generatedQuestionsCache.length === 0) {
        container.innerHTML = "<p>No questions generated.</p>";
        return;
    }

    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <h3>Review & Edit Generated Questions (${window.generatedQuestionsCache.length})</h3>
                </div>`;

    window.generatedQuestionsCache.forEach((q, idx) => {
        html += `
        <div class="question-edit-card" id="qCard_${idx}">
            <div style="font-weight:600; margin-bottom:0.5rem; color:#4b45a3;">Question ${idx + 1}</div>
            <textarea id="qText_${idx}" class="edit-input" style="height:60px; font-weight:500;">${escapeHTML(q.question)}</textarea>
            
            <div class="options-grid">
                <div>Option 1 <input type="text" id="qOpt1_${idx}" class="edit-input" value="${escapeHTML(q.option1)}"></div>
                <div>Option 2 <input type="text" id="qOpt2_${idx}" class="edit-input" value="${escapeHTML(q.option2)}"></div>
                <div>Option 3 <input type="text" id="qOpt3_${idx}" class="edit-input" value="${escapeHTML(q.option3)}"></div>
                <div>Option 4 <input type="text" id="qOpt4_${idx}" class="edit-input" value="${escapeHTML(q.option4)}"></div>
            </div>

            <div style="margin-top:1rem; display:flex; align-items:center; gap: 1rem;">
                <label style="font-weight:600;">Correct Option:</label>
                <select id="qCorrect_${idx}" class="edit-input" style="width:150px;">
                    <option value="1" ${q.correct_option === 1 ? 'selected' : ''}>Option 1</option>
                    <option value="2" ${q.correct_option === 2 ? 'selected' : ''}>Option 2</option>
                    <option value="3" ${q.correct_option === 3 ? 'selected' : ''}>Option 3</option>
                    <option value="4" ${q.correct_option === 4 ? 'selected' : ''}>Option 4</option>
                </select>
                <button type="button" class="action-btn disable-btn" onclick="removeQuestionCard(${idx})" style="margin-left:auto;">🗑 Remove</button>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById("saveQuestionsBtn").style.display = "block";
}

window.removeQuestionCard = function (idx) {
    const card = document.getElementById(`qCard_${idx}`);
    if (card) card.style.display = 'none';
    card.classList.add('removed-question'); // mark so we ignore it during save
}

// Gather all edited questions and send to DB API length
window.saveQuestionsAndProceed = async function () {
    const cards = document.querySelectorAll('.question-edit-card:not(.removed-question)');
    if (cards.length === 0) {
        alert("You must have at least one question to proceed.");
        return;
    }

    const payloadQuestions = [];
    cards.forEach(card => {
        const idParts = card.id.split("_");
        const idx = idParts[1];

        payloadQuestions.push({
            question: document.getElementById(`qText_${idx}`).value,
            option1: document.getElementById(`qOpt1_${idx}`).value,
            option2: document.getElementById(`qOpt2_${idx}`).value,
            option3: document.getElementById(`qOpt3_${idx}`).value,
            option4: document.getElementById(`qOpt4_${idx}`).value,
            correct_option: parseInt(document.getElementById(`qCorrect_${idx}`).value)
        });
    });

    const btn = document.getElementById("saveQuestionsBtn");
    btn.innerText = "Saving to Database...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/faculty/add-questions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
                exam_id: window.wizardExamId,
                questions: payloadQuestions
            })
        });
        const data = await response.json();
        if (data.success) {
            // Update step 3 summary
            document.getElementById("summaryTitle").textContent = document.getElementById("examTitle").value;
            document.getElementById("summaryQCount").textContent = payloadQuestions.length;
            showWizardStep(3);
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error saving questions.");
    } finally {
        btn.innerText = "Save Questions -> Next";
        btn.disabled = false;
    }
}

// Final Step: Publish
window.publishExamNow = async function () {
    if (!window.wizardExamId) return;

    const btn = document.getElementById("publishFinalBtn");
    btn.innerText = "Publishing...";
    btn.disabled = true;

    try {
        const response = await fetch(`/api/faculty/exam/${window.wizardExamId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ status: "published" })
        });
        const data = await response.json();
        if (data.success) {
            alert("Exam Published successfully! It is now visible to students.");
            window.location.href = "faculty-dashboard.html";
        } else {
            alert(data.message);
            btn.disabled = false;
            btn.innerText = "Yes, Publish Exam";
        }
    } catch (err) {
        console.error(err);
        alert("Server error.");
        btn.disabled = false;
    }
}

// Modal Results
window.viewFullResults = async function (examId, examTitle) {
    const token = localStorage.getItem("token");
    const modal = document.getElementById("resultsModal");
    const body = document.getElementById("modalResultsBody");
    const titleEl = document.getElementById("modalExamTitle");

    if (!modal || !body) return;

    titleEl.textContent = `Full Results: ${examTitle}`;
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
    modal.style.display = "flex";

    try {
        const res = await fetch(`/api/faculty/exam/${examId}/results`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        if (data.success && data.results.length > 0) {
            body.innerHTML = data.results.map(r => {
                const pct = (r.percentage !== undefined && !isNaN(r.percentage)) ? Math.round(Number(r.percentage)) : Math.round((r.score / r.total_marks) * 100);
                return `
                    <tr>
                        <td>${r.student_id}</td>
                        <td style="font-weight:600;">${escapeHTML(r.student_name)}</td>
                        <td>${r.score} / ${r.total_marks}</td>
                        <td>
                            <span class="badge ${pct >= 40 ? 'badge-published' : 'badge-disabled'}">${pct}%</span>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #64748b;">No submissions found for this exam.</td></tr>';
        }
    } catch (err) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading results</td></tr>';
    }
}

window.closeResultsModal = function () {
    const modal = document.getElementById("resultsModal");
    if (modal) modal.style.display = "none";
}

// Utility UI
function showToast(message, type = "info") {
    // Reusing the toast logic if needed, simple alert fallback for now
    alert(`${type.toUpperCase()}: ${message}`);
}
