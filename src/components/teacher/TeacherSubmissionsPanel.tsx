import React, { useMemo, useState } from "react";
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
  getSubmissionClassName: (submission: SubmissionRow) => string;
};

export default function TeacherSubmissionsPanel(p: Props) {
  const [loadedMediaBySubmission, setLoadedMediaBySubmission] = useState<Record<string, boolean>>({});
  const [historyStudentCode, setHistoryStudentCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SubmissionViewMode>("by_student");
  const [classFilter, setClassFilter] = useState<string>("__all_classes__");
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const loadMedia = (submissionId: string) => setLoadedMediaBySubmission((prev) => (prev[submissionId] ? prev : { ...prev, [submissionId]: true }));
  const studentFilterLabel = p.selectedStudentFilter ? `Showing submissions for ${p.selectedStudentFilter.name || "student"} (${p.selectedStudentFilter.code})` : "";
  const getSubmissionScore = (submission: SubmissionRow) => submission.teacher_score ?? submission.ai_score ?? 0;
  const getClassName = (submission: SubmissionRow) => p.getSubmissionClassName(submission) || "Unassigned / Unknown class";
  const needsReview = (submission: SubmissionRow) => !(submission.teacher_comment || submission.feedback_audio_url || submission.feedback_url);
  const activityTypeLabel = (submission: SubmissionRow) => submission.prompt?.assignment_type === "external_link" ? "External activity" : submission.response_mode === "video" ? "Video response" : submission.response_mode === "text" ? "Text response" : "Audio response";

  const unresolvedClassExists = useMemo(() => p.filteredSubmissions.some((submission) => !p.getSubmissionClassName(submission)), [p.filteredSubmissions, p.getSubmissionClassName]);
  const classOptions = useMemo(() => {
    const knownClasses = p.classOptions.filter((c) => c.trim().length > 0);
    const options = Array.from(new Set(knownClasses)).sort((a, b) => a.localeCompare(b));
    if (unresolvedClassExists) options.push("Unassigned / Unknown class");
    return options;
  }, [p.classOptions, unresolvedClassExists]);
  const classFiltered = useMemo(() => classFilter === "__all_classes__" ? p.filteredSubmissions : p.filteredSubmissions.filter((s) => getClassName(s) === classFilter), [p.filteredSubmissions, classFilter]);

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

  const renderSubmission = (submission: SubmissionRow, compact = false) => {
    const draft = p.drafts[submission.id];
    const isExpanded = Boolean(p.expandedSubmissionIds[submission.id]);
    return <article key={submission.id} onMouseEnter={(event) => { event.currentTarget.style.borderColor = "#bfdbfe"; event.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.10)"; }} onMouseLeave={(event) => { event.currentTarget.style.borderColor = "#e2e8f0"; event.currentTarget.style.boxShadow = "none"; }} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: compact ? 12 : 16, marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 12, marginLeft: compact ? 12 : 0, background: compact ? "#f8fafc" : "#ffffff", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{submission.prompt_text || "Untitled assignment"}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: needsReview(submission) ? "#92400e" : "#166534", background: needsReview(submission) ? "#fef3c7" : "#dcfce7", border: `1px solid ${needsReview(submission) ? "#fcd34d" : "#bbf7d0"}`, borderRadius: 12, padding: "4px 10px" }}>{needsReview(submission) ? "Needs review" : "Reviewed"}</div>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{activityTypeLabel(submission)} · {submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown date"} · Score: {getSubmissionScore(submission)}</div>
      {submission.prompt?.assignment_type === "external_link" ? <div style={{ fontSize: 12, marginTop: 8 }}>Completed {submission.completion_marked_at ? `on ${new Date(submission.completion_marked_at).toLocaleString()}` : ""}</div> : submission.response_mode === "video" ? (submission.video_url ? loadedMediaBySubmission[submission.id] ? <video controls preload="none" playsInline style={{ width: "100%", marginTop: 8 }}><source src={submission.video_url} /></video> : <button type="button" onClick={() => loadMedia(submission.id)} style={{ marginTop: 8 }}>Load video</button> : <div style={{ fontSize: 12, marginTop: 8 }}>No video.</div>) : submission.response_mode === "text" ? <div style={{ fontSize: 13, marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>{submission.text_response || "No text response."}</div> : submission.audio_url ? <div style={{ marginTop: 8 }}><LazyAudioPlayer src={submission.audio_url} style={{ width: "100%" }} compact submissionIdForDebug={submission.id} /></div> : <div style={{ fontSize: 12, marginTop: 8 }}>No audio.</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => p.toggleSubmissionDetails(submission.id)} style={{ border: "1px solid #93c5fd", background: isExpanded ? "#dbeafe" : "#eff6ff", borderRadius: 12, minHeight: 36, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>{isExpanded ? "▴ Hide details" : "▾ View details"}</button>
        <button type="button" onClick={() => setHistoryStudentCode((submission.student_code || submission.student_name) ?? null)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Student history</button>
      </div>
      {isExpanded && draft ? <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input type="range" min={1} max={5} value={draft.score} onChange={(e) => p.updateDraft(submission.id, { score: Number(e.target.value), savedMessage: "", error: "" })} />
        <textarea value={draft.comment} onChange={(e) => p.updateDraft(submission.id, { comment: e.target.value, savedMessage: "", error: "" })} style={{ minHeight: 80 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={() => p.onSaveOverride(submission)}>Save override</button><button type="button" onClick={() => p.onStartTeacherRecording(submission.id)}>Start recording</button><button type="button" onClick={() => p.onStopTeacherRecording(submission.id)}>Stop recording</button><button type="button" onClick={() => p.onSaveTeacherAudio(submission)}>Save teacher audio</button><button type="button" onClick={() => p.onClearTeacherRecording(submission.id)}>Clear recording</button><button type="button" onClick={() => p.onDeleteSubmission(submission)} disabled={Boolean(p.deletingSubmissionById[submission.id])} style={{ color: "#b91c1c" }}>Delete submission</button>
        </div>
      </div> : null}
    </article>;
  };

  const historySubmissions = historyStudentCode ? classFiltered.filter((s) => (s.student_code || s.student_name) === historyStudentCode).slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8) : [];

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Submissions</div>
    <div style={{ display: "grid", gap: 16, marginBottom: 18, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>View</span><div style={{ display: "inline-flex", border: "1px solid #bfdbfe", borderRadius: 12, padding: 2, background: "#eff6ff" }}><button type="button" onClick={() => setViewMode("by_student")} style={{ border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: viewMode === "by_student" ? 700 : 600, background: viewMode === "by_student" ? "#2563eb" : "transparent", color: viewMode === "by_student" ? "#ffffff" : "#475569", transition: "all 0.2s ease", cursor: "pointer", boxShadow: viewMode === "by_student" ? "0 1px 2px rgba(37, 99, 235, 0.35)" : "none" }}>By student</button><button type="button" onClick={() => setViewMode("by_submission")} style={{ border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: viewMode === "by_submission" ? 700 : 600, background: viewMode === "by_submission" ? "#2563eb" : "transparent", color: viewMode === "by_submission" ? "#ffffff" : "#475569", transition: "all 0.2s ease", cursor: "pointer", boxShadow: viewMode === "by_submission" ? "0 1px 2px rgba(37, 99, 235, 0.35)" : "none" }}>By submission</button></div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span><div style={{ display: "inline-flex", border: "1px solid #d7deea", borderRadius: 12, padding: 2, background: "#f1f5f9" }}>{(["all", "needs_review", "reviewed"] as const).map((filter) => <button key={filter} type="button" onClick={() => p.setReviewFilter(filter)} style={{ border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: p.reviewFilter === filter ? 700 : 600, background: p.reviewFilter === filter ? "#334155" : "transparent", color: p.reviewFilter === filter ? "#ffffff" : "#64748b", transition: "all 0.2s ease", cursor: "pointer" }}>{filter === "all" ? "All" : filter === "needs_review" ? "Needs review" : "Reviewed"}</button>)}</div></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginLeft: "auto" }}>
          <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Class
            <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #d7deea", padding: "0 12px", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 11, color: "#94a3b8" }}>▾</span><select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ minHeight: 36, borderRadius: 12, border: "none", background: "transparent", padding: "0 2px", fontSize: 13, color: "#334155", outline: "none" }}><option value="__all_classes__">All classes</option>{classOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Assignment
            <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #d7deea", padding: "0 12px", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 11, color: "#94a3b8" }}>▾</span><select value={p.submissionPromptFilter} onChange={(e) => p.setSubmissionPromptFilter(e.target.value)} style={{ minHeight: 36, borderRadius: 12, border: "none", background: "transparent", padding: "0 2px", fontSize: 13, color: "#334155", outline: "none" }}><option value="__all_prompts__">All assignments</option>{p.submissionPromptOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </label>
          <button type="button" onClick={p.onRefreshSubmissions} disabled={p.isLoadingSubmissions} style={{ border: "1px solid #d1d9e6", background: "#ffffff", borderRadius: 12, minHeight: 36, padding: "7px 12px", fontSize: 11, fontWeight: 600, color: "#94a3b8", cursor: "pointer" }}>{p.isLoadingSubmissions ? "Refreshing..." : "Refresh"}</button>
        </div>
      </div>
    </div>
    {p.selectedStudentFilter ? <div>{studentFilterLabel} <button type="button" onClick={p.onClearStudentFilter}>Clear</button></div> : null}
    {p.submissionsSuccess ? <div style={{ color: "#166534" }}>{p.submissionsSuccess}</div> : null}
    {p.submissionsError ? <div style={{ color: "#b91c1c" }}>{p.submissionsError}</div> : null}
    <div style={{ marginBottom: 10 }}><TeacherAnalyticsPanel selectedClassName={p.selectedClassName} analyticsPromptFilter={p.analyticsPromptFilter} setAnalyticsPromptFilter={p.setAnalyticsPromptFilter} analyticsPromptOptions={p.analyticsPromptOptions} submissionAnalytics={p.submissionAnalytics} /></div>
    {viewMode === "by_submission" ? classFiltered.map((s) => renderSubmission(s)) : students.map((student) => {
      const expanded = Boolean(expandedStudents[student.key]);
      const status = student.needsReviewCount > 0 ? "Needs review" : student.reviewedCount === student.submissions.length ? "Reviewed" : "Submitted";
      return <div key={student.key} onMouseEnter={(event) => { event.currentTarget.style.borderColor = "#bfdbfe"; event.currentTarget.style.boxShadow = "0 10px 22px rgba(37, 99, 235, 0.10)"; }} onMouseLeave={(event) => { event.currentTarget.style.borderColor = "#dbe3f0"; event.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.06)"; }} style={{ border: "1px solid #dbe3f0", borderRadius: 12, padding: "16px", marginBottom: 16, background: "#ffffff", boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: "#0f172a", letterSpacing: "0.01em" }}>{student.code}</div>
              <span style={{ fontSize: 11, borderRadius: 999, border: "1px solid #d1d9e6", padding: "4px 10px", fontWeight: 700, color: "#475569", background: "#f8fafc" }}>{student.className}</span>
              <span style={{ fontSize: 11, borderRadius: 12, border: `1px solid ${status === "Needs review" ? "#fcd34d" : "#bbf7d0"}`, padding: "4px 10px", fontWeight: 700, color: status === "Needs review" ? "#92400e" : "#166534", background: status === "Needs review" ? "#fef3c7" : "#dcfce7" }}>{status}</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{student.submissions.length} submissions • {student.needsReviewCount} need review • latest {student.latest?.created_at ? new Date(student.latest.created_at).toLocaleString() : "Unknown"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Scores {student.weakest ?? "—"}–{student.strongest ?? "—"}</div>
          </div>
	          <div><button type="button" onClick={() => setExpandedStudents((prev) => ({ ...prev, [student.key]: !expanded }))} style={{ border: "1px solid #cbd5e1", borderRadius: 12, minHeight: 40, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "#f8fafc", color: "#334155", cursor: "pointer", minWidth: 104 }}>{expanded ? "Collapse" : "Expand"}</button></div>
        </div>
        {expanded ? <div style={{ marginTop: 12 }}>{student.submissions.map((s) => renderSubmission(s, true))}</div> : null}
      </div>;
    })}
    {historySubmissions.length ? <aside><div style={{ fontWeight: 700 }}>Student History <button type="button" onClick={() => setHistoryStudentCode(null)}>Close</button></div>{historySubmissions.map((s) => <div key={`h-${s.id}`} style={{ fontSize: 12 }}>{s.prompt_text || "Untitled"} · {s.created_at ? new Date(s.created_at).toLocaleString() : "Unknown"}</div>)}</aside> : null}
  </section>;
}
