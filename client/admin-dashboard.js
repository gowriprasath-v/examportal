/**
 * admin-dashboard.js
 * Full Admin Control Panel Logic
 * Manages: Navigation, Users (Faculty/Students), Exams, Audit Log
 */

// ─── Security & Audit Log (Backend Integration) ───────────────────────────
async function loadAuditLogs() {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;

    try {
        const res = await fetch('/api/auth/audit-logs', { headers: authHeader() });
        const data = await res.json();

        if (Array.isArray(data)) {
            if (data.length === 0) {
                container.innerHTML = '<p class="audit-empty">No security actions recorded yet.</p>';
                return;
            }
            container.innerHTML = data.map(e => `
                <div class="audit-entry">
                    <span class="log-time">[${new Date(e.timestamp).toLocaleString()}]</span>
                    <span class="log-ip">${e.ip || '—'}</span>
                    <span class="log-action"><strong>${esc(e.event_type)}</strong></span>
                    <span class="log-detail">${esc(e.username || 'unknown')} - ${esc(e.details)}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Audit Log Load Error:', err);
        container.innerHTML = '<p class="audit-empty" style="color:#ef4444;">Failed to load audit logs.</p>';
    }
}

async function clearAuditLog() {
    if (!confirm("Permanently clear all security logs?")) return;
    try {
        const res = await fetch('/api/auth/clear-audit-logs', { method: 'DELETE', headers: authHeader() });
        const data = await res.json();
        if (data.success) {
            showToast("✅ Audit logs cleared.", "green");
            loadAuditLogs();
        }
    } catch (err) {
        console.error('Clear Audit Log Error:', err);
    }
}

// ─── AUTH GUARD ────────────────────────────────────────────────────────────
(function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');
    if (!isLoggedIn || role?.toLowerCase() !== 'admin') {
        window.location.href = 'index.html';
    }
})();

// ─── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Welcome message & avatar
    const username = localStorage.getItem('username') || 'Admin';
    const welcomeEl = document.getElementById('welcomeUsername');
    const nameEl = document.getElementById('adminName');
    const avatarEl = document.getElementById('adminAvatar');
    if (welcomeEl) welcomeEl.innerText = `Welcome back, ${username}`;
    if (nameEl) nameEl.innerText = username;
    if (avatarEl) avatarEl.innerText = username.charAt(0).toUpperCase();

    // Sidebar navigation
    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.getAttribute('data-section'));
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logoutUser(); });

    // Initial data load
    loadAdminStats();
    loadFacultyForAdmin();
    loadStudentsForAdmin();
    loadExamsForAdmin();
    loadAuditLogs();
});

// ─── SECTION NAVIGATION ────────────────────────────────────────────────────
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));

    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    const activeLink = document.querySelector(`.sidebar-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// ─── USER TAB SWITCH ───────────────────────────────────────────────────────
function switchUserTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tab === 'faculty' ? 'facultyTab' : 'studentTab').classList.add('active');
    document.getElementById(tab === 'faculty' ? 'tabFaculty' : 'tabStudent').classList.add('active');
}

// ─── LOAD STATS ────────────────────────────────────────────────────────────
async function loadAdminStats() {
    try {
        const res = await fetch('/api/admin/stats', { headers: authHeader() });
        const data = await res.json();
        if (data.success) {
            setValue('totalExams', data.stats.totalExams);
            setValue('totalQuestions', data.stats.totalQuestions);
            setValue('totalFaculty', data.stats.totalFaculty);
            setValue('totalStudents', data.stats.totalStudents);
        }
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────
async function loadFacultyForAdmin() {
    const tbody = document.getElementById('facultyTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('/api/admin/faculty', { headers: authHeader() });
        const data = await res.json();
        if (data.success && data.users.length > 0) {
            tbody.innerHTML = data.users.map((u, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${esc(u.name)}</strong></td>
                    <td>${esc(u.email)}</td>
                    <td>${fmtDate(u.created_at)}</td>
                    <td><span class="status-badge green">● Active</span></td>
                    <td>
                        <div class="action-group">
                            <button class="btn-action btn-delete" onclick="handleDeleteUser(${u.id},'faculty','${esc(u.name)}')">🗑️ Remove</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No faculty members found.</td></tr>';
        }
    } catch (err) {
        console.error('Faculty load error:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row" style="color:#ef4444;">Failed to load faculty.</td></tr>';
    }
}

async function loadStudentsForAdmin() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('/api/admin/students', { headers: authHeader() });
        const data = await res.json();
        if (data.success && data.users.length > 0) {
            tbody.innerHTML = data.users.map((u, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${esc(u.name)}</strong></td>
                    <td>${esc(u.email)}</td>
                    <td>${fmtDate(u.created_at)}</td>
                    <td><span class="status-badge green">Student</span></td>
                    <td>
                        <div class="action-group">
                            <button class="btn-action btn-delete" onclick="handleDeleteUser(${u.id},'student','${esc(u.name)}')">🗑️ Remove</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No students found.</td></tr>';
        }
    } catch (err) {
        console.error('Students load error:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row" style="color:#ef4444;">Failed to load students.</td></tr>';
    }
}

async function handleCreateUser(e, role) {
    e.preventDefault();
    const prefix = role === 'Faculty' ? 'fac' : 'stu';
    const name = document.getElementById(`${prefix}Name`).value.trim();
    const email = document.getElementById(`${prefix}Email`).value.trim();
    const password = document.getElementById(`${prefix}Pass`).value;

    if (!name || !email || !password) return;

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { ...authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();

        if (data.success) {
            showToast(`✅ ${role} account created!`, 'green');
            // Clear form
            document.getElementById(`${prefix}Name`).value = '';
            document.getElementById(`${prefix}Email`).value = '';
            document.getElementById(`${prefix}Pass`).value = '';
            // Reload table
            if (role === 'Faculty') loadFacultyForAdmin();
            else loadStudentsForAdmin();
            loadAdminStats();
        } else {
            showToast(`❌ ${data.message}`, 'red');
        }
    } catch (err) {
        console.error('Create user error:', err);
        showToast('❌ Server error creating user.', 'red');
    }
}

async function handleDeleteUser(id, type, name) {
    if (!confirm(`Remove ${name}? This action cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeader() });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ User removed successfully.`, 'green');
            if (type === 'faculty') loadFacultyForAdmin();
            else loadStudentsForAdmin();
            loadAdminStats();
        } else {
            showToast(`❌ ${data.message}`, 'red');
        }
    } catch (err) {
        console.error('Delete user error:', err);
    }
}

// ─── EXAM MANAGEMENT ───────────────────────────────────────────────────────
async function loadExamsForAdmin() {
    const tbody = document.getElementById('adminExamTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Loading...</td></tr>';
    try {
        const res = await fetch('/api/admin/exams', { headers: authHeader() });
        const data = await res.json();
        if (data.success && data.exams.length > 0) {
            tbody.innerHTML = data.exams.map((exam, i) => {
                const badge = statusBadge(exam.status);
                return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${esc(exam.title)}</strong></td>
                    <td>${esc(exam.faculty_name || '—')}</td>
                    <td>${exam.duration ? exam.duration + ' min' : '—'}</td>
                    <td>${badge}</td>
                    <td>
                        <div class="action-group">
                            ${exam.status !== 'published' ? `<button class="btn-action btn-approve" onclick="handleExamStatus(${exam.id},'published','${esc(exam.title)}')">✅ Approve</button>` : ''}
                            ${exam.status !== 'disabled' ? `<button class="btn-action btn-disable" onclick="handleExamStatus(${exam.id},'disabled','${esc(exam.title)}')">⏸ Disable</button>` : ''}
                            <button class="btn-action btn-delete" onclick="handleDeleteExam(${exam.id},'${esc(exam.title)}')">🗑️ Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No exams found.</td></tr>';
        }
    } catch (err) {
        console.error('Exams load error:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row" style="color:#ef4444;">Failed to load exams.</td></tr>';
    }
}

async function handleExamStatus(id, status, title) {
    try {
        const res = await fetch(`/api/admin/exams/${id}`, {
            method: 'PATCH',
            headers: { ...authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Exam status updated to "${status}".`, 'green');
            loadExamsForAdmin();
        } else {
            showToast(`❌ ${data.message}`, 'red');
        }
    } catch (err) {
        console.error('Exam status error:', err);
    }
}

async function handleDeleteExam(id, title) {
    if (!confirm(`Permanently delete exam "${title}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: authHeader() });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Exam deleted.`, 'green');
            loadExamsForAdmin();
            loadAdminStats();
        } else {
            showToast(`❌ ${data.message}`, 'red');
        }
    } catch (err) {
        console.error('Delete exam error:', err);
    }
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────
function logoutUser() {
    ['isLoggedIn', 'role', 'username', 'token'].forEach(k => localStorage.removeItem(k));
    window.location.replace('index.html');
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function authHeader() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val ?? '--';
}

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
    const map = {
        published: '<span class="status-badge green">● Published</span>',
        draft: '<span class="status-badge amber">● Draft</span>',
        disabled: '<span class="status-badge red">● Disabled</span>',
    };
    return map[status] || `<span class="status-badge gray">● ${status}</span>`;
}

// Simple toast notification
function showToast(msg, type = 'green') {
    const toast = document.createElement('div');
    const bg = type === 'green' ? '#00b894' : '#ef4444';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: ${bg}; color: white;
        padding: 12px 22px; border-radius: 10px;
        font-weight: 600; font-size: 0.9rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        opacity: 1; transition: opacity 0.4s;
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}
