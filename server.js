const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// -------------------- FILE PATHS --------------------
const questionsFile = path.join(__dirname, "questions.json");
const scoresFile = path.join(__dirname, "scores.json");
const permissionFile = path.join(__dirname, "studentPermission.json");

// -------------------- LOAD QUESTIONS --------------------
let questions = {};
if (fs.existsSync(questionsFile)) {
  try {
    questions = JSON.parse(fs.readFileSync(questionsFile, "utf8") || "{}");
  } catch (err) {
    console.error("⚠ Error reading questions.json:", err);
    questions = {};
  }
} else {
  fs.writeFileSync(questionsFile, JSON.stringify({}, null, 2));
}

// -------------------- LOAD SCORES --------------------
let scores = [];
if (fs.existsSync(scoresFile)) {
  try {
    scores = JSON.parse(fs.readFileSync(scoresFile, "utf8") || "[]");
  } catch (err) {
    console.error("⚠ Error reading scores.json:", err);
    scores = [];
  }
} else {
  fs.writeFileSync(scoresFile, JSON.stringify([], null, 2));
}

// -------------------- LOAD PER-STUDENT PERMISSION --------------------
let studentPermission = {};
if (fs.existsSync(permissionFile)) {
  try {
    studentPermission = JSON.parse(fs.readFileSync(permissionFile, "utf8") || "{}");
  } catch {
    studentPermission = {};
  }
} else {
  fs.writeFileSync(permissionFile, JSON.stringify({}, null, 2));
}

// -------------------- USERS --------------------
const users = {
  student1: { password: "1234", role: "student" },
  gunjan: { password: "gayal123", role: "student" },
  student2: { password: "abcd", role: "student" },
  harshita: { password: "harshita123", role: "student" },
  student3: { password: "efgh", role: "student" },
  pooja: { password: "pooja123", role: "student" },
  geeta: { password: "geeta123", role: "student" },
  garima: { password: "garima123", role: "student" },
  kavita: { password: "kavita123", role: "student" },
  gunjangayal: { password: "gayal2005", role: "student" },

  teacher1: { password: "admin", role: "teacher" },
  MamtaPandey: { password: "Pandey", role: "teacher" },
  PreetiArya: { password: "Preeti", role: "teacher" },
  ParulBajetha: { password: "Parul", role: "teacher" },
  Sivali: { password: "Sivali", role: "teacher" },
};

// -------------------- LOGIN --------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    return res.json({ success: true, role: user.role });
  } else {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ------------------ GET SUBJECTS --------------
app.get("/subjects", (req, res) => {
  res.json({ success: true, subjects: Object.keys(questions) });
});

// -------------------- GET QUESTIONS --------------------
app.get("/questions/:subject/:student", (req, res) => {
  const { subject, student } = req.params;
  const hasGivenTest = scores.some(s => s.username === student && s.subject === subject);

  if (!hasGivenTest) {
    const qset = questions[subject] || [];
    return res.json({ success: true, questions: qset });
  }

  if (!studentPermission[student] || studentPermission[student][subject] !== true) {
    return res.json({ success: false, message: "❌ No permission to take this retest." });
  }

  const qset = questions[subject] || [];
  res.json({ success: true, questions: qset });
});

// -------------------- ADD QUESTION --------------------
app.post("/add-question", (req, res) => {
  const { subject, q, options, answer } = req.body;
  if (!subject || !q || !options || !answer)
    return res.status(400).json({ success: false, message: "Invalid data" });

  if (!questions[subject]) questions[subject] = [];
  questions[subject].push({ q, options, answer });

  fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2));
  res.json({ success: true, message: "✅ Question added successfully!" });
});

// -------------------- ADD USER --------------------
app.post("/add-user", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ success: false, message: "Missing data" });

  if (users[username])
    return res.json({ success: false, message: "User already exists!" });

  users[username] = { password, role };
  res.json({ success: true, message: `User ${username} added successfully!` });
});


// -------------------- ADD NEW SUBJECT --------------------
app.post("/add-subject", (req, res) => {
  const { subject } = req.body;

  if (!subject)
    return res.status(400).json({ success: false, message: "Subject name required!" });

  if (questions[subject])
    return res.json({ success: false, message: "Subject already exists!" });

  questions[subject] = [];

  fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2));

  res.json({ success: true, message: "Subject added!" });
});


// -------------------- RESET SCORES OF SELECTED SUBJECT --------------------
app.post("/reset-subject-scores", (req, res) => {
  const { subject } = req.body;

  if (!subject)
    return res.json({ success: false, message: "Subject name required!" });

  // Remove only selected subject scores
  scores = scores.filter(entry => entry.subject !== subject);

  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));

  res.json({ success: true, message: "Subject scores reset!" });
});
// -------------------- SAVE STUDENT SCORE --------------------
app.post("/save-score", (req, res) => {
  const { username, subject, score, total, percentage } = req.body;
  if (!username || !subject || total === undefined)
    return res.status(400).json({ success: false, message: "Invalid data" });

  const date = new Date().toLocaleString();
  scores.push({ username, subject, score, total, percentage: Number(percentage), date });
  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));

  if (studentPermission[username] && studentPermission[username][subject]) {
    studentPermission[username][subject] = false;
    fs.writeFileSync(permissionFile, JSON.stringify(studentPermission, null, 2));
  }

  res.json({ success: true, message: "Score saved!" });
});

// -------------------- VIEW ALL SCORES --------------------
app.get("/scores", (req, res) => {
  res.json({ success: true, scores });
});

// -------------------- DELETE STUDENT SCORE --------------------
app.post("/delete-score", (req, res) => {
  const { student, subject } = req.body;
  if (!student || !subject)
    return res.status(400).json({ success: false, message: "Missing student or subject!" });

  const beforeCount = scores.length;
  scores = scores.filter(s => !(s.username === student && s.subject === subject));

  if (scores.length === beforeCount)
    return res.json({ success: false, message: "No score found for this student and subject!" });

  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));
  res.json({ success: true, message: "Score deleted successfully!" });
});

// -------------------- TOGGLE PERMISSION --------------------
app.post("/toggle-permission", (req, res) => {
  const { student, subject } = req.body;
  if (!student || !subject) return res.status(400).json({ success: false, message: "Missing data" });

  if (!studentPermission[student]) studentPermission[student] = {};
  studentPermission[student][subject] = !studentPermission[student][subject];

  fs.writeFileSync(permissionFile, JSON.stringify(studentPermission, null, 2));
  res.json({ success: true, allowed: studentPermission[student][subject] });
});

// -------------------- EXPORT EXCEL PER SUBJECT --------------------
app.get("/export-excel/:subject", async (req, res) => {
  const { subject } = req.params;

  const subjectScores = scores
    .filter(s => s.subject === subject)
    .map(s => ({ ...s, score: Number(s.score) || 0 }));

  if (subjectScores.length === 0) return res.status(404).send("No scores found for this subject");

  // Sort descending
  subjectScores.sort((a, b) => b.score - a.score);

  const topper = subjectScores[0];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(subject);

  sheet.columns = [
    { header: "Student Name", key: "username", width: 25 },
    { header: "Subject", key: "subject", width: 25 },
    { header: "Score", key: "score", width: 10 },
    { header: "Total", key: "total", width: 10 },
    { header: "Percentage", key: "percentage", width: 15 },
    { header: "Date", key: "date", width: 20 },
    { header: "Remarks", key: "remarks", width: 15 }
  ];

  subjectScores.forEach((s) => {
    let remark = "";
    if (topper && s.username === topper.username) remark = "🏆 Topper";

    const row = sheet.addRow({ ...s, remarks: remark });

    if (topper && s.username === topper.username) {
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
        cell.font = { bold: true };
      });
      row.getCell("username").font = { color: { argb: "FF0000" }, bold: true };
    }
  });

  const timestamp = Date.now();
  const fileName = `${subject}_Scores_${timestamp}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `inline; filename=${fileName}`);
  res.send(buffer);
});

// -------------------- EXPORT TOPPERS PER SUBJECT --------------------
// -------------------- EXPORT TOPPERS PER SUBJECT --------------------
app.get("/export-toppers", async (req, res) => {
  try {
    if (!scores || scores.length === 0) {
      return res.status(404).send("No score data found!");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Subject Toppers");

    // Column setup
    sheet.columns = [
      { header: "Rank", key: "rank", width: 6 },
      { header: "Student Name", key: "username", width: 30 },
      { header: "Score", key: "score", width: 10 },
      { header: "Percentage", key: "percentage", width: 15 }
    ];

    // Get all unique subjects
    const subjects = [...new Set(scores.map(s => s.subject))];

    for (const subject of subjects) {

      // Subject Header
      const titleRow = sheet.addRow([`Subject: ${subject}`]);
      titleRow.font = { bold: true, size: 14 };
      sheet.addRow([]); // spacing

      // Filter scores for this subject and convert percentage to number
      const subjectScores = scores
        .filter(s => s.subject === subject)
        .map(s => ({
          username: s.username,
          score: Number(s.score) || 0,
          percentage: Number(s.percentage) || 0
        }));

      if (subjectScores.length === 0) continue;

      // Sort descending (highest score first)
      subjectScores.sort((a, b) => b.score - a.score);

      // Take top 5
      const top5 = subjectScores.slice(0, 5);

      top5.forEach((s, index) => {
        sheet.addRow({
          rank: index + 1,
          username: s.username,
          score: s.score,
          percentage: s.percentage
        });
      });

      sheet.addRow([]); // spacing between subjects
    }

    // Send Excel file
    const timestamp = Date.now();
    const fileName = `All_Subject_Toppers_${timestamp}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
res.setHeader("Content-Disposition", `inline; filename=${fileName}`);
res.send(buffer);
  } catch (error) {
    console.error("Error exporting toppers:", error);
    res.status(500).send("Failed to export toppers");
  }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));