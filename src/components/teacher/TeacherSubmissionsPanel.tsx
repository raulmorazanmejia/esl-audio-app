import React, { useEffect, useMemo, useState } from "react";
import LazyAudioPlayer from "../LazyAudioPlayer";
import { DraftsById, SubmissionRow } from "../TeacherDashboardTypes";
import TeacherAnalyticsPanel from "./TeacherAnalyticsPanel";

type SubmissionViewMode = "by_student" | "by_class" | "by_submission";
// props unchanged

type Props = {
  selectedClassName: string; classOptions: string[]; reviewFilter: "all" | "needs_review" | "reviewed"; setReviewFilter: (v: "all" | "needs_review" | "reviewed") => void; onRefreshSubmissions: () => void; isLoadingSubmissions: boolean; submissionPromptFilter: string; setSubmissionPromptFilter: (v: string) => void; submissionPromptOptions: string[]; selectedStudentFilter: { code: string; name?: string } | null; onClearStudentFilter: () => void; filteredSubmissions: SubmissionRow[]; drafts: DraftsById; toggleSubmissionDetails: (id: string) => void; expandedSubmissionIds: Record<string, boolean>; onSaveOverride: (submission: SubmissionRow) => void; onStartTeacherRecording: (id: string) => void; onStopTeacherRecording: (id: string) => void; onSaveTeacherAudio: (submission: SubmissionRow) => void; onClearTeacherRecording: (id: string) => void; onDeleteSubmission: (submission: SubmissionRow) => void; deletingSubmissionById: Record<string, boolean>; updateDraft: (id: string, patch: { score?: number; comment?: string; savedMessage?: string; error?: string }) => void; analyticsPromptFilter: string; setAnalyticsPromptFilter: (value: string) => void; analyticsPromptOptions: string[]; submissionAnalytics: any; submissionsSuccess: string; submissionsError: string; getSubmissionClassName?: (submission: SubmissionRow) => string;
};
const pillButton: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 999, minHeight: 40, padding: "8px 14px", fontSize: 13, fontWeight: 700, background: "#fff", color: "#334155", cursor: "pointer" };
const sectionStyle: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12, display: "grid", gap: 10 };

export default function TeacherSubmissionsPanel(p: Props) {
  const [viewMode, setViewMode] = useState<SubmissionViewMode>("by_student");
  const [classFilter, setClassFilter] = useState<string>("__all_classes__");
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [recordingSecondsById, setRecordingSecondsById] = useState<Record<string, number>>({});

  useEffect(() => { const ids = Object.entries(p.drafts).filter(([, d]) => d?.isRecordingTeacher).map(([id]) => id); if (!ids.length) return; const t = setInterval(() => setRecordingSecondsById((prev) => { const n = { ...prev }; ids.forEach((id) => n[id] = (n[id] || 0) + 1); return n; }), 1000); return () => clearInterval(t); }, [p.drafts]);

  const safeSubmissions = Array.isArray(p.filteredSubmissions) ? p.filteredSubmissions : [];
  const getClassName = (s: SubmissionRow) => (typeof p.getSubmissionClassName === "function" ? p.getSubmissionClassName(s) : "Unassigned / Unknown class") || "Unassigned / Unknown class";
  const needsReview = (s: SubmissionRow) => !(s.teacher_comment || s.feedback_audio_url || s.feedback_url);
  const activityTypeLabel = (s: SubmissionRow) => s.prompt?.assignment_type === "external_link" ? "External activity" : s.response_mode === "video" ? "Video response" : s.response_mode === "text" ? "Text response" : "Audio response";
  const classOptions = useMemo(() => Array.from(new Set((Array.isArray(p.classOptions) ? p.classOptions : []).concat("Unassigned / Unknown class"))).filter(Boolean), [p.classOptions]);
  const classFiltered = useMemo(() => classFilter === "__all_classes__" ? safeSubmissions : safeSubmissions.filter((s) => getClassName(s) === classFilter), [safeSubmissions, classFilter]);

  const students = useMemo(() => {
    const m = new Map<string, any>();
    classFiltered.forEach((s) => { const code = s.student_code?.trim() || "Unknown"; const name = s.student_name?.trim() || "Student"; const k = `${code}__${name}`; if (!m.has(k)) m.set(k, { key: k, code, name, className: getClassName(s), submissions: [] as SubmissionRow[] }); m.get(k).submissions.push(s); });
    return Array.from(m.values()).map((st: any) => ({ ...st, submissions: st.submissions.sort((a: SubmissionRow, b: SubmissionRow) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0)), needsReviewCount: st.submissions.filter(needsReview).length, latest: st.submissions[0] })).sort((a: any, b: any) => a.className.localeCompare(b.className) || a.code.localeCompare(b.code));
  }, [classFiltered]);

  const byClass = useMemo(() => {
    const m = new Map<string, SubmissionRow[]>();
    classFiltered.forEach((s) => { const c = getClassName(s); if (!m.has(c)) m.set(c, []); m.get(c)!.push(s); });
    return Array.from(m.entries()).map(([name, subs]) => {
      const studentSet = new Set(subs.map((s) => `${s.student_code || "Unknown"}__${s.student_name || "Student"}`));
      const latest = subs.slice().sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0))[0];
      return { name, subs, students: students.filter((st: any) => st.className === name), totalStudents: studentSet.size, total: subs.length, needsReview: subs.filter(needsReview).length, reviewed: subs.filter((s) => !needsReview(s)).length, latest };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [classFiltered, students]);

  const renderSubmission = (s: SubmissionRow) => {
    const d = p.drafts[s.id]; if (!d) return null; const exp = Boolean(p.expandedSubmissionIds[s.id]); const hasSavedAudio = Boolean(s.feedback_audio_url || s.feedback_url); const hasAi = Boolean(s.transcript || s.ai_comment || s.ai_score !== null || (s as any).ai_score_reason);
    return <article key={s.id} style={{ border: "1px solid #dbe3f0", borderRadius: 14, background: "#fff", padding: 12, marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div style={{ fontWeight: 800 }}>{s.prompt_text || "Untitled activity"}</div><button type="button" onClick={() => p.toggleSubmissionDetails(s.id)} style={{ ...pillButton, borderColor: "#93c5fd", background: "#eff6ff", color: "#1e3a8a" }}>{exp ? "Hide review" : "Open review"}</button></div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{activityTypeLabel(s)} · {s.created_at ? new Date(s.created_at).toLocaleString() : "Unknown"}</div>
      {exp ? <div style={{ marginTop: 10, border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <section style={sectionStyle}><strong>Student response</strong><div style={{ fontSize: 12, color: "#475569" }}>Activity: {s.prompt_text || "Untitled"} · Score: {s.teacher_score ?? s.ai_score ?? 0} · {needsReview(s) ? "Needs review" : "Reviewed"}</div>{s.response_mode === "text" ? <div>{s.text_response || "No text response."}</div> : s.response_mode === "video" ? (s.video_url ? <video controls preload="none" playsInline style={{ width: "100%", borderRadius: 10 }}><source src={s.video_url} /></video> : <div style={{ fontSize: 12, color: "#64748b" }}>No video available.</div>) : s.audio_url ? <LazyAudioPlayer src={s.audio_url} compact submissionIdForDebug={s.id} /> : <div style={{ fontSize: 12, color: "#64748b" }}>No audio available.</div>}</section>
          <section style={sectionStyle}><strong>AI feedback</strong>{hasAi ? <>{s.transcript ? <div style={{ fontSize: 13 }}><strong>Transcript:</strong> {s.transcript}</div> : null}<div style={{ fontSize: 13 }}><strong>Score/reason:</strong> {s.ai_score ?? "—"} {(s as any).ai_score_reason ? `· ${(s as any).ai_score_reason}` : ""}</div>{s.ai_comment ? <div style={{ fontSize: 13 }}><strong>Main comment:</strong> {s.ai_comment}</div> : null}</> : <div style={{ fontSize: 13, color: "#94a3b8" }}>No AI feedback is available for this submission yet.</div>}</section>
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <section style={sectionStyle}><strong>Teacher text feedback</strong><div style={{ fontSize: 12, color: "#64748b" }}>Edit the message students will see.</div><textarea value={d.comment} onChange={(e) => p.updateDraft(s.id, { comment: e.target.value, savedMessage: "", error: "" })} style={{ minHeight: 100, borderRadius: 12, border: "1px solid #cbd5e1", padding: 10 }} /><button type="button" onClick={() => p.onSaveOverride(s)} style={{ ...pillButton, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}>Save text feedback</button></section>
          <section style={sectionStyle}><strong>Teacher audio feedback</strong>{d.isRecordingTeacher ? <div style={{ color: "#b91c1c" }}>● Recording… {String(Math.floor((recordingSecondsById[s.id] || 0) / 60)).padStart(2, "0")}:{String((recordingSecondsById[s.id] || 0) % 60).padStart(2, "0")}</div> : null}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => p.onStartTeacherRecording(s.id)} style={pillButton}>Record</button><button type="button" onClick={() => p.onStopTeacherRecording(s.id)} style={pillButton}>Stop</button><button type="button" onClick={() => p.onClearTeacherRecording(s.id)} style={pillButton}>Discard</button>{d.teacherPreviewUrl ? <button type="button" onClick={() => p.onSaveTeacherAudio(s)} style={{ ...pillButton, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}>Save</button> : null}</div>{d.teacherPreviewUrl ? <audio controls preload="none" src={d.teacherPreviewUrl} style={{ width: "100%" }} /> : null}{hasSavedAudio ? <LazyAudioPlayer src={s.feedback_audio_url || s.feedback_url || ""} label="Load saved feedback audio" compact /> : null}</section>
          <section style={{ ...sectionStyle, borderColor: "#fecaca", background: "#fff7f7" }}><strong style={{ color: "#b91c1c" }}>Danger zone</strong><button type="button" onClick={() => p.onDeleteSubmission(s)} style={pillButton}>Delete submission</button></section>
        </div>
      </div> : null}
    </article>;
  };

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 12 }}>Submissions</div>
    <div style={{ border: "1px solid #dbe3f0", borderRadius: 16, background: "#fff", padding: 12, display: "grid", gap: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {(["by_student", "by_class", "by_submission"] as SubmissionViewMode[]).map((mode) => <button key={mode} onClick={() => setViewMode(mode)} style={{ ...pillButton, background: viewMode === mode ? "#dbeafe" : "#fff" }}>{mode === "by_student" ? "By student" : mode === "by_class" ? "By class" : "By submission"}</button>)}
        {(["all", "needs_review", "reviewed"] as const).map((status) => <button key={status} onClick={() => p.setReviewFilter(status)} style={{ ...pillButton, background: p.reviewFilter === status ? "#ede9fe" : "#fff" }}>{status === "all" ? "All" : status === "needs_review" ? "Needs review" : "Reviewed"}</button>)}
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ ...pillButton, minHeight: 40 }}><option value="__all_classes__">All classes</option>{classOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={p.submissionPromptFilter} onChange={(e) => p.setSubmissionPromptFilter(e.target.value)} style={{ ...pillButton, minHeight: 40 }}><option value="">All activities</option>{(Array.isArray(p.submissionPromptOptions) ? p.submissionPromptOptions : []).map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <button onClick={p.onRefreshSubmissions} style={pillButton}>Refresh</button>
      </div>
    </div>

    <TeacherAnalyticsPanel selectedClassName={p.selectedClassName} analyticsPromptFilter={p.analyticsPromptFilter} setAnalyticsPromptFilter={p.setAnalyticsPromptFilter} analyticsPromptOptions={p.analyticsPromptOptions} submissionAnalytics={p.submissionAnalytics} viewMode={viewMode} />

    {viewMode === "by_submission" ? classFiltered.map(renderSubmission) : viewMode === "by_class" ? byClass.map((c: any) => { const open = expandedClasses[c.name] ?? true; return <section key={c.name} style={{ border: "1px solid #cbd5e1", borderRadius: 16, background: "#f8fafc", padding: 12, marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><div style={{ fontWeight: 800 }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.totalStudents} students · {c.total} submissions · {c.needsReview} needs review · {c.reviewed} reviewed · Latest {c.latest?.created_at ? new Date(c.latest.created_at).toLocaleString() : "—"}</div></div><button onClick={() => setExpandedClasses((p) => ({ ...p, [c.name]: !open }))} style={pillButton}>{open ? "Collapse" : "Expand"}</button></div>{open ? c.students.map((st: any) => <div key={`${c.name}-${st.key}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff", marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><strong>{st.code} {st.name !== "Student" ? `· ${st.name}` : ""}</strong><div style={{ fontSize: 12, color: "#64748b" }}>{st.submissions.length} submissions · {st.needsReviewCount} needs review</div></div><button onClick={() => setExpandedStudents((p) => ({ ...p, [st.key]: !p[st.key] }))} style={pillButton}>{expandedStudents[st.key] ? "Hide" : "Review"}</button></div>{expandedStudents[st.key] ? st.submissions.map(renderSubmission) : null}</div>) : null}</section>; }) : students.map((st: any) => <div key={st.key} style={{ border: "1px solid #dbe3f0", borderRadius: 12, padding: 12, marginTop: 12, background: "#fff" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={{ fontWeight: 800 }}>{st.code} {st.name !== "Student" ? `· ${st.name}` : ""}</div><div style={{ fontSize: 12, color: "#64748b" }}>{st.className} · {st.submissions.length} submissions · {st.needsReviewCount} needs review · Latest {st.latest?.created_at ? new Date(st.latest.created_at).toLocaleString() : "—"}</div></div><button onClick={() => setExpandedStudents((p) => ({ ...p, [st.key]: !p[st.key] }))} style={pillButton}>{expandedStudents[st.key] ? "Collapse" : "Expand"}</button></div>{expandedStudents[st.key] ? st.submissions.map(renderSubmission) : null}</div>)}
  </section>;
}
