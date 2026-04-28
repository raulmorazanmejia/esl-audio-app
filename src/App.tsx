import { useEffect, useState } from "react";
import StudentView from "./components/StudentView";
import TeacherDashboard from "./components/TeacherDashboard";
import { clearTeacherSession, getTeacherSessionStatus } from "./lib/teacherAuth";

function getModeFromUrl(): "student" | "teacher" {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "teacher" ? "teacher" : "student";
}

export default function App() {
  const [view, setView] = useState<"student" | "teacher">(getModeFromUrl());
  const [hasTeacherSession, setHasTeacherSession] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const switchMode = (newMode: "student" | "teacher") => {
    setView(newMode);
    window.history.pushState({}, "", `/?mode=${newMode}`);
    setAuthError("");
  };

  useEffect(() => {
    void (async () => {
      try {
        const authenticated = await getTeacherSessionStatus();
        setHasTeacherSession(authenticated);
      } catch {
        setHasTeacherSession(false);
      } finally {
        setIsAuthLoading(false);
      }
    })();
  }, []);

  const signInTeacher = async () => {
    if (!passwordInput) {
      setAuthError("Enter your password.");
      return;
    }

    setIsSigningIn(true);
    setAuthError("");

    try {
      const response = await fetch("/api/teacher-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
      });

      const payload = (await response.json()) as { error?: string; authenticated?: boolean };

      if (!response.ok || !payload?.authenticated) {
        setAuthError(payload?.error || "Incorrect email or password");
        setIsSigningIn(false);
        return;
      }

      setHasTeacherSession(true);
      setPasswordInput("");
      setAuthError("");
      setIsSigningIn(false);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setAuthError(error.message);
      } else {
        setAuthError("Could not contact server. Please try again.");
      }
      setIsSigningIn(false);
    }
  };

  const signOutTeacher = async () => {
    await clearTeacherSession();
    setHasTeacherSession(false);
    setPasswordInput("");
    setAuthError("");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <a
          href="/?mode=student"
          onClick={(e) => {
            e.preventDefault();
            switchMode("student");
          }}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: view === "student" ? "#0f172a" : "#ffffff",
            color: view === "student" ? "#ffffff" : "#334155",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Student
        </a>

        <a
          href="/?mode=teacher"
          onClick={(e) => {
            e.preventDefault();
            switchMode("teacher");
          }}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: view === "teacher" ? "#0f172a" : "#ffffff",
            color: view === "teacher" ? "#ffffff" : "#334155",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Teacher
        </a>
      </div>

      {view === "student" && <StudentView />}

      {view === "teacher" && !hasTeacherSession && (
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
              Sign in with your teacher email and password
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void signInTeacher();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              <input
                type="email"
                name="username"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Teacher email"
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
                autoComplete="username"
              />

              <input
                type="password"
                name="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
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
                autoComplete="current-password"
              />

              <button
                type="submit"
                disabled={isSigningIn || isAuthLoading}
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
                  opacity: isSigningIn || isAuthLoading ? 0.6 : 1,
                }}
              >
                {isSigningIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                minHeight: "24px",
                color: authError ? "#dc2626" : "#64748b",
                fontSize: "15px",
              }}
            >
              {isAuthLoading ? "Checking teacher session..." : authError || " "}
            </div>
          </div>
        </div>
      )}

      {view === "teacher" && hasTeacherSession && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={() => {
                void signOutTeacher();
              }}
              style={{
                border: "none",
                background: "#e2e8f0",
                color: "#0f172a",
                padding: "10px 18px",
                borderRadius: "999px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign out teacher
            </button>
          </div>

          <TeacherDashboard />
        </>
      )}
    </div>
  );
}
