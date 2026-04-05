import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { analyzeSubmission } from "../lib/analyzeSubmission";

type PromptRow = {
  id: string;
  prompt_text: string;
  is_active: boolean;
};

type ExistingSubmission = {
  id: string;
  student_name: string;
  student_code?: string | null;
  prompt_text: string;
  audio_url?: string | null;
  transcript?: string | null;
  ai_score?: number | null;
  ai_comment?: string | null;
  feedback_audio_url?: string | null;
  created_at: string;
};

export default function StudentView() {
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState("Ready");
  const [activePrompt, setActivePrompt] = useState<PromptRow | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<ExistingSubmission | null>(null);

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

      setActivePrompt(data as PromptRow);
    };

    loadPrompt();
  }, []);

  const lookupStudent = async () => {
    const code = studentCode.trim();

    if (!code) {
      setStatus("Enter your code first ❌");
      return;
    }

    setStatus("Checking your feedback...");

    const { data, error } = await supabase
      .from("student_submissions")
      .select("*")
      .eq("student_code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("LOOKUP ERROR:", error);
      setStatus("Could not check your feedback ❌");
      return;
    }

    setLatestSubmission((data as ExistingSubmission | null) || null);

    if (data) {
      setName(data.student_name || "");
      setStatus("Previous submission found ✅");
    } else {
      setStatus("No previous submission found yet.");
    }
  };

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
    if (!audioBlob || !name || !activePrompt || !studentCode.trim()) {
      setStatus("Missing name, code, prompt, or recording ❌");
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
          student_code: studentCode.trim(),
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

      const ai = await analyzeSubmission(
        audioUrl,
        activePrompt.prompt_text,
        insert.data.id
      );

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

      setLatestSubmission({
        ...(insert.data as ExistingSubmission),
        transcript: ai.transcript,
        ai_score: ai.score,
        ai_comment: ai.comment,
        feedback_audio_url: null,
      });

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
          maxWidth: "560px",
          background: "#ffffff",
          borderRadius: "28px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Your Code (example: R10)"
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
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
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        />

        <button
          onClick={lookupStudent}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "14px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#334155",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Find My Feedback
        </button>

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

        {latestSubmission && (
          <div
            style={{
              borderRadius: "20px",
              border: "1px solid #dbe3f0",
              background: "#f8fafc",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#94a3b8" }}>
              YOUR LATEST FEEDBACK
            </div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              <strong>Transcript:</strong> {latestSubmission.transcript || "..."}
            </div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              <strong>Score:</strong> {latestSubmission.ai_score ?? "-"}
            </div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              <strong>Comment:</strong> {latestSubmission.ai_comment || "-"}
            </div>

            <div style={{ fontSize: "14px", fontWeight: 800, color: "#94a3b8", marginTop: "4px" }}>
              TEACHER AUDIO FEEDBACK
            </div>
            {latestSubmission.feedback_audio_url ? (
              <audio controls src={latestSubmission.feedback_audio_url} style={{ width: "100%" }} />
            ) : (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No teacher audio yet</div>
            )}
          </div>
        )}

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
