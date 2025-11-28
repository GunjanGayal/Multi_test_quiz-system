const baseURL = "http://localhost:3000";
let questions = [];
let current = 0;
let score = 0;
let timer;
let currentSubject = "";
let currentStudent = "";

// ✅ Utility: Show Screen
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hide"));
  document.getElementById(id).classList.remove("hide");
}

// ✅ Load subjects for teacher & student
async function loadSubjects() {
  const res = await fetch(`${baseURL}/subjects`);
  const data = await res.json();

  if (data.success) {
    const studentSelect = document.getElementById("student-subject");
    const teacherSelect = document.getElementById("teacher-subject");

    studentSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    teacherSelect.innerHTML = '<option value="">-- Select Subject --</option>';

    data.subjects.forEach(sub => {
      const opt1 = document.createElement("option");
      opt1.value = sub;
      opt1.textContent = sub;
      studentSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = sub;
      opt2.textContent = sub;
      teacherSelect.appendChild(opt2);
    });
  }
}

// ✅ Student Login
document.getElementById("student-login-btn").onclick = () => showScreen("student-login");
document.getElementById("teacher-login-btn").onclick = () => showScreen("teacher-login");

document.getElementById("student-login-submit").onclick = async () => {
  const u = document.getElementById("student-username").value.trim();
  const p = document.getElementById("student-password").value.trim();
  const res = await fetch(`${baseURL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  });
  const data = await res.json();
  if (data.success && data.role === "student") {
    currentStudent = u;
    await loadSubjects();
    showScreen("student-dashboard");
  } else alert("❌ Invalid student credentials");
};

// ✅ Teacher Login
document.getElementById("teacher-login-submit").onclick = async () => {
  const u = document.getElementById("teacher-username").value.trim();
  const p = document.getElementById("teacher-password").value.trim();
  const res = await fetch(`${baseURL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  });
  const data = await res.json();
  if (data.success && data.role === "teacher") {
    document.getElementById("teacher-name").textContent = u;
    await loadSubjects();
    showScreen("teacher-dashboard");
  } else alert("❌ Invalid teacher credentials");
};

// ✅ Add Student (Teacher)
document.getElementById("add-student-btn").onclick = async () => {
  const username = prompt("Enter new student username:");
  if (!username) return alert("⚠ Username is required!");
  const password = prompt("Enter password for this student:");
  if (!password) return alert("⚠ Password is required!");

  try {
    const res = await fetch(`${baseURL}/add-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: "student" })
    });
    const data = await res.json();
    if (data.success) alert(`✅ Student ${username} added successfully!`);
    else alert(`❌ Error: ${data.message}`);
  } catch (err) {
    console.error(err);
    alert("🚨 Cannot connect to server!");
  }
};

// ✅ Teacher Add Question
document.getElementById("add-question-btn").onclick = async () => {
  const subject = document.getElementById("teacher-subject").value.trim();
  if (!subject) return alert("⚠ Please select a subject first!");
  
  const q = prompt("Enter question:");
  if (!q) return alert("⚠ Question cannot be empty!");

  const options = [];
  for (let i = 1; i <= 4; i++) {
    const opt = prompt(`Option ${i}:`);
    if (opt) options.push(opt);
  }
  if (options.length < 2) return alert("⚠ Please enter at least two options!");

  const answer = prompt("Enter correct answer (must match one of the options):");
  if (!answer) return alert("⚠ Please enter a correct answer!");

  try {
    const res = await fetch(`${baseURL}/add-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, q, options, answer })
    });
    const data = await res.json();
    alert("✅ Question added successfully!");
  } catch (err) {
    console.error("Error adding question:", err);
    alert("❌ Failed to add question. Try again.");
  }
};
// ✅ Add New Subject (Teacher)
document.getElementById("add-subject-btn").onclick = async () => {
  const subject = prompt("Enter new subject name:");

  if (!subject || subject.trim() === "") {
    return alert("⚠ Subject name is required!");
  }

  try {
    const res = await fetch(`${baseURL}/add-subject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ New subject added successfully!");
      loadSubjects(); // dropdown refresh
    } else {
      alert("❌ " + data.message);
    }
}
catch (err) {
    console.error(err);
    alert("🚨 Server error while adding subject");
}
};


// RESET SELECTED SUBJECT SCORES (TEACHER)
// -------------------- RESET SELECTED SUBJECT SCORES --------------------
document.getElementById("reset-subject-scores-btn").onclick = async () => {
  const subject = document.getElementById("teacher-subject").value;

  if (!subject) return alert("⚠ Please select a subject first!");

  const confirmReset = confirm(`⚠ Are you sure you want to reset all scores for subject: ${subject}?`);
  if (!confirmReset) return;

  const res = await fetch(`${baseURL}/reset-subject-scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject })
  });

  const data = await res.json();

  if (data.success) {
    alert(`✅ All scores for '${subject}' have been reset!`);
  } else {
    alert("❌ Error: " + data.message);
  }
};
// ✅ Start Quiz (with permission check)
document.getElementById("start-quiz-btn").onclick = async () => {
  const subject = document.getElementById("student-subject").value;
  if (!subject) return alert("⚠ Please select a subject first!");
  currentSubject = subject;

  try {
 
    const res = await fetch(`${baseURL}/questions/${encodeURIComponent(subject)}/${currentStudent}`);
    const data = await res.json();
    if (!data.success) {
      alert(data.message); // No permission
      return;
    }

    questions = data.questions;
    current = 0;
    score = 0;
    showScreen("quiz-screen");
    loadQuestion();
  } catch (err) {
    console.error(err);
    alert("🚫 Cannot connect to server!");
  }
};

// ✅ Load Question
function loadQuestion() {
  clearInterval(timer);
  if (current >= questions.length) return endQuiz();

  const q = questions[current];
  document.getElementById("question-box").innerText = `${current + 1}. ${q.q}`;
  const optionsBox = document.getElementById("options-box");
  optionsBox.innerHTML = "";

  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(btn, q.answer);
    optionsBox.appendChild(btn);
  });

  startTimer();
}

// ✅ Timer
function startTimer() {
  let time = 15;
  document.getElementById("timer").textContent = `⏱ ${time}s`;
  timer = setInterval(() => {
    time--;
    document.getElementById("timer").textContent = `⏱ ${time}s`;
    if (time <= 0) {
      clearInterval(timer);
      current++;
      loadQuestion();
    }
  }, 1000);
}

// ✅ Check Answer
function checkAnswer(selected, correct) {
  clearInterval(timer);
  const all = document.querySelectorAll("#options-box .btn");
  all.forEach(b => {
    b.disabled = true;
    if (b.textContent === correct) b.style.background = "green";
    else if (b === selected) b.style.background = "red";
  });
  if (selected.textContent === correct) score++;
  setTimeout(() => {
    current++;
    loadQuestion();
  }, 1000);
}

// ✅ End Quiz
async function endQuiz() {
  const total = questions.length;
  const percentage = ((score / total) * 100).toFixed(2);

  document.getElementById("score").innerText = `${score} / ${total}`;
  document.getElementById("percentage").innerText = `${percentage}%`;

  let message =
    percentage >= 75 ? "🌟 Excellent work!" :
    percentage >= 50 ? "👍 Good job!" :
    percentage >= 35 ? "⚙ Need more practice!" :
    "😞 Better luck next time!";

  document.getElementById("score-box").innerText = message;
  showScreen("result-screen");

  alert(`✅ Quiz Complete!\nSubject: ${currentSubject}\nYour Score: ${score}/${total}`);

  // ✅ Save result
  try {
    await fetch(`${baseURL}/save-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentStudent,
        subject: currentSubject,
        score,
        total,
        percentage
      })
    });
  } catch (e) {
    console.error("Score save failed:", e);
  }
}

// ✅ Logout Buttons
document.getElementById("logout-teacher-btn").onclick = () => {
  document.getElementById("teacher-username").value = "";
  document.getElementById("teacher-password").value = "";
  showScreen("home");
};

document.getElementById("logout-student-btn").onclick = () => {
  document.getElementById("student-username").value = "";
  document.getElementById("student-password").value = "";
  showScreen("home");
};

// 🚫 Anti-Cheating
let cheatingSound = new Audio("cheat.mp3");
cheatingSound.preload = "auto";

function triggerCheatingWarning() {
  cheatingSound.play();
  alert("🚨 Cheating detected! Please stay on the quiz screen.");
}

window.addEventListener("blur", () => {
  const quizScreen = document.getElementById("quiz-screen");
  if (quizScreen && !quizScreen.classList.contains("hide")) triggerCheatingWarning();
});

document.addEventListener("visibilitychange", () => {
  const quizScreen = document.getElementById("quiz-screen");
  if (document.visibilityState === "hidden" && quizScreen && !quizScreen.classList.contains("hide"))
    triggerCheatingWarning();
});

// ✅ View All Scores
document.getElementById("view-scores-btn").onclick = async () => {
  try {
    const res = await fetch(`${baseURL}/scores`);
    const data = await res.json();

    if (data.success && data.scores.length > 0) {
      const tbody = document.querySelector("#scores-table tbody");
      tbody.innerHTML = "";
      data.scores.forEach(s => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${s.username}</td>
          <td>${s.subject}</td>
          <td>${s.score}</td>
          <td>${s.total}</td>
          <td>${s.percentage}%</td>
          <td>${s.date}</td>
        `;
        tbody.appendChild(row);
      });
      document.getElementById("scores-container").classList.remove("hide");
    } else alert("⚠ No scores found yet!");
  } catch (err) {
    console.error(err);
    alert("🚫 Cannot fetch scores from server!");
  }
};

// ✅ View Latest Score
document.getElementById("view-latest-btn").onclick = async () => {
  try {
    const res = await fetch(`${baseURL}/scores`);
    const data = await res.json();

    if (data.success && data.scores.length > 0) {
      const latest = data.scores[data.scores.length - 1];
      alert(` 🆕 Latest Score\nStudent: ${latest.username}\nSubject: ${latest.subject}\nScore: ${latest.score}/${latest.total}\nPercentage: ${latest.percentage}%`);
    } else alert("⚠ No scores found yet!");
  } catch (err) {
    console.error(err);
    alert("🚫 Cannot fetch latest score!");
  }
};

// ✅ Teacher Toggle Permission
document.getElementById("toggle-permission-btn").onclick = async () => {
  const student = prompt("Which student to toggle permission?");
  const subject = prompt("For which subject?");
  if (!student || !subject) return;

  try {
    const res = await fetch(`${baseURL}/toggle-permission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student, subject })
    });
    const data = await res.json();
    alert(`✅ Permission for ${student} on ${subject}: ${data.allowed}`);
    await loadSubjects(); // refresh subject dropdowns
  } catch (err) {
    console.error(err);
    alert("🚫 Permission toggle failed!");
  }
};

// -------------------- DOWNLOAD EXCEL SCRIPT --------------------
document.getElementById("downloadExcelBtn").addEventListener("click", () => {
  const subject = document.getElementById("subjectSelect").value;
  if (!subject) {
    alert("Please select a subject first!");
    return;
  }

  // Excel download link
  const link = document.createElement("a");
  link.href = `http://localhost:3000/export-excel/${subject}`;
  link.download = `${subject}_Marks.xlsx`;
  link.click();
});


// ✅ Delete Student Score
document.getElementById("delete-score-btn").onclick = async () => {
  const student = prompt("Enter the student username to delete score:");
  const subject = prompt("Enter the subject to delete score:");
  if (!student || !subject) return alert("⚠ Please enter both username and subject!");

  try {
    const res = await fetch(`${baseURL}/delete-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student, subject })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Score deleted for ${student} in ${subject}.`);
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    console.error(err);
    alert("🚫 Failed to delete score!");
  }
};

// ✅ Download All Subject Toppers Excel
document.getElementById("download-all-toppers-btn").onclick = async () => {
  try {
    const res = await fetch(`${baseURL}/export-toppers`);

    if (res.status === 404) {
      alert("❌ All Subject Score Not Found");
      return;
    }

    // Convert response to file
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "All_Subject_Toppers.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    alert("✅ All Subject Topper File Downloaded!");
  } catch (err) {
    console.error(err);
    alert("🚫 Failed to download topper file!");
  }
};