import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

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

const SUBMISSION_SELECT =
  "id, student_name, prompt_text, audio_path, audio_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, teacher_score, teacher_comment, student_code";

type DraftState = {
  score: number;
  comment: string;
  savingOverride: boolean;
  savingAudio: boolean;
  savedMessage: string;
  error: string;
  teacherBlob: Blob | null;
  teacherPreviewUrl: string;
  isRecordingTeacher: boolean;
  recordingError: string;
};

type DraftsById = Record<string, DraftState>;

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
    padding: "24px",
    boxSizing: "border-box" as const,
    color: "#0f172a",
  },
  container: {
    maxWidth: "1360px",
    margin: "0 auto",
  },
  topToggle: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  toggleButton: {
    height: "56px",
    padding: "0 28px",
    borderRadius: "18px",
    border: "1px solid #cbd5e1",
    fontSize: "18px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "420px minmax(0, 1fr)",
    gap: "24px",
    alignItems: "start",
  },
  panel: {
    background: "#ffffff",
    borderRadius: "30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
    padding: "28px",
  },
  panelLabel: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.14em",
    color: "#94a3b8",
    marginBottom: "18px",
  },
  promptInputRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
  },
  promptInput: {
    flex: 1,
    minHeight: "56px",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "0 18px",
    fontSize: "18px",
    color: "#334155",
    outline: "none",
  },
  primaryButton: {
    minHeight: "56px",
    borderRadius: "18px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 800,
    padding: "0 22px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
  },
  secondaryButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "16px",
    fontWeight: 800,
    padding: "0 18px",
    cursor: "pointer",
  },
  promptCard: {
    borderRadius: "26px",
    border: "1px solid #e2e8f0",
    padding: "20px",
    marginBottom: "16px",
  },
  promptTitle: {
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: 1.35,
    marginBottom: "14px",
  },
  exampleBox: {
    borderRadius: "18px",
    background: "#f8fafc",
    padding: "14px 16px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.45,
    marginTop: "12px",
  },
  submissionsScroller: {
    maxHeight: "78vh",
    overflowY: "auto" as const,
    paddingRight: "4px",
  },
  submissionCard: {
    borderRadius: "28px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "24px",
    marginBottom: "22px",
  },
  studentCode: {
    fontSize: "42px",
    fontWeight: 900,
    lineHeight: 1,
    color: "#0f172a",
  },
  studentName: {
    marginTop: "8px",
    fontSize: "18px",
    color: "#64748b",
  },
  pillRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "6px 12px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  promptBanner: {
    marginTop: "18px",
    marginBottom: "18px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "18px 20px",
    fontSize: "18px",
    fontStyle: "italic" as const,
    color: "#334155",
  },
  sectionBox: {
    borderRadius: "22px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "20px",
    marginBottom: "18px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#94a3b8",
    marginBottom: "12px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "18px",
  },
  bodyText: {
    fontSize: "18px",
    lineHeight: 1.45,
    color: "#334155",
  },
  labelStrong: {
    fontWeight: 800,
    color: "#0f172a",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap" as const,
    marginBottom: "14px",
  },
  slider: {
    width: "100%",
    marginBottom: "18px",
  },
  textarea: {
    width: "100%",
    minHeight: "108px",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "14px 16px",
    fontSize: "18px",
    color: "#334155",
    lineHeight: 1.4,
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    outline: "none",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap" as const,
    marginTop: "14px",
  },
  helper: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  success: {
    fontSize: "14px",
    color: "#059669",
    fontWeight: 700,
  },
  error: {
    fontSize: "14px",
    color: "#dc2626",
    fontWeight: 700,
  },
  audioWrap: {
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "14px",
    marginTop: "10px",
  },
} as const;

function clampButton(disabled?: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...(extra || {}),
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function buildAudioLabel(url?: string | null) {
  return url ? "Saved teacher audio" : "No saved teacher audio yet";
}

function buildDraft(row: SubmissionRow, previous?: Partial<DraftState>): DraftState {
  return {
    score: previous?.score ?? clampScore(row.teacher_score ?? row.ai_score ?? 3),
    comment: previous?.comment ?? row.teacher_comment ?? row.ai_comment ?? "",
    savingOverride: false,
    savingAudio: false,
    savedMessage: previous?.savedMessage ?? "",
    error: "",
    teacherBlob: previous?.teacherBlob ?? null,
    teacherPreviewUrl: previous?.teacherPreviewUrl ?? "",
    isRecordingTeacher: false,
    recordingError: "",
  };
}

export default function TeacherDashboard() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSubmissionIdRef = useRef<string | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [drafts, setDrafts] = useState<DraftsById>({});
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [prompts]);

  const stopRecorderAndTracks = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecorderAndTracks();
    };
  }, [stopRecorderAndTracks]);

  useEffect(() => {
    return () => {
      Object.values(drafts).forEach((draft) => {
        if (draft.teacherPreviewUrl) URL.revokeObjectURL(draft.teacherPreviewUrl);
      });
    };
  }, []);

  const hydrateDrafts = useCallback((rows: SubmissionRow[]) => {
    setDrafts((prev) => {
      const next: DraftsById = {};
      for (const row of rows) {
        next[row.id] = buildDraft(row, prev[row.id]);
      }
      Object.keys(prev).forEach((id) => {
        if (!next[id] && prev[id]?.teacherPreviewUrl) {
          URL.revokeObjectURL(prev[id].teacherPreviewUrl);
        }
      });
      return next;
    });
  }, []);

  const fetchPrompts = useCallback(async () => {
    setPromptError("");
    const { data, error } = await supabase
      .from("prompts")
      .select("id, prompt_text, example_text, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setPromptError(error.message);
      return;
    }
    const rows = (data ?? []) as PromptRow[];
    setPrompts(rows);
    const active = rows.find((row) => row.is_active);
    setSelectedPromptId(active?.id ?? null);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    setSubmissionsError("");
    const { data, error } = await supabase
      .from("student_submissions")
      .select(SUBMISSION_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      setSubmissionsError(error.message);
      setIsLoadingSubmissions(false);
      return;
    }
    const rows = (data ?? []) as SubmissionRow[];
    setSubmissions(rows);
    hydrateDrafts(rows);
    setIsLoadingSubmissions(false);
  }, [hydrateDrafts]);

  useEffect(() => {
    void fetchPrompts();
    void fetchSubmissions();
  }, [fetchPrompts, fetchSubmissions]);

  async function handleSavePrompt() {
    const text = newPrompt.trim();
    if (!text) return;
    setIsSavingPrompt(true);
    setPromptError("");
    const { error } = await supabase.from("prompts").insert({
      prompt_text: text,
      is_active: false,
    });
    if (error) {
      setPromptError(error.message);
      setIsSavingPrompt(false);
      return;
    }
    setNewPrompt("");
    setIsSavingPrompt(false);
    await fetchPrompts();
  }

  async function handleUsePrompt(promptId: string) {
    setPromptError("");
    const { error: deactivateError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deactivateError) {
      setPromptError(deactivateError.message);
      return;
    }
    const { error: activateError } = await supabase.from("prompts").update({ is_active: true }).eq("id", promptId);
    if (activateError) {
      setPromptError(activateError.message);
      return;
    }
    setSelectedPromptId(promptId);
    await fetchPrompts();
  }

  function updateDraft(id: string, patch: Partial<DraftState>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          score: 3,
          comment: "",
          savingOverride: false,
          savingAudio: false,
          savedMessage: "",
          error: "",
          teacherBlob: null,
          teacherPreviewUrl: "",
          isRecordingTeacher: false,
          recordingError: "",
        }),
        ...patch,
      },
    }));
  }

  async function handleSaveOverride(submission: SubmissionRow) {
    const draft = drafts[submission.id];
    if (!draft) return;
    updateDraft(submission.id, { savingOverride: true, savedMessage: "", error: "" });
    const { data, error } = await supabase
      .from("student_submissions")
      .update({ teacher_score: clampScore(draft.score), teacher_comment: draft.comment.trim() })
      .eq("id", submission.id)
      .select(SUBMISSION_SELECT)
      .single();
    if (error) {
      updateDraft(submission.id, { savingOverride: false, error: error.message });
      return;
    }
    setSubmissions((prev) => prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row)));
    updateDraft(submission.id, { savingOverride: false, savedMessage: "Override saved ✅", error: "" });
  }

  async function startTeacherRecording(submissionId: string) {
    const current = activeSubmissionIdRef.current;
    if (current && current !== submissionId) {
      updateDraft(current, { isRecordingTeacher: false, recordingError: "Stopped because another recording started." });
      stopRecorderAndTracks();
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = getMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      activeSubmissionIdRef.current = submissionId;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const targetId = activeSubmissionIdRef.current || submissionId;
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        setDrafts((prev) => {
          const existing = prev[targetId];
          if (!existing) return prev;
          if (existing.teacherPreviewUrl) URL.revokeObjectURL(existing.teacherPreviewUrl);
          return {
            ...prev,
            [targetId]: {
              ...existing,
              teacherBlob: blob,
              teacherPreviewUrl: URL.createObjectURL(blob),
              isRecordingTeacher: false,
              recordingError: "",
              savedMessage: "Teacher audio recorded. Save it when ready.",
              error: "",
            },
          };
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        activeSubmissionIdRef.current = null;
      };
      updateDraft(submissionId, { isRecordingTeacher: true, recordingError: "", savedMessage: "", error: "" });
      recorder.start();
    } catch (error: any) {
      updateDraft(submissionId, { isRecordingTeacher: false, recordingError: error?.message || "Microphone access failed." });
    }
  }

  function stopTeacherRecording(submissionId: string) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || activeSubmissionIdRef.current !== submissionId) return;
    if (recorder.state === "inactive") return;
    recorder.stop();
  }

  function clearTeacherRecording(submissionId: string) {
    setDrafts((prev) => {
      const existing = prev[submissionId];
      if (!existing) return prev;
      if (existing.teacherPreviewUrl) URL.revokeObjectURL(existing.teacherPreviewUrl);
      return {
        ...prev,
        [submissionId]: {
          ...existing,
          teacherBlob: null,
          teacherPreviewUrl: "",
          recordingError: "",
          savedMessage: "Teacher audio cleared.",
          error: "",
        },
      };
    });
  }

  async function handleSaveTeacherAudio(submission: SubmissionRow) {
    const draft = drafts[submission.id];
    if (!draft?.teacherBlob) {
      updateDraft(submission.id, { error: "Record teacher audio first.", savedMessage: "" });
      return;
    }
    updateDraft(submission.id, { savingAudio: true, savedMessage: "", error: "" });
    try {
      const mimeType = draft.teacherBlob.type || "audio/webm";
      const ext = getFileExtension(mimeType);
      const filePath = `${submission.id}/teacher-feedback-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("teacher-audio").upload(filePath, draft.teacherBlob, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("teacher-audio").getPublicUrl(filePath);
      const { data, error } = await supabase
        .from("student_submissions")
        .update({
          feedback_audio_path: filePath,
          feedback_audio_url: publicUrl,
          feedback_url: publicUrl,
          feedback_status: "saved",
          feedback_created_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .select(SUBMISSION_SELECT)
        .single();
      if (error) throw error;
      setSubmissions((prev) => prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row)));
      updateDraft(submission.id, { savingAudio: false, savedMessage: "Teacher audio saved ✅", error: "" });
    } catch (error: any) {
      updateDraft(submission.id, { savingAudio: false, error: error?.message || "Teacher audio upload failed." });
    }
  }

  const toggleBase = styles.toggleButton;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topToggle}>
          <button type="button" style={{ ...toggleBase, background: "#ffffff", color: "#334155" }}>
            Student
          </button>
          <button type="button" style={{ ...toggleBase, background: "#0f172a", color: "#ffffff", border: "none" }}>
            Teacher
          </button>
        </div>

        <div style={styles.grid}>
          <section style={styles.panel}>
            <div style={styles.panelLabel}>Classroom prompts</div>
            <div style={styles.promptInputRow}>
              <input
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Type a new prompt"
                style={styles.promptInput}
              />
              <button type="button" onClick={() => void handleSavePrompt()} disabled={isSavingPrompt} style={clampButton(isSavingPrompt, styles.primaryButton)}>
                {isSavingPrompt ? "Saving..." : "Save"}
              </button>
            </div>

            {promptError ? <div style={{ ...styles.error, marginBottom: "12px" }}>{promptError}</div> : null}

            {sortedPrompts.map((prompt) => {
              const isActive = selectedPromptId === prompt.id || Boolean(prompt.is_active);
              return (
                <div
                  key={prompt.id}
                  style={{
                    ...styles.promptCard,
                    background: isActive ? "#eef2ff" : "#ffffff",
                    borderColor: isActive ? "#818cf8" : "#e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ ...styles.promptTitle, color: isActive ? "#4f46e5" : "#1e293b" }}>{prompt.prompt_text}</div>
                    <button
                      type="button"
                      onClick={() => void handleUsePrompt(prompt.id)}
                      style={{
                        ...styles.secondaryButton,
                        minWidth: "86px",
                        background: isActive ? "#eef2ff" : "#ffffff",
                        color: isActive ? "#4f46e5" : "#334155",
                        borderColor: isActive ? "#818cf8" : "#cbd5e1",
                      }}
                    >
                      {isActive ? "✓" : "Use"}
                    </button>
                  </div>
                  {prompt.example_text ? <div style={styles.exampleBox}>{prompt.example_text}</div> : null}
                </div>
              );
            })}
          </section>

          <section style={styles.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div style={styles.panelLabel}>Student submissions</div>
              <button type="button" onClick={() => void fetchSubmissions()} disabled={isLoadingSubmissions} style={clampButton(isLoadingSubmissions, styles.secondaryButton)}>
                {isLoadingSubmissions ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {submissionsError ? <div style={{ ...styles.error, marginBottom: "12px" }}>{submissionsError}</div> : null}

            <div style={styles.submissionsScroller}>
              {submissions.map((submission) => {
                const draft = drafts[submission.id] ?? buildDraft(submission);
                const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;
                return (
                  <article key={submission.id} style={styles.submissionCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <div>
                        <div style={styles.studentCode}>{submission.student_code || submission.student_name || "No code"}</div>
                        {submission.student_name && submission.student_code ? <div style={styles.studentName}>{submission.student_name}</div> : null}
                      </div>
                      <div style={styles.pillRow}>
                        <span style={styles.pill}>{submission.status || "unknown"}</span>
                        <span style={styles.pill}>{submission.feedback_status || "no feedback audio"}</span>
                      </div>
                    </div>

                    <div style={styles.promptBanner}>“{submission.prompt_text || "No prompt saved"}”</div>

                    <div style={styles.sectionTitle}>Student recording</div>
                    {submission.audio_url ? <audio controls src={submission.audio_url} style={{ width: "100%", marginBottom: "18px" }} /> : <div style={{ ...styles.helper, marginBottom: "18px" }}>No student audio found.</div>}

                    <div style={styles.infoGrid}>
                      <div style={styles.sectionBox}>
                        <div style={styles.sectionTitle}>AI feedback</div>
                        <div style={styles.bodyText}><span style={styles.labelStrong}>Transcript:</span> {submission.transcript || "Pending"}</div>
                        <div style={{ ...styles.bodyText, marginTop: "10px" }}><span style={styles.labelStrong}>Score:</span> {submission.ai_score ?? "Pending"}</div>
                        <div style={{ ...styles.bodyText, marginTop: "10px" }}><span style={styles.labelStrong}>Comment:</span> {submission.ai_comment || "Pending"}</div>
                      </div>
                      <div style={styles.sectionBox}>
                        <div style={styles.sectionTitle}>Submission info</div>
                        <div style={styles.bodyText}><span style={styles.labelStrong}>Date:</span> {formatDate(submission.created_at) || "Unknown"}</div>
                        <div style={{ ...styles.bodyText, marginTop: "10px" }}><span style={styles.labelStrong}>Student email:</span> {submission.student_email || "—"}</div>
                        <div style={{ ...styles.bodyText, marginTop: "10px" }}><span style={styles.labelStrong}>Feedback created:</span> {submission.feedback_created_at ? formatDate(submission.feedback_created_at) : "—"}</div>
                      </div>
                    </div>

                    <div style={styles.sectionBox}>
                      <div style={styles.sectionTitle}>Override score and comment</div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>Teacher score: {draft.score}/5</div>
                        <StarRow value={draft.score} />
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={draft.score}
                        onChange={(e) => updateDraft(submission.id, { score: clampScore(Number(e.target.value)), savedMessage: "", error: "" })}
                        style={styles.slider}
                      />
                      <textarea
                        value={draft.comment}
                        onChange={(e) => updateDraft(submission.id, { comment: e.target.value, savedMessage: "", error: "" })}
                        rows={4}
                        placeholder="Write or edit the teacher feedback here"
                        style={styles.textarea}
                      />
                      <div style={styles.footerRow}>
                        <div>
                          {draft.error ? (
                            <span style={styles.error}>{draft.error}</span>
                          ) : draft.savedMessage ? (
                            <span style={styles.success}>{draft.savedMessage}</span>
                          ) : (
                            <span style={styles.helper}>Save only if you want to override the AI.</span>
                          )}
                        </div>
                        <button type="button" onClick={() => void handleSaveOverride(submission)} disabled={draft.savingOverride} style={clampButton(draft.savingOverride, styles.primaryButton)}>
                          {draft.savingOverride ? "Saving..." : "Save override"}
                        </button>
                      </div>
                    </div>

                    <div style={styles.sectionBox}>
                      <div style={styles.sectionTitle}>Teacher audio feedback</div>
                      <div style={styles.buttonRow}>
                        {!draft.isRecordingTeacher ? (
                          <button type="button" onClick={() => void startTeacherRecording(submission.id)} style={{ ...styles.secondaryButton, background: "#4f46e5", color: "#ffffff", borderColor: "#4f46e5" }}>
                            Start recording
                          </button>
                        ) : (
                          <button type="button" onClick={() => stopTeacherRecording(submission.id)} style={{ ...styles.secondaryButton, background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}>
                            Stop recording
                          </button>
                        )}
                        <button type="button" onClick={() => void handleSaveTeacherAudio(submission)} disabled={!draft.teacherBlob || draft.savingAudio || draft.isRecordingTeacher} style={clampButton(!draft.teacherBlob || draft.savingAudio || draft.isRecordingTeacher, styles.primaryButton)}>
                          {draft.savingAudio ? "Saving audio..." : "Save teacher audio"}
                        </button>
                        <button type="button" onClick={() => clearTeacherRecording(submission.id)} disabled={!draft.teacherBlob || draft.isRecordingTeacher} style={clampButton(!draft.teacherBlob || draft.isRecordingTeacher, styles.secondaryButton)}>
                          Clear
                        </button>
                      </div>

                      {draft.isRecordingTeacher ? <div style={{ ...styles.error, marginBottom: "12px", color: "#be123c" }}>Recording in progress...</div> : null}
                      {draft.recordingError ? <div style={{ ...styles.error, marginBottom: "12px" }}>{draft.recordingError}</div> : null}

                      {draft.teacherPreviewUrl ? (
                        <div style={styles.audioWrap}>
                          <div style={{ ...styles.helper, marginBottom: "8px", color: "#475569", fontWeight: 700 }}>Preview new teacher audio</div>
                          <audio controls src={draft.teacherPreviewUrl} style={{ width: "100%" }} />
                        </div>
                      ) : null}

                      {savedTeacherAudioUrl ? (
                        <div style={{ ...styles.audioWrap, marginTop: draft.teacherPreviewUrl ? "12px" : "0" }}>
                          <div style={{ ...styles.helper, marginBottom: "8px", color: "#475569", fontWeight: 700 }}>Saved teacher audio</div>
                          <audio controls src={savedTeacherAudioUrl} style={{ width: "100%" }} />
                        </div>
                      ) : !draft.teacherPreviewUrl ? (
                        <div style={styles.helper}>{buildAudioLabel(savedTeacherAudioUrl)}</div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
