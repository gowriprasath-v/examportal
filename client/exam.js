/**
 * exam.js
 * Handles single-question logic, navigation, and timer
 */

let examData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let isSubmitting = false;

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');

    if (!examId) {
        alert("Invalid Exam ID");
        window.location.href = 'student-dashboard.html';
        return;
    }

    loadExam(examId);

    // Event listeners
    document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
    document.getElementById('nextBtn').addEventListener('click', handleNavigation);
    document.getElementById('exitExamBtn').addEventListener('click', () => {
        window.location.href = 'student-dashboard.html';
    });
});

async function loadExam(examId) {
    try {
        const res = await fetch(`/api/student/exam/${examId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        examData = data.exam;
        document.getElementById('examTitle').innerText = examData.title;

        // Initialize results/answers array
        userAnswers = {};

        renderQuestion();
        startTimer(examData.duration * 60);

        // Mark exam as IN_PROGRESS
        fetch('/api/student/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ examId, status: 'IN_PROGRESS' })
        }).catch(err => console.error("Error updating status to IN_PROGRESS:", err));

    } catch (err) {
        console.error("Load Exam Error:", err);
        alert("Error loading exam: " + err.message);
        window.location.href = 'student-dashboard.html';
    }
}

function renderQuestion() {
    if (!examData || !examData.questions) return;

    const questions = examData.questions;
    const q = questions[currentQuestionIndex];

    document.getElementById('questionProgress').innerText = `Question ${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('questionText').innerText = q.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    if (q.options && q.options.length > 0) {
        q.options.forEach((opt, idx) => {
            // Options array from DB map to 1-4
            const optionIndex = idx + 1;
            const isSelected = userAnswers[q.id] === optionIndex;
            const optionDiv = document.createElement('div');
            optionDiv.className = `option-item ${isSelected ? 'selected' : ''}`;
            optionDiv.innerHTML = `
                <input type="radio" name="option" value="${optionIndex}" ${isSelected ? 'checked' : ''}>
                <span class="option-label">${opt}</span>
            `;
            optionDiv.onclick = () => selectOption(q.id, optionIndex, optionDiv);
            optionsContainer.appendChild(optionDiv);
        });
    } else {
        optionsContainer.innerHTML = `
            <textarea rows="6" style="width: 100%; padding: 15px; border-radius: 12px; border: 2px solid var(--border-color); font-size: 1rem;" 
                placeholder="Type your answer here..." id="descriptiveAnswer">${userAnswers[q.id] || ''}</textarea>
        `;
        document.getElementById('descriptiveAnswer').oninput = (e) => {
            userAnswers[q.id] = e.target.value;
        };
    }

    // Update buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';

    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.innerText = 'Submit Exam';
        nextBtn.classList.remove('btn-next');
        nextBtn.classList.add('btn-submit');
    } else {
        nextBtn.innerText = 'Next Question';
        nextBtn.classList.remove('btn-submit');
        nextBtn.classList.add('btn-next');
    }
}

function selectOption(questionId, optionIndex, element) {
    userAnswers[questionId] = optionIndex;
    document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function handleNavigation() {
    const questions = examData.questions;
    const q = questions[currentQuestionIndex];

    // Validate that an answer is provided
    if (!userAnswers[q.id]) {
        alert("Please select an option or provide an answer before proceeding.");
        return;
    }

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        submitExam();
    }
}

function navigate(direction) {
    if (direction === -1 && currentQuestionIndex > 0) {
        currentQuestionIndex--;
    }
    renderQuestion();
}

function startTimer(duration) {
    const examId = examData.id;
    const endTimeKey = `examEndTime_${examId}`;
    let endTime = localStorage.getItem(endTimeKey);

    if (!endTime) {
        // duration is in seconds, so * 1000 gives milliseconds
        endTime = Date.now() + duration * 1000;
        localStorage.setItem(endTimeKey, endTime);
    } else {
        endTime = parseInt(endTime, 10);
    }

    function updateTimer() {
        let left = Math.floor((endTime - Date.now()) / 1000);

        if (left <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timerText').innerText = "00:00";
            if (!isSubmitting) {
                alert('Time up! Submitting your exam automatically.');
                submitExam(true);
            }
        } else {
            const mins = Math.floor(left / 60);
            const secs = left % 60;
            document.getElementById('timerText').innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

async function submitExam(isAutoSubmit = false) {
    if (isSubmitting) return;
    isSubmitting = true;

    clearInterval(timerInterval);

    const btn = document.getElementById('nextBtn');
    if (btn) {
        btn.innerText = "Submitting...";
        btn.disabled = true;
    }

    try {
        const response = await fetch("/api/student/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                examId: examData.id,
                answers: userAnswers
            })
        });

        const data = await response.json();

        if (data.success) {
            // Clear timer state
            localStorage.removeItem(`examEndTime_${examData.id}`);

            if (isAutoSubmit) {
                alert(`Exam Submitted Automatically!\nYour Score: ${data.score} / ${data.total_marks || data.total_questions}`);
                window.location.href = 'student-dashboard.html';
            } else {
                // Show Exit button and successfully submitted message
                document.getElementById('exitExamBtn').style.display = 'inline-block';
                document.querySelector('.exam-container').innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h2 style="color: #10b981; margin-bottom: 20px;">Exam Completed Successfully!</h2>
                        <p style="font-size: 1.1rem; margin-bottom: 10px;">You have securely submitted your answers.</p>
                        <p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 20px;">Score: ${data.score} / ${data.total_marks || data.total_questions}</p>
                        <p style="color: var(--text-muted);">Please click the <b>Exit</b> button at the top right to return to your dashboard.</p>
                    </div>
                `;
            }
        } else {
            alert(`Error submitting exam: ${data.message}`);
            if (btn) {
                btn.innerText = "Submit Exam";
                btn.disabled = false;
            }
            isSubmitting = false;
        }

    } catch (err) {
        console.error("Submission error:", err);
        alert("Network error. Could not submit exam.");
        if (btn) {
            btn.innerText = "Submit Exam";
            btn.disabled = false;
        }
        isSubmitting = false;
    }
}
