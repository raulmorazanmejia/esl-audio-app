import { useState } from "react";
import StudentView from "./components/StudentView";
import TeacherDashboard from "./components/TeacherDashboard";

export default function App() {
  const [view, setView] = useState<"student" | "teacher">("student");

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => setView("student")}>Student</button>
      <button onClick={() => setView("teacher")}>Teacher</button>

      {view === "student" ? <StudentView /> : <TeacherDashboard />}
    </div>
  );
}
