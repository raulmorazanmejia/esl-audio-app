import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import StudentView from "./components/StudentView";
import TeacherDashboard from "./components/TeacherDashboard";
import { supabase } from "./lib/supabase";

function getModeFromUrl(): "student" | "teacher" {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "teacher" ? "teacher" : "student";
}

export default function App() {
  const [view, setView] = useState<"student" | "teacher">(getModeFromUrl());
  const [teacherSession, setTeacherSession] = useState<Session | null>(null);
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
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setTeacherSession(data.session ?? null);
      setIsAuthLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTeacherSession(session ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInTeacher = async () => {
    const email = emailInput.trim();
    if (!email || !passwordInput) {
      setAuthError("Enter both email and password.");
      return;
    }

    setIsSigningIn(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    });

    if (error) {
      setAuthError(error.message);
      setIsSigningIn(false);
      return;
    }

    setPasswordInput("");
    setIsSigningIn(false);
  };

  const signOutTeacher = async () => {
    await supabase.auth.signOut();
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

      {view === "teacher" && !teacherSession && (
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

            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Teacher email"
              onKeyDown={(e) => {
                if (e.key === "Enter") void signInTeacher();
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
              autoComplete="email"
            />

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void signInTeacher();
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
              autoComplete="current-password"
            />

            <button
              onClick={() => void signInTeacher()}
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

      {view === "teacher" && teacherSession && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={() => void signOutTeacher()}
              style={{
                height: "42px",
                padding: "0 18px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Logout teacher
            </button>
          </div>
          <TeacherDashboard />
        </>
      )}
    </div>
  );
}
