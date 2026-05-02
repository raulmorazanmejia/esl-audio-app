import React, { useMemo, useState } from "react";
import LazyAudioPlayer from "../LazyAudioPlayer";
import { DraftsById, SubmissionRow } from "../TeacherDashboardTypes";
import TeacherAnalyticsPanel from "./TeacherAnalyticsPanel";

type SubmissionViewMode = "by_student" | "by_submission";

type Props = {
  selectedClassName: string;
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

  const classOptions = useMemo(() => Array.from(new Set(p.filteredSubmissions.map(getClassName))).sort((a, b) => a.localeCompare(b)), [p.filteredSubmissions]);
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
    return <article key={submission.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 8, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{submission.prompt_text || "Untitled assignment"}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: needsReview(submission) ? "#b45309" : "#166534" }}>{needsReview(submission) ? "Needs review" : "Reviewed"}</div>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{activityTypeLabel(submission)} · {submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown date"} · Score: {getSubmissionScore(submission)}</div>
      {submission.prompt?.assignment_type === "external_link" ? <div style={{ fontSize: 12, marginTop: 8 }}>Completed {submission.completion_marked_at ? `on ${new Date(submission.completion_marked_at).toLocaleString()}` : ""}</div> : submission.response_mode === "video" ? (submission.video_url ? loadedMediaBySubmission[submission.id] ? <video controls preload="none" playsInline style={{ width: "100%", marginTop: 8 }}><source src={submission.video_url} /></video> : <button type="button" onClick={() => loadMedia(submission.id)} style={{ marginTop: 8 }}>Load video</button> : <div style={{ fontSize: 12, marginTop: 8 }}>No video.</div>) : submission.response_mode === "text" ? <div style={{ fontSize: 13, marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>{submission.text_response || "No text response."}</div> : submission.audio_url ? <div style={{ marginTop: 8 }}><LazyAudioPlayer src={submission.audio_url} style={{ width: "100%" }} compact submissionIdForDebug={submission.id} /></div> : <div style={{ fontSize: 12, marginTop: 8 }}>No audio.</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => p.toggleSubmissionDetails(submission.id)}>{isExpanded ? "Hide details" : "View details"}</button>
        <button type="button" onClick={() => setHistoryStudentCode((submission.student_code || submission.student_name) ?? null)}>Student history</button>
      </div>
      {isExpanded && draft ? <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
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
    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, fontWeight: 700 }}>View:</span><button type="button" onClick={() => setViewMode("by_student")}>By student</button><button type="button" onClick={() => setViewMode("by_submission")}>By submission</button></div>
      <button type="button" onClick={() => p.setReviewFilter("all")}>All</button><button type="button" onClick={() => p.setReviewFilter("needs_review")}>Needs review</button><button type="button" onClick={() => p.setReviewFilter("reviewed")}>Reviewed</button><button type="button" onClick={p.onRefreshSubmissions} disabled={p.isLoadingSubmissions}>{p.isLoadingSubmissions ? "Refreshing..." : "Refresh"}</button>
      <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="__all_classes__">All classes</option>{classOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      <select value={p.submissionPromptFilter} onChange={(e) => p.setSubmissionPromptFilter(e.target.value)}><option value="__all_prompts__">All assignments</option>{p.submissionPromptOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select>
    </div>
    {p.selectedStudentFilter ? <div>{studentFilterLabel} <button type="button" onClick={p.onClearStudentFilter}>Clear</button></div> : null}
    {p.submissionsSuccess ? <div style={{ color: "#166534" }}>{p.submissionsSuccess}</div> : null}
    {p.submissionsError ? <div style={{ color: "#b91c1c" }}>{p.submissionsError}</div> : null}
    <div style={{ marginBottom: 10 }}><TeacherAnalyticsPanel selectedClassName={p.selectedClassName} analyticsPromptFilter={p.analyticsPromptFilter} setAnalyticsPromptFilter={p.setAnalyticsPromptFilter} analyticsPromptOptions={p.analyticsPromptOptions} submissionAnalytics={p.submissionAnalytics} /></div>
    {viewMode === "by_submission" ? classFiltered.map((s) => renderSubmission(s)) : students.map((student) => {
      const expanded = Boolean(expandedStudents[student.key]);
      const status = student.needsReviewCount > 0 ? "Needs review" : student.reviewedCount === student.submissions.length ? "Reviewed" : "Submitted";
      return <div key={student.key} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, marginBottom: 10, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div><div style={{ fontWeight: 900, fontSize: 16 }}>{student.code}</div><div style={{ fontSize: 12, color: "#475569" }}>{student.className} · {student.submissions.length} submissions · {student.needsReviewCount} need review · {student.reviewedCount} reviewed · latest {student.latest?.created_at ? new Date(student.latest.created_at).toLocaleString() : "Unknown"}</div><div style={{ fontSize: 12, color: "#64748b" }}>Strongest: {student.strongest ?? "-"} · Weakest: {student.weakest ?? "-"}</div></div>
          <div><span style={{ fontSize: 11, fontWeight: 800 }}>{status}</span> <button type="button" onClick={() => setExpandedStudents((prev) => ({ ...prev, [student.key]: !expanded }))}>{expanded ? "Collapse" : "Expand"}</button></div>
        </div>
        {expanded ? <div style={{ marginTop: 8 }}>{student.submissions.map((s) => renderSubmission(s, true))}</div> : null}
      </div>;
    })}
    {historySubmissions.length ? <aside><div style={{ fontWeight: 700 }}>Student History <button type="button" onClick={() => setHistoryStudentCode(null)}>Close</button></div>{historySubmissions.map((s) => <div key={`h-${s.id}`} style={{ fontSize: 12 }}>{s.prompt_text || "Untitled"} · {s.created_at ? new Date(s.created_at).toLocaleString() : "Unknown"}</div>)}</aside> : null}
  </section>;
}
