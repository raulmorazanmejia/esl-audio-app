import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import ReliableAudioPlayer from "./ReliableAudioPlayer";

type PromptRow = {
  id: string;
  prompt_text: string | null;
  example_text: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type SubmissionRow = {
  id: string;
  student_name: string | null;
  prompt_text: string | null;
  audio_path: string | null;
  audio_url: string | null;
  status: string | null;
  created_at: string | null;
  feedback_audio_path: string | null;
  feedback_audio_url: string | null;
  feedback_status: string | null;
  feedback_created_at: string | null;
  student_email: string | null;
  student_auth_id: string | null;
  feedback_url: string | null;
  transcript: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  teacher_score: number | null;
  teacher_comment: string | null;
  student_code: string | null;
};

type AnalyzeResponse = {
  transcript?: string | null;
  score?: number | null;
  comment?: string | null;
  error?: string;
};

const ACTIVE_PROMPT_SELECT = "id, prompt_text, example_text, is_active, created_at";
const SUBMISSION_SELECT =
  "id, student_name, prompt_text, audio_path, audio_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, teacher_score, teacher_comment, student_code";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
    padding: "24px",
    boxSizing: "border-box" as const,
  },
  shell: {
    width: "100%",
    maxWidth: "760px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "34px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
    padding: "28px",
  },
  field: {
    width: "100%",
    minHeight: "74px",
    borderRadius: "22px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "0 22px",
    boxSizing: "border-box" as const,
    fontSize: "20px",
    color: "#334155",
    outline: "none",
    textAlign: "center" as const,
  },
  actionButton: {
    width: "100%",
    minHeight: "76px",
    borderRadius: "22px",
    border: "1px solid #dbe3f0",
    background: "#ffffff",
    color: "#1e293b",
    fontSize: "22px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
  },
  sectionTitle: {
    textAlign: "center" as const,
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "0.04em",
    color: "#0f172a",
    margin: "30px 0 20px",
  },
  promptCard: {
    width: "100%",
    borderRadius: "24px",
    border: "1px solid #dbe3f0",
    background: "#f1f5f9",
    padding: "28px 24px",
    boxSizing: "border-box" as const,
    textAlign: "center" as const,
    fontSize: "26px",
    lineHeight: 1.45,
    fontStyle: "italic" as const,
    color: "#334155",
  },
  micButton: {
    width: "220px",
    height: "220px",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
    color: "#ffffff",
    fontSize: "82px",
    cursor: "pointer",
    boxShadow: "0 18px 36px rgba(99, 102, 241, 0.24)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "28px auto 24px",
  },
  submitButton: {
    width: "100%",
    minHeight: "82px",
    borderRadius: "22px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "26px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.18)",
  },
  message: {
    textAlign: "center" as const,
    fontSize: "18px",
    marginTop: "18px",
  },
  card: {
    marginTop: "28px",
    borderRadius: "24px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "22px",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#94a3b8",
    marginBottom: "14px",
  },
  infoText: {
    fontSize: "18px",
    color: "#334155",
    lineHeight: 1.45,
    marginBottom: "12px",
  },
  strong: {
    fontWeight: 800,
    color: "#0f172a",
  },
} as const;

function chooseSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mpeg",
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return "";
}

function fileExtensionFromMime(type: string) {
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function currentTeacherAudio(submission?: SubmissionRow | null) {
  if (!submission) return "";
  return submission.feedback_audio_url || submission.feedback_url || "";
}

export default function StudentView() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [studentCode, setStudentCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [activePrompt, setActivePrompt] = useState<PromptRow | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<SubmissionRow | null>(null);

  const [isFinding, setIsFinding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingMimeType, setRecordingMimeType] = useState("");

  const teacherAudioUrl = useMemo(() => currentTeacherAudio(latestSubmission), [latestSubmission]);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    void fetchActivePrompt();
    return () => {
      stopTracks();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [stopTracks, recordedAudioUrl]);

  async function fetchActivePrompt() {
    const { data, error } = await supabase
      .from("prompts")
      .select(ACTIVE_PROMPT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActivePrompt(data as PromptRow);
    }
  }

  async function lookupStudent() {
    const code = studentCode.trim();
    if (!code) {
      setErrorMessage("Enter your code first.");
      return;
    }

    setIsFinding(true);
    setErrorMessage("");
    setStatusMessage("");

    const { data, error } = await supabase
      .from("student_submissions")
      .select(SUBMISSION_SELECT)
      .eq("student_code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setIsFinding(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data) {
      setLatestSubmission(null);
      setStatusMessage("No previous submission found yet.");
      return;
    }

    const row = data as SubmissionRow;
    setLatestSubmission(row);
    if (!studentName.trim() && row.student_name) setStudentName(row.student_name);
    setStatusMessage("Previous submission found ✅");
  }

  async function startRecording() {
    setErrorMessage("");
    setStatusMessage("");
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = chooseSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordingMimeType(recorder.mimeType || mimeType || "");

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMessage("Recording failed on this device. Please try again.");
        setIsRecording(false);
        stopTracks();
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/mp4";

        if (!chunksRef.current.length) {
          setRecordedBlob(null);
          if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
          setRecordedAudioUrl("");
          setErrorMessage("Recording failed. Please try again.");
          setStatusMessage("");
          stopTracks();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: finalType });
        if (!blob.size) {
          setRecordedBlob(null);
          if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
          setRecordedAudioUrl("");
          setErrorMessage("This device produced an empty recording. Please try again.");
          setStatusMessage("");
          stopTracks();
          return;
        }

        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        const localUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedAudioUrl(localUrl);
        setStatusMessage("Recording ready ✅");
        setErrorMessage("");
        stopTracks();
      };

      recorder.start();
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
      setIsRecording(true);
      setStatusMessage("Recording...");
    } catch (error: any) {
      setErrorMessage(error?.message || "Microphone access failed.");
      setIsRecording(false);
      stopTracks();
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "inactive") return;
    recorder.stop();
    setIsRecording(false);
  }

  async function analyzeAudio(audioUrl: string, promptText: string): Promise<AnalyzeResponse> {
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl,
          audio_url: audioUrl,
          prompt: promptText,
          prompt_text: promptText,
          promptText,
        }),
      });

      if (!response.ok) {
        return { error: "AI analysis failed." };
      }

      return (await response.json()) as AnalyzeResponse;
    } catch {
      return { error: "AI analysis failed." };
    }
  }

  async function submitRecording() {
    const code = studentCode.trim();
    const name = studentName.trim();
    const promptText = activePrompt?.prompt_text?.trim() || "";

    if (!code) {
      setErrorMessage("Enter your code first.");
      return;
    }

    if (!name) {
      setErrorMessage("Enter your name first.");
      return;
    }

    if (!promptText) {
      setErrorMessage("No active prompt found.");
      return;
    }

    if (!recordedBlob) {
      setErrorMessage("Record your answer first.");
      return;
    }

    if (!recordedBlob.size) {
      setErrorMessage("The recording is empty. Please record again.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Uploading...");

    try {
      const mimeType = recordingMimeType || recordedBlob.type || "audio/mp4";
      const ext = fileExtensionFromMime(mimeType);
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filePath = `submissions/${Date.now()}-${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-audio-oai")
        .upload(filePath, recordedBlob, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("student-audio-oai").getPublicUrl(filePath);

      setStatusMessage("Analyzing...");
      const ai = await analyzeAudio(publicUrl, promptText);

      const payload = {
        student_name: name,
        student_code: code,
        prompt_text: promptText,
        audio_path: filePath,
        audio_url: publicUrl,
        status: "submitted",
        transcript: ai.transcript ?? null,
        ai_score: ai.score ?? null,
        ai_comment: ai.comment ?? null,
      };

      const { data, error } = await supabase
        .from("student_submissions")
        .insert(payload)
        .select(SUBMISSION_SELECT)
        .single();

      if (error) throw error;

      setLatestSubmission((data as SubmissionRow) || null);
      setStatusMessage("Done ✅");
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
    } catch (error: any) {
      setErrorMessage(error?.message || "Something broke ❌");
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  const micLabel = isRecording ? "■" : "🎤";
  const primaryFeedbackScore = latestSubmission?.teacher_score ?? latestSubmission?.ai_score;
  const primaryFeedbackComment = latestSubmission?.teacher_comment || latestSubmission?.ai_comment;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <input
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
          placeholder="Your code"
          style={styles.field}
        />

        <button type="button" onClick={() => void lookupStudent()} style={{ ...styles.actionButton, marginTop: "18px" }}>
          {isFinding ? "Finding..." : "Find My Feedback"}
        </button>

        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Your name"
          style={{ ...styles.field, marginTop: "18px" }}
        />

        <div style={styles.sectionTitle}>Speaking Task</div>

        <div style={styles.promptCard}>
          “{activePrompt?.prompt_text || "Loading prompt..."}”
        </div>

        <button
          type="button"
          onClick={isRecording ? stopRecording : () => void startRecording()}
          disabled={isSubmitting}
          style={{
            ...styles.micButton,
            opacity: isSubmitting ? 0.55 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {micLabel}
        </button>

        {recordedAudioUrl ? (
          <div style={styles.card}>
            <ReliableAudioPlayer src={recordedAudioUrl} style={{ width: "100%" }} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void submitRecording()}
          disabled={!recordedBlob || isRecording || isSubmitting}
          style={{
            ...styles.submitButton,
            opacity: !recordedBlob || isRecording || isSubmitting ? 0.6 : 1,
            cursor: !recordedBlob || isRecording || isSubmitting ? "not-allowed" : "pointer",
            marginTop: "22px",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>

        {statusMessage ? (
          <div style={{ ...styles.message, color: "#64748b" }}>{statusMessage}</div>
        ) : null}

        {errorMessage ? (
          <div style={{ ...styles.message, color: "#dc2626", fontWeight: 700 }}>{errorMessage}</div>
        ) : null}

        <div style={styles.card}>
          <div style={styles.cardTitle}>Your latest feedback</div>
          <div style={styles.infoText}>
            <span style={styles.strong}>Transcript:</span> {latestSubmission?.transcript || "No previous submission found yet."}
          </div>
          <div style={styles.infoText}>
            <span style={styles.strong}>Score:</span> {primaryFeedbackScore ?? "—"}
          </div>
          <div style={styles.infoText}>
            <span style={styles.strong}>Comment:</span> {primaryFeedbackComment || "—"}
          </div>
          <div style={{ ...styles.cardTitle, marginTop: "16px" }}>Teacher audio feedback</div>
          {teacherAudioUrl ? (
            <ReliableAudioPlayer src={teacherAudioUrl} style={{ width: "100%" }} />
          ) : (
            <div style={styles.infoText}>No teacher audio yet</div>
          )}
          {latestSubmission?.created_at ? (
            <div style={{ ...styles.infoText, color: "#64748b", marginTop: "12px" }}>
              {formatDate(latestSubmission.created_at)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
