Replace these full files in GitHub.

---

# 1) `src/components/TeacherDashboard.tsx`

```tsx
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    const [{ data: submissionData, error: submissionError }, { data: promptData, error: promptError }] =
      await Promise.all([
        supabase
          .from("student_submissions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("prompts")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

    if (submissionError) {
      console.error("SUBMISSION LOAD ERROR:", submissionError);
      setMessage("Could not load submissions ❌");
    } else {
      setSubmissions(submissionData || []);
    }

    if (promptError) {
      console.error("PROMPT LOAD ERROR:", promptError);
      setMessage("Could not load prompts ❌");
    } else {
      setPrompts(promptData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createPrompt = async () => {
    const text = newPrompt.trim();
    if (!text) {
      setMessage("Type a prompt first ❌");
      return;
    }

    setMessage("Saving prompt...");

    const { error } = await supabase.from("prompts").insert({
      prompt_text: text,
      is_active: prompts.length === 0,
    });

    if (error) {
      console.error("CREATE PROMPT ERROR:", error);
      setMessage("Could not save prompt ❌");
      return;
    }

    setNewPrompt("");
    setMessage("Prompt saved ✅");
    loadData();
  };

  const activatePrompt = async (promptId: string) => {
    setMessage("Updating active prompt...");

    const { error: clearError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (clearError) {
      console.error("CLEAR ACTIVE PROMPT ERROR:", clearError);
      setMessage("Could not clear old prompt ❌");
      return;
    }

    const { error: setError } = await supabase
      .from("prompts")
      .update({ is_active: true })
      .eq("id", promptId);

    if (setError) {
      console.error("SET ACTIVE PROMPT ERROR:", setError);
      setMessage("Could not activate prompt ❌");
      return;
    }

    setMessage("Active prompt updated ✅");
    loadData();
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
          gridTemplateColumns: "1.1fr 1fr",
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
              marginBottom: "22px",
            }}
          >
            CLASSROOM PROMPTS
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
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
                color: "white",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>

          {message && (
            <div
              style={{
                marginBottom: "18px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              {message}
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
                  padding: "22px 26px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
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

            {prompts.length === 0 && !loading && (
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
              marginBottom: "22px",
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

          <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxHeight: "70vh", overflowY: "auto", paddingRight: "4px" }}>
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
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                  {s.student_name}
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    marginBottom: "20px",
                  }}
                >
                  "{s.prompt_text}"
                </div>

                <div style={{ fontSize: "14px", fontWeight: 800, color: "#94a3b8", marginBottom: "8px" }}>
                  STUDENT RECORDING
                </div>
                <audio controls src={s.audio_url} style={{ width: "100%", marginBottom: "18px" }} />

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
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#94a3b8", marginBottom: "10px" }}>
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

            {submissions.length === 0 && !loading && (
              <div style={{ color: "#94a3b8", fontSize: "16px" }}>No submissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# 2) `src/components/StudentView.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { analyzeSubmission } from "../lib/analyzeSubmission";

type PromptRow = {
  id: string;
  prompt_text: string;
  is_active: boolean;
};

export default function StudentView() {
  const [name, setName] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState("Ready");
  const [activePrompt, setActivePrompt] = useState<PromptRow | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const loadPrompt = async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (error) {
        console.error("ACTIVE PROMPT ERROR:", error);
        return;
      }

      setActivePrompt(data);
    };

    loadPrompt();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioURL(url);
        setStatus("Recording complete");
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording...");
    } catch (err) {
      console.error("MIC ERROR:", err);
      setStatus("Mic failed ❌");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!audioBlob || !name || !activePrompt) {
      setStatus("Missing name, prompt, or recording ❌");
      return;
    }

    try {
      setStatus("Uploading...");

      const safeName = name.trim().replace(/\s+/g, "-").toLowerCase();
      const fileName = `submissions/${Date.now()}-${safeName}.webm`;

      const uploadRes = await supabase.storage
        .from("Student-audio")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadRes.error) {
        console.error("UPLOAD ERROR FULL:", JSON.stringify(uploadRes.error, null, 2));
        setStatus("Upload failed ❌");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("Student-audio")
        .getPublicUrl(fileName);

      const audioUrl = publicData.publicUrl;

      setStatus("Saving...");

      const insert = await supabase
        .from("student_submissions")
        .insert({
          student_name: name.trim(),
          prompt_text: activePrompt.prompt_text,
          audio_path: fileName,
          audio_url: audioUrl,
          status: "submitted",
          student_email: null,
          student_auth_id: null,
        })
        .select()
        .single();

      if (insert.error || !insert.data) {
        console.error("INSERT ERROR FULL:", JSON.stringify(insert.error, null, 2));
        console.error("INSERT DATA:", insert.data);
        setStatus("Insert failed ❌");
        return;
      }

      setStatus("Analyzing...");

      const ai = await analyzeSubmission(audioUrl, activePrompt.prompt_text, insert.data.id);

      if (!ai) {
        setStatus("AI failed ❌");
        return;
      }

      const update = await supabase
        .from("student_submissions")
        .update({
          transcript: ai.transcript,
          ai_score: ai.score,
          ai_comment: ai.comment,
        })
        .eq("id", insert.data.id);

      if (update.error) {
        console.error("UPDATE ERROR FULL:", JSON.stringify(update.error, null, 2));
        setStatus("Update failed ❌");
        return;
      }

      setStatus("Done ✅");
    } catch (err) {
      console.error("UNEXPECTED ERROR FULL:", err);
      setStatus("Something broke ❌");
    }
  };

  return (
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
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "28px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            height: "54px",
            borderRadius: "16px",
            border: "1px solid #dbe3f0",
            background: "#f8fafc",
            fontSize: "20px",
            textAlign: "center",
            color: "#334155",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            textAlign: "center",
            fontSize: "24px",
            fontWeight: 800,
            letterSpacing: "0.03em",
            color: "#0f172a",
          }}
        >
          SPEAKING TASK
        </div>

        <div
          style={{
            background: "#f1f5f9",
            border: "1px solid #dbe3f0",
            borderRadius: "18px",
            padding: "22px",
            textAlign: "center",
            fontSize: "18px",
            fontStyle: "italic",
            color: "#334155",
            lineHeight: 1.5,
            minHeight: "82px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {activePrompt ? `"${activePrompt.prompt_text}"` : "Loading prompt..."}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          {!recording ? (
            <button
              onClick={startRecording}
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(135deg, #4f6cf7 0%, #3b5bdb 100%)",
                color: "#ffffff",
                fontSize: "42px",
                cursor: "pointer",
                boxShadow: "0 16px 30px rgba(79, 108, 247, 0.35)",
              }}
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "999px",
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 16px 30px rgba(239, 68, 68, 0.3)",
              }}
            >
              STOP
            </button>
          )}
        </div>

        {audioURL && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "18px",
              padding: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <audio controls src={audioURL} style={{ width: "100%" }} />
          </div>
        )}

        <button
          onClick={submit}
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
          Submit
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: "18px",
            color: "#64748b",
            minHeight: "24px",
          }}
        >
          {status}
        </div>
      </div>
    </div>
  );
}
```
