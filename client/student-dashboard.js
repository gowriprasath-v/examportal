/**
 * student-dashboard.js
 * Handles dynamic content for the redesigned student dashboard
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize User Info
    const username = localStorage.getItem("username") || "Student";
    const studentNameElements = document.querySelectorAll(".js-student-name");
    const avatarElements = document.querySelectorAll(".js-user-avatar");

    studentNameElements.forEach(el => el.innerText = username);
    avatarElements.forEach(el => el.innerText = username.charAt(0).toUpperCase());

    // 2. Load Content
    loadExams();
    loadResults();
    loadNotifications();

    // 3. Setup Handlers
    setupHandlers();
    highlightActiveLink();
});

function highlightActiveLink() {
    const currentPath = window.location.pathname.split("/").pop();
    document.querySelectorAll(".sidebar-menu .menu-item").forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

function setupHandlers() {
    // Logout Handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Filter/Sort Handlers
    const hSearch = document.getElementById("historySearch");
    if (hSearch) {
        hSearch.addEventListener("input", renderResultsTable);
    }
    const sOrder = document.getElementById("sortOrder");
    if (sOrder) {
        sOrder.addEventListener("change", renderResultsTable);
    }
}


let allExams = [];
let countdownInterval = null;

async function loadExams() {
    try {
        const res = await fetch('/api/student/exams', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        allExams = data.exams || [];
        document.getElementById('availableCount').innerText = allExams.length;
        renderExamsGrid();
        
        // Start countdown refresh
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(renderExamsGrid, 10000); // refresh every 10s for timers

    } catch (err) {
        console.error("Failed to load exams:", err);
        const container = document.getElementById('examGrid');
        if (container) container.innerHTML = `<p style="color: var(--danger-color); padding: 20px;">Error: ${err.message}</p>`;
    }
}

function renderExamsGrid() {
    const container = document.getElementById('examGrid');
    if (!container) return;

    if (allExams.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 50px 20px; color: #636e72;"><p style="font-size:1.1rem; font-weight:600; color: #10b981;">🎉 All exams caught up!</p></div>`;
        return;
    }

    const now = new Date();

    container.innerHTML = allExams.map(exam => {
        const qCount = parseInt(exam.question_count) || 0;
        const schedAt = exam.scheduled_at ? new Date(exam.scheduled_at) : null;
        let status = 'Open';
        let statusClass = 'status-open';
        let canStart = qCount > 0;
        let countdownHtml = '';

        if (schedAt && schedAt > now) {
            status = 'Scheduled';
            statusClass = 'status-scheduled';
            canStart = false;
            const diff = schedAt - now;
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            countdownHtml = `<span class="countdown">Starts in: ${hours > 0 ? hours + 'h ' : ''}${mins % 60}m</span>`;
        }

        return `
        <div class="exam-card">
            <div class="exam-card-info">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <h3 class="exam-title" style="margin:0;">${escapeHTML(exam.title)}</h3>
                    <span class="status-badge ${statusClass}">${status}</span>
                    ${countdownHtml}
                </div>
                <p class="exam-desc">${escapeHTML(exam.description || 'No description.')}</p>
                <div style="display:flex; gap:15px; align-items:center;">
                    <span class="exam-duration">⏱️ ${exam.duration || 'N/A'}m</span>
                    <a href="#" onclick="showInstructions(${exam.id}); return false;" style="font-size:0.8rem; color:var(--primary-color); font-weight:600;">View Instructions</a>
                </div>
            </div>
            <div class="exam-card-action">
                <button class="btn-start" ${!canStart ? 'disabled' : ''} 
                    onclick="${canStart ? `showInstructions(${exam.id})` : ''}">
                    ${status === 'Scheduled' ? 'Wait' : 'Start'}
                </button>
            </div>
        </div>`;
    }).join('');
}


let allResults = [];

async function loadResults() {
    try {
        const res = await fetch('/api/student/my-results', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        allResults = data.results || [];
        document.getElementById('completedCount').innerText = allResults.length;
        
        renderResultsTable();
        renderPerformanceGraph();

    } catch (err) {
        console.error("Failed to load results:", err);
        const tableBody = document.getElementById('resultsTableBody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="3" style="color: var(--danger-color); padding: 20px; text-align: center;">Error: ${err.message}</td></tr>`;
    }
}

function renderResultsTable() {
    const tableBody = document.getElementById('resultsTableBody');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('historySearch')?.value || '').toLowerCase();
    const sortOrder = document.getElementById('sortOrder')?.value || 'desc';

    let filtered = allResults.filter(r => r.exam_title.toLowerCase().includes(searchQuery));

    // Sort
    filtered.sort((a, b) => {
        if (sortOrder === 'asc') return new Date(a.date) - new Date(b.date);
        if (sortOrder === 'desc') return new Date(b.date) - new Date(a.date);
        if (sortOrder === 'score-desc') return (b.score / b.total_marks) - (a.score / a.total_marks);
        return 0;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: var(--text-muted);">No results match your filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(res => {
        const percentage = res.percentage !== undefined ? Math.round(Number(res.percentage)) : Math.round((res.score / res.total_marks) * 100);
        const dateStr = res.date ? new Date(res.date).toLocaleDateString() : 'N/A';
        return `
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 15px 25px; color: var(--text-main); font-weight: 500;">
                    ${escapeHTML(res.exam_title)}
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">Date: ${dateStr}</div>
                </td>
                <td style="padding: 15px 25px; color: var(--text-main); font-weight: 600;">${res.score} / ${res.total_marks}</td>
                <td style="padding: 15px 25px;">
                    <span style="background: ${percentage >= 40 ? '#d1fae5' : '#fee2e2'}; color: ${percentage >= 40 ? '#065f46' : '#991b1b'}; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;">
                        ${percentage}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPerformanceGraph() {
    const graphContainer = document.getElementById('performanceGraph');
    const avgScoreEl = document.getElementById('avgScore');
    if (!graphContainer) return;

    if (allResults.length === 0) {
        graphContainer.innerHTML = '<p style="color: #ccc; font-size: 0.8rem; margin: auto;">Complete an exam to see your progress.</p>';
        return;
    }

    // Take last 10 results, reverse so chronology is left-to-right
    const recentResults = [...allResults].reverse().slice(-10);
    const totalPercentage = allResults.reduce((acc, curr) => acc + (curr.score / curr.total_marks), 0);
    const avgScore = Math.round((totalPercentage / allResults.length) * 100);
    if (avgScoreEl) avgScoreEl.innerText = avgScore;

    graphContainer.innerHTML = recentResults.map(r => {
        const pct = r.percentage !== undefined ? Math.round(Number(r.percentage)) : Math.round((r.score / r.total_marks) * 100);
        return `<div class="graph-bar" style="height: ${pct}%" data-score="${pct}"></div>`;
    }).join('');
}

async function loadNotifications() {
    try {
        const res = await fetch('/api/student/notifications', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success && data.alerts.length > 0) {
            const area = document.getElementById("notificationArea");
            const list = document.getElementById("notificationList");
            area.style.display = "block";
            list.innerHTML = data.alerts.map(a => `<div class="notification-item ${a.type}">${escapeHTML(a.message)}</div>`).join('');
        }
    } catch (e) {
        console.error("Notif Error:", e);
    }
}

window.showInstructions = function(examId) {
    const exam = allExams.find(e => e.id == examId);
    if (!exam) return;

    document.getElementById('modalExamTitle').innerText = exam.title;
    document.getElementById('modalInstructions').innerText = exam.instructions || "Please ensure a stable internet connection. Do not switch tabs during the exam. Once started, the timer will not stop.";
    
    const startBtn = document.getElementById('startExamFinal');
    const now = new Date();
    const canStart = !exam.scheduled_at || new Date(exam.scheduled_at) <= now;
    
    startBtn.onclick = () => window.location.href = `exam.html?id=${examId}`;
    startBtn.disabled = !canStart;
    startBtn.innerText = canStart ? "Start Exam Now" : "Currently Locked";

    document.getElementById('instructionsModal').style.display = 'flex';
}

window.closeModal = function() {
    document.getElementById('instructionsModal').style.display = 'none';
}

function escapeHTML(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}


function logoutUser() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    window.location.href = "index.html";
}
