import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  student_name: string;
  audio_url: string;
  prompt_text: string;
  transcript?: string | null;
  ai_score?: number | null;
  ai_comment?: string | null;
  feedback_audio_url?: string | null;
  created_at: string;
};

type PromptRow = {
  id: string;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
};

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    setStatus("Loading...");

    const { data: submissionData, error: submissionError } = await supabase
      .from("student_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (submissionError) {
      console.error("SUBMISSION LOAD ERROR:", submissionError);
    } else {
      setSubmissions((submissionData || []) as Submission[]);
    }

    const { data: promptData, error: promptError } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });

    if (promptError) {
      console.error("PROMPT LOAD ERROR:", promptError);
    } else {
      setPrompts((promptData || []) as PromptRow[]);
    }

    setStatus("");
  };

  useEffect(() => {
    loadData();
  }, []);

  const createPrompt = async () => {
    const text = newPrompt.trim();

    if (!text) {
      setStatus("Type a prompt first ❌");
      return;
    }

    setStatus("Saving prompt...");

    const { error } = await supabase.from("prompts").insert({
      prompt_text: text,
      is_active: prompts.length === 0,
    });

    if (error) {
      console.error("CREATE PROMPT ERROR:", error);
      setStatus("Could not save prompt ❌");
      return;
    }

    setNewPrompt("");
    setStatus("Prompt saved ✅");
    await loadData();
  };

  const activatePrompt = async (promptId: string) => {
    setStatus("Updating active prompt...");

    const { error: clearError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (clearError) {
      console.error("CLEAR ACTIVE ERROR:", clearError);
      setStatus("Could not clear old active prompt ❌");
      return;
    }

    const { error: setError } = await supabase
      .from("prompts")
      .update({ is_active: true })
      .eq("id", promptId);

    if (setError) {
      console.error("SET ACTIVE ERROR:", setError);
      setStatus("Could not activate prompt ❌");
      return;
    }

    setStatus("Active prompt updated ✅");
    await loadData();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
        padding: "96px 24px 32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "30px",
            boxShadow: "0 20px 60px rgba(15,23,42,0.10)",
            padding: "34px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: "#94a3b8",
              marginBottom: "18px",
            }}
          >
            CLASSROOM PROMPTS
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Type a new prompt"
              style={{
                flex: 1,
                height: "52px",
                borderRadius: "16px",
                border: "1px solid #dbe3f0",
                background: "#f8fafc",
                padding: "0 16px",
                fontSize: "17px",
                color: "#334155",
                outline: "none",
              }}
            />
            <button
              onClick={createPrompt}
              style={{
                height: "52px",
                padding: "0 20px",
                borderRadius: "16px",
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>

          {status && (
            <div
              style={{
                marginBottom: "18px",
                fontSize: "15px",
                color: "#64748b",
              }}
            >
              {status}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                style={{
                  borderRadius: "22px",
                  border: prompt.is_active ? "2px solid #7c9cff" : "1px solid #dbe3f0",
                  background: prompt.is_active ? "#eef4ff" : "#ffffff",
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: prompt.is_active ? "#4663de" : "#334155",
                    lineHeight: 1.35,
                  }}
                >
                  {prompt.prompt_text}
                </div>

                {prompt.is_active ? (
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "999px",
                      border: "2px solid #7c9cff",
                      color: "#4663de",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                ) : (
                  <button
                    onClick={() => activatePrompt(prompt.id)}
                    style={{
                      height: "42px",
                      padding: "0 16px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Use
                  </button>
                )}
              </div>
            ))}

            {prompts.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: "16px" }}>No prompts yet.</div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "30px",
            boxShadow: "0 20px 60px rgba(15,23,42,0.10)",
            padding: "34px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: "#94a3b8",
              marginBottom: "18px",
            }}
          >
            STUDENT SUBMISSIONS
          </div>

          <button
            onClick={loadData}
            style={{
              marginBottom: "20px",
              height: "44px",
              padding: "0 18px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              maxHeight: "70vh",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  borderRadius: "24px",
                  border: "1px solid #dbe3f0",
                  background: "#ffffff",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#0f172a",
                    marginBottom: "8px",
                  }}
                >
                  {s.student_name}
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    marginBottom: "18px",
                  }}
                >
                  "{s.prompt_text}"
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#94a3b8",
                    marginBottom: "8px",
                  }}
                >
                  STUDENT RECORDING
                </div>

                <audio controls src={s.audio_url} style={{ width: "100%", marginBottom: "16px" }} />

                <div style={{ fontSize: "14px", color: "#334155", marginBottom: "10px" }}>
                  <strong>Transcript:</strong> {s.transcript || "..."}
                </div>
                <div style={{ fontSize: "14px", color: "#334155", marginBottom: "10px" }}>
                  <strong>Score:</strong> {s.ai_score ?? "-"}
                </div>
                <div style={{ fontSize: "14px", color: "#334155", marginBottom: "14px" }}>
                  <strong>Comment:</strong> {s.ai_comment || "-"}
                </div>

                <div
                  style={{
                    borderRadius: "20px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#94a3b8",
                      marginBottom: "10px",
                    }}
                  >
                    YOUR FEEDBACK
                  </div>

                  {s.feedback_audio_url ? (
                    <audio controls src={s.feedback_audio_url} style={{ width: "100%" }} />
                  ) : (
                    <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No feedback yet</div>
                  )}
                </div>
              </div>
            ))}

            {submissions.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: "16px" }}>No submissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
