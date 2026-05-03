import React, { useEffect, useMemo, useState } from "react";
import LazyAudioPlayer from "../LazyAudioPlayer";
import { DraftsById, SubmissionRow } from "../TeacherDashboardTypes";
import TeacherAnalyticsPanel from "./TeacherAnalyticsPanel";

type SubmissionViewMode = "by_student" | "by_submission";

type Props = {
  selectedClassName: string;
  classOptions: string[];
  reviewFilter: "all" | "needs_review" | "reviewed";
  setReviewFilter: (v: "all" | "needs_review" | "reviewed") => void;
  onRefreshSubmissions: () => void;
  isLoadingSubmissions: boolean;
  submissionPromptFilter: string;
  setSubmissionPromptFilter: (v: string) => void;
  submissionPromptOptions: string[];
  selectedStudentFilter: { code: string; name?: string } | null;
  onClearStudentFilter: () => void;
  filteredSubmissions: SubmissionRow[];
  drafts: DraftsById;
  toggleSubmissionDetails: (id: string) => void;
  expandedSubmissionIds: Record<string, boolean>;
  onSaveOverride: (submission: SubmissionRow) => void;
  onStartTeacherRecording: (id: string) => void;
  onStopTeacherRecording: (id: string) => void;
  onSaveTeacherAudio: (submission: SubmissionRow) => void;
  onClearTeacherRecording: (id: string) => void;
  onDeleteSubmission: (submission: SubmissionRow) => void;
  deletingSubmissionById: Record<string, boolean>;
  updateDraft: (id: string, patch: { score?: number; comment?: string; savedMessage?: string; error?: string }) => void;
  analyticsPromptFilter: string;
  setAnalyticsPromptFilter: (value: string) => void;
  analyticsPromptOptions: string[];
  submissionAnalytics: any;
  submissionsSuccess: string;
  submissionsError: string;
  getSubmissionClassName?: (submission: SubmissionRow) => string;
};

const sectionStyle: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 16, display: "grid", gap: 12 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" };
const pillButton: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 999, minHeight: 42, padding: "10px 16px", fontSize: 13, fontWeight: 700, background: "#fff", color: "#334155", cursor: "pointer" };

export default function TeacherSubmissionsPanel(p: Props) {
  const [loadedMediaBySubmission, setLoadedMediaBySubmission] = useState<Record<string, boolean>>({});
  const [historyStudentCode, setHistoryStudentCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SubmissionViewMode>("by_student");
  const [classFilter, setClassFilter] = useState<string>("__all_classes__");
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [recordingSecondsById, setRecordingSecondsById] = useState<Record<string, number>>({});

  useEffect(() => {
    const activeIds = Object.entries(p.drafts).filter(([, draft]) => draft?.isRecordingTeacher).map(([id]) => id);
    if (!activeIds.length) return;
    const timer = window.setInterval(() => {
      setRecordingSecondsById((prev) => {
        const next = { ...prev };
        activeIds.forEach((id) => {
          next[id] = (next[id] || 0) + 1;
        });
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [p.drafts]);

  const loadMedia = (submissionId: string) => setLoadedMediaBySubmission((prev) => (prev[submissionId] ? prev : { ...prev, [submissionId]: true }));
  const studentFilterLabel = p.selectedStudentFilter ? `Showing submissions for ${p.selectedStudentFilter.name || "student"} (${p.selectedStudentFilter.code})` : "";
  const getSubmissionScore = (submission: SubmissionRow) => submission.teacher_score ?? submission.ai_score ?? 0;
  const fallbackClassName = "Unassigned / Unknown class";
  const safeSubmissions = Array.isArray(p.filteredSubmissions) ? p.filteredSubmissions : [];
  const safeClassOptions = Array.isArray(p.classOptions) ? p.classOptions : [];
  const safePromptOptions = Array.isArray(p.submissionPromptOptions) ? p.submissionPromptOptions : [];
  const getClassName = (submission: SubmissionRow) => (typeof p.getSubmissionClassName === "function" ? p.getSubmissionClassName(submission) : fallbackClassName) || fallbackClassName;
  const needsReview = (submission: SubmissionRow) => !(submission.teacher_comment || submission.feedback_audio_url || submission.feedback_url);
  const activityTypeLabel = (submission: SubmissionRow) => submission.prompt?.assignment_type === "external_link" ? "External activity" : submission.response_mode === "video" ? "Video response" : submission.response_mode === "text" ? "Text response" : "Audio response";

  const unresolvedClassExists = useMemo(() => safeSubmissions.some((submission) => !getClassName(submission)), [safeSubmissions]);
  const classOptions = useMemo(() => {
    const knownClasses = safeClassOptions.filter((c) => c.trim().length > 0);
    const options = Array.from(new Set(knownClasses)).sort((a, b) => a.localeCompare(b));
    if (unresolvedClassExists) options.push("Unassigned / Unknown class");
    return options;
  }, [safeClassOptions, unresolvedClassExists]);
  const classFiltered = useMemo(() => classFilter === "__all_classes__" ? safeSubmissions : safeSubmissions.filter((s) => getClassName(s) === classFilter), [safeSubmissions, classFilter]);

  const students = useMemo(() => {
    const grouped = new Map<string, { key: string; code: string; name: string; className: string; submissions: SubmissionRow[] }>();
    classFiltered.forEach((s) => {
      const code = s.student_code?.trim() || "Unknown";
      const name = s.student_name?.trim() || "Student";
      const key = `${code}__${name}`;
      if (!grouped.has(key)) grouped.set(key, { key, code, name, className: getClassName(s), submissions: [] });
      grouped.get(key)?.submissions.push(s);
    });
    return Array.from(grouped.values()).map((group) => {
      const sorted = group.submissions.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      const reviewedCount = sorted.length - sorted.filter(needsReview).length;
      const scores = sorted.map(getSubmissionScore);
      return { ...group, submissions: sorted, needsReviewCount: sorted.filter(needsReview).length, reviewedCount, latest: sorted[0], strongest: scores.length ? Math.max(...scores) : null, weakest: scores.length ? Math.min(...scores) : null };
    }).sort((a, b) => a.className.localeCompare(b.className) || a.code.localeCompare(b.code));
  }, [classFiltered]);

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const renderSubmission = (submission: SubmissionRow, compact = false) => {
    const draft = p.drafts[submission.id];
    const isExpanded = Boolean(p.expandedSubmissionIds[submission.id]);
    const hasSavedAudio = Boolean(submission.feedback_audio_url || submission.feedback_url);
    const hasAiFeedback = Boolean(submission.transcript || submission.ai_comment || submission.ai_score !== null || (submission as any).ai_score_reason);

    return <article key={submission.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: compact ? 12 : 16, marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 12, marginLeft: compact ? 12 : 0, background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{submission.prompt_text || "Untitled assignment"}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: needsReview(submission) ? "#92400e" : "#166534", background: needsReview(submission) ? "#fef3c7" : "#dcfce7", border: `1px solid ${needsReview(submission) ? "#fcd34d" : "#bbf7d0"}`, borderRadius: 12, padding: "4px 10px" }}>{needsReview(submission) ? "Needs review" : "Reviewed"}</div>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{activityTypeLabel(submission)} · {submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown date"} · Score: {getSubmissionScore(submission)}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => p.toggleSubmissionDetails(submission.id)} style={{ ...pillButton, borderColor: "#93c5fd", background: isExpanded ? "#dbeafe" : "#eff6ff", color: "#1e3a8a" }}>{isExpanded ? "▴ Hide details" : "▾ View details"}</button>
        <button type="button" onClick={() => setHistoryStudentCode((submission.student_code || submission.student_name) ?? null)} style={pillButton}>Student history</button>
      </div>
      {isExpanded && draft ? <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Student response</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[`Activity: ${submission.prompt_text || "Untitled"}`, `Type: ${activityTypeLabel(submission)}`, `Date: ${submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown"}`, `Score: ${getSubmissionScore(submission)}`, `Status: ${needsReview(submission) ? "Needs review" : "Reviewed"}`].map((item) => <span key={item} style={{ border: "1px solid #dbe3f0", background: "#fff", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#475569" }}>{item}</span>)}
          </div>
          {submission.prompt?.assignment_type === "external_link" ? <div style={{ fontSize: 13, color: "#475569" }}>Completed {submission.completion_marked_at ? `on ${new Date(submission.completion_marked_at).toLocaleString()}` : ""}</div> : submission.response_mode === "video" ? (submission.video_url ? loadedMediaBySubmission[submission.id] ? <video controls preload="none" playsInline style={{ width: "100%", borderRadius: 12 }}><source src={submission.video_url} /></video> : <button type="button" onClick={() => loadMedia(submission.id)} style={{ ...pillButton, width: "fit-content" }}>Load video</button> : <div style={{ fontSize: 13, color: "#64748b" }}>{submission.video_path ? "Video is unavailable." : "No video path found for this submission."}</div>) : submission.response_mode === "text" ? <div style={{ fontSize: 13, border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12 }}>{submission.text_response || "No text response."}</div> : submission.audio_url ? <LazyAudioPlayer src={submission.audio_url} style={{ width: "100%" }} compact submissionIdForDebug={submission.id} /> : <div style={{ fontSize: 13, color: "#64748b" }}>{submission.audio_path ? "Recording is unavailable." : "No audio path found for this submission."}</div>}
        </section>

        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>AI feedback</h4>
          {hasAiFeedback ? <div style={{ display: "grid", gap: 10 }}>
            {submission.transcript ? <div style={{ border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12 }}><strong>Transcript</strong><div style={{ marginTop: 6, fontSize: 13 }}>{submission.transcript}</div></div> : null}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
              <div style={{ border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12 }}><strong>Score</strong><div style={{ marginTop: 6 }}>{submission.ai_score ?? "—"}</div></div>
              {(submission as any).ai_score_reason ? <div style={{ border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12 }}><strong>Reason</strong><div style={{ marginTop: 6, fontSize: 13 }}>{(submission as any).ai_score_reason}</div></div> : null}
            </div>
            {submission.ai_comment ? <div style={{ border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12 }}><strong>Main comment</strong><div style={{ marginTop: 6, fontSize: 13 }}>{submission.ai_comment}</div></div> : null}
          </div> : <div style={{ fontSize: 13, color: "#94a3b8" }}>No AI feedback is available for this submission yet.</div>}
        </section>

        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Teacher text feedback</h4>
          <div style={{ fontSize: 12, color: "#64748b" }}>Edit the message students will see.</div>
          <input type="range" min={1} max={5} value={draft.score} onChange={(e) => p.updateDraft(submission.id, { score: Number(e.target.value), savedMessage: "", error: "" })} />
          <textarea value={draft.comment} onChange={(e) => p.updateDraft(submission.id, { comment: e.target.value, savedMessage: "", error: "" })} style={{ minHeight: 100, borderRadius: 12, border: "1px solid #cbd5e1", padding: 12, fontSize: 14, resize: "vertical", background: "#fff" }} />
          <button type="button" onClick={() => p.onSaveOverride(submission)} style={{ ...pillButton, borderColor: "#2563eb", background: "#2563eb", color: "#fff", width: "fit-content" }}>Save text feedback</button>
        </section>

        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Teacher audio feedback</h4>
          {draft.recordingError ? <div style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fff1f2", borderRadius: 12, padding: 10 }}>{draft.recordingError}</div> : null}
          {draft.isRecordingTeacher ? <div style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", padding: 12, display: "grid", gap: 10 }}><div style={{ color: "#b91c1c", fontWeight: 800 }}>● Recording… {formatTime(recordingSecondsById[submission.id] || 0)}</div><button type="button" onClick={() => p.onStopTeacherRecording(submission.id)} style={{ ...pillButton, background: "#dc2626", borderColor: "#dc2626", color: "#fff", width: "fit-content" }}>Stop recording</button></div> : draft.teacherPreviewUrl ? <div style={{ display: "grid", gap: 10 }}><audio controls preload="none" src={draft.teacherPreviewUrl} style={{ width: "100%" }} /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => { p.onSaveTeacherAudio(submission); setRecordingSecondsById((prev) => ({ ...prev, [submission.id]: 0 })); }} disabled={!draft.teacherBlob} style={{ ...pillButton, borderColor: "#2563eb", background: "#2563eb", color: "#fff", opacity: draft.teacherBlob ? 1 : 0.5 }}>Save audio feedback</button><button type="button" onClick={() => p.onStartTeacherRecording(submission.id)} style={pillButton}>Record again</button><button type="button" onClick={() => { p.onClearTeacherRecording(submission.id); setRecordingSecondsById((prev) => ({ ...prev, [submission.id]: 0 })); }} style={pillButton}>Discard</button></div></div> : <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 12, display: "grid", gap: 8 }}><button type="button" onClick={() => p.onStartTeacherRecording(submission.id)} style={{ ...pillButton, minHeight: 44, width: "fit-content" }}>🎤 Record audio feedback</button><div style={{ fontSize: 12, color: "#64748b" }}>Students will hear your voice feedback after you save it.</div></div>}
          {hasSavedAudio ? <div style={{ border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 12, display: "grid", gap: 8 }}><div style={{ fontWeight: 700 }}>Saved audio feedback</div><LazyAudioPlayer src={submission.feedback_audio_url || submission.feedback_url || ""} label="Load saved feedback audio" compact /><button type="button" onClick={() => p.onStartTeacherRecording(submission.id)} style={{ ...pillButton, width: "fit-content" }}>Record replacement</button></div> : null}
        </section>

        <section style={{ ...sectionStyle, borderColor: "#fecaca", background: "#fff7f7" }}>
          <h4 style={{ ...sectionTitleStyle, color: "#b91c1c" }}>Danger zone</h4>
          <button type="button" onClick={() => p.onDeleteSubmission(submission)} disabled={Boolean(p.deletingSubmissionById[submission.id])} style={{ ...pillButton, borderColor: "#fca5a5", color: "#b91c1c", width: "fit-content", background: "#fff" }}>Delete submission</button>
        </section>
        {draft.savedMessage ? <div style={{ color: "#166534", fontSize: 13 }}>{draft.savedMessage}</div> : null}
        {draft.error ? <div style={{ color: "#b91c1c", fontSize: 13 }}>{draft.error}</div> : null}
      </div> : null}
    </article>;
  };

  const historySubmissions = historyStudentCode ? classFiltered.filter((s) => (s.student_code || s.student_name) === historyStudentCode).slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8) : [];

  return <section>{/* unchanged lower panel */}
    <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Submissions</div>
    <div style={{ marginBottom: 10 }}><TeacherAnalyticsPanel selectedClassName={p.selectedClassName} analyticsPromptFilter={p.analyticsPromptFilter} setAnalyticsPromptFilter={p.setAnalyticsPromptFilter} analyticsPromptOptions={p.analyticsPromptOptions} submissionAnalytics={p.submissionAnalytics} /></div>
    {viewMode === "by_submission" ? classFiltered.map((s) => renderSubmission(s)) : students.map((student) => {
      const expanded = Boolean(expandedStudents[student.key]);
      return <div key={student.key} style={{ border: "1px solid #dbe3f0", borderRadius: 12, padding: "16px", marginBottom: 16, background: "#ffffff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><div style={{ fontWeight: 800 }}>{student.code}</div><div style={{ fontSize: 12, color: "#64748b" }}>{student.submissions.length} submissions</div></div>
          <div><button type="button" onClick={() => setExpandedStudents((prev) => ({ ...prev, [student.key]: !expanded }))} style={pillButton}>{expanded ? "Collapse" : "Expand"}</button></div>
        </div>
        {expanded ? <div style={{ marginTop: 12 }}>{student.submissions.map((s) => renderSubmission(s, true))}</div> : null}
      </div>;
    })}
    {historySubmissions.length ? <aside><div style={{ fontWeight: 700 }}>Student History <button type="button" onClick={() => setHistoryStudentCode(null)}>Close</button></div>{historySubmissions.map((s) => <div key={`h-${s.id}`} style={{ fontSize: 12 }}>{s.prompt_text || "Untitled"} · {s.created_at ? new Date(s.created_at).toLocaleString() : "Unknown"}</div>)}</aside> : null}
  </section>;
}
