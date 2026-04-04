import { useState } from "react";
import StudentView from "./components/StudentView";
import TeacherDashboard from "./components/TeacherDashboard";

const TEACHER_PASSWORD = "teach123";

export default function App() {
  const [view, setView] = useState<"student" | "teacher">("student");
  const [teacherUnlocked, setTeacherUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const openTeacher = () => {
    setView("teacher");
    setPasswordError("");
  };

  const unlockTeacher = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setTeacherUnlocked(true);
      setPasswordError("");
      setPasswordInput("");
    } else {
      setPasswordError("Wrong password ❌");
    }
  };

  const backToStudent = () => {
    setView("student");
    setPasswordError("");
    setPasswordInput("");
  };

  return (
    <div>
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "10px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={backToStudent}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: view === "student" ? "#0f172a" : "#ffffff",
            color: view === "student" ? "#ffffff" : "#334155",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Student
        </button>

        <button
          onClick={openTeacher}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: view === "teacher" ? "#0f172a" : "#ffffff",
            color: view === "teacher" ? "#ffffff" : "#334155",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Teacher
        </button>
      </div>

      {view === "student" && <StudentView />}

      {view === "teacher" && !teacherUnlocked && (
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "28px",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Teacher Access
            </div>

            <div
              style={{
                textAlign: "center",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              Enter the teacher password
            </div>

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") unlockTeacher();
              }}
              style={{
                width: "100%",
                height: "54px",
                borderRadius: "16px",
                border: "1px solid #dbe3f0",
                background: "#f8fafc",
                fontSize: "18px",
                textAlign: "center",
                color: "#334155",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={unlockTeacher}
              style={{
                width: "100%",
                height: "54px",
                borderRadius: "16px",
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
              }}
            >
              Enter
            </button>

            <div
              style={{
                textAlign: "center",
                minHeight: "24px",
                color: passwordError ? "#dc2626" : "#64748b",
                fontSize: "15px",
              }}
            >
              {passwordError || " "}
            </div>
          </div>
        </div>
      )}

      {view === "teacher" && teacherUnlocked && <TeacherDashboard />}
    </div>
  );
}
