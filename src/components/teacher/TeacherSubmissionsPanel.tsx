import React, { useState } from "react";
import LazyAudioPlayer from "../LazyAudioPlayer";
import { DraftsById, SubmissionRow } from "../TeacherDashboardTypes";
import TeacherAnalyticsPanel from "./TeacherAnalyticsPanel";

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
};

export default function TeacherSubmissionsPanel(p: Props) {
  const studentFilterLabel = p.selectedStudentFilter ? `Showing submissions for ${p.selectedStudentFilter.name || "student"} (${p.selectedStudentFilter.code})` : "";

  const [loadedMediaBySubmission, setLoadedMediaBySubmission] = useState<Record<string, boolean>>({});

  const loadMedia = (submissionId: string) => {
    setLoadedMediaBySubmission((prev) => (prev[submissionId] ? prev : { ...prev, [submissionId]: true }));
  };

  const getSubmissionScore = (submission: SubmissionRow) => submission.teacher_score ?? submission.ai_score ?? 0;
  const getStatusBadge = (score: number) => {
    if (score <= 2) return { label: "🔴 Needs attention", bg: "#fef2f2", border: "#fecaca", color: "#991b1b" };
    if (score === 3) return { label: "🟡 Average", bg: "#fffbeb", border: "#fde68a", color: "#92400e" };
    return { label: "🟢 Strong", bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" };
  };

  const insightSample = p.filteredSubmissions.filter((s) => (s.prompt?.assignment_type !== "external_link"));
  const missingDetailRate = insightSample.filter((s) =>
    [...(s.ai_improvements ?? []), s.ai_comment ?? ""].join(" ").toLowerCase().includes("detail")
  ).length / (insightSample.length || 1);
  const grammarMatches = insightSample.filter((s) => {
    const text = [ ...(s.ai_grammar_feedback ?? []), ...(s.ai_improvements ?? []), s.ai_comment ?? "" ].join(" ").toLowerCase();
    return text.includes("there is") || text.includes("there are") || text.includes("be verb") || text.includes("incomplete sentence");
  }).length / (insightSample.length || 1);
  const incorrectVisualRate = insightSample.filter((s) => (s.ai_picture_accuracy?.incorrect?.length ?? 0) > 0).length / (insightSample.length || 1);
  const strongObjectRate = insightSample.filter((s) => (s.ai_picture_accuracy?.correct?.length ?? 0) > 0).length / (insightSample.length || 1);
  const classInsights = [
    missingDetailRate > 0.4 ? "Many students are missing details about actions." : "",
    grammarMatches > 0.4 ? "Students are not using 'There is / There are' correctly." : "",
    incorrectVisualRate > 0.4 ? "Students are making incorrect observations in the picture." : "",
    strongObjectRate > 0.4 ? "Most students correctly identify objects." : "",
  ].filter(Boolean).slice(0, 3);

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Submissions</div>

    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => p.setReviewFilter("all")} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: p.reviewFilter === "all" ? "#0f172a" : "#fff", color: p.reviewFilter === "all" ? "#fff" : "#334155", fontWeight: 700, padding: "0 10px" }}>All</button>
      <button type="button" onClick={() => p.setReviewFilter("needs_review")} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: p.reviewFilter === "needs_review" ? "#0f172a" : "#fff", color: p.reviewFilter === "needs_review" ? "#fff" : "#334155", fontWeight: 700, padding: "0 10px" }}>Needs review</button>
      <button type="button" onClick={() => p.setReviewFilter("reviewed")} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: p.reviewFilter === "reviewed" ? "#0f172a" : "#fff", color: p.reviewFilter === "reviewed" ? "#fff" : "#334155", fontWeight: 700, padding: "0 10px" }}>Reviewed</button>
      <button type="button" onClick={p.onRefreshSubmissions} disabled={p.isLoadingSubmissions} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 10px" }}>{p.isLoadingSubmissions ? "Refreshing..." : "Refresh"}</button>
    </div>

    <select value={p.submissionPromptFilter} onChange={(e) => p.setSubmissionPromptFilter(e.target.value)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", padding: "0 8px", marginBottom: 8 }}>
      <option value="__all_prompts__">All assignments</option>
      {p.submissionPromptOptions.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>

    {p.selectedStudentFilter ? (
      <div style={{ marginBottom: 10, padding: "8px 10px", border: "1px solid #bae6fd", borderRadius: 10, background: "#f0f9ff", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e" }}>{studentFilterLabel}</div>
        <button type="button" onClick={p.onClearStudentFilter} style={{ minHeight: 30, borderRadius: 8, border: "1px solid #bae6fd", background: "#fff", color: "#0c4a6e", fontWeight: 700, padding: "0 8px" }}>Clear</button>
      </div>
    ) : null}

    {p.submissionsSuccess ? <div style={{ fontSize: 13, color: "#166534", marginBottom: 8 }}>{p.submissionsSuccess}</div> : null}
    {p.submissionsError ? <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }}>{p.submissionsError}</div> : null}

    <TeacherAnalyticsPanel
      selectedClassName={p.selectedClassName}
      analyticsPromptFilter={p.analyticsPromptFilter}
      setAnalyticsPromptFilter={p.setAnalyticsPromptFilter}
      analyticsPromptOptions={p.analyticsPromptOptions}
      submissionAnalytics={p.submissionAnalytics}
    />
    {classInsights.length ? (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#f8fafc", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: "#334155", marginBottom: 4 }}>Class Insights</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13, display: "grid", gap: 4 }}>
          {classInsights.map((insight) => <li key={insight}>{insight}</li>)}
        </ul>
      </div>
    ) : null}

    {p.filteredSubmissions.length === 0 ? <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", padding: 10, marginBottom: 8 }}>{p.selectedStudentFilter ? "No submissions for the selected student and filter." : "No submissions for this class and filter selection."}</div> : null}

    {p.filteredSubmissions.map((submission) => {
      const draft = p.drafts[submission.id];
      const isExpanded = Boolean(p.expandedSubmissionIds[submission.id]);
      return <article key={submission.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, marginBottom: 8, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{submission.student_code || submission.student_name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: submission.status === "needs_review" ? "#b45309" : "#166534" }}>{submission.status?.replace("_", " ") || "submitted"}</div>
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>{submission.prompt_text}</div>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
          {submission.prompt?.assignment_type === "external_link"
            ? "External activity completion"
            : submission.response_mode === "video"
              ? "Video response"
              : submission.response_mode === "text"
                ? "Text response"
                : "Audio response"}
        </div>
        <div style={{ marginBottom: 8 }}>
          {(() => {
            const badge = getStatusBadge(getSubmissionScore(submission));
            return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${badge.border}`, background: badge.bg, color: badge.color }}>{badge.label}</span>;
          })()}
        </div>
        {submission.prompt?.assignment_type === "external_link" ? (
          <div style={{ fontSize: 13, color: "#0f766e", border: "1px solid #99f6e4", borderRadius: 10, background: "#f0fdfa", padding: 10 }}>
            Marked completed by student {submission.completion_marked_at ? `on ${new Date(submission.completion_marked_at).toLocaleString()}` : ""}.
          </div>
        ) : submission.response_mode === "video" ? (submission.video_url
          ? loadedMediaBySubmission[submission.id]
            ? <video controls preload="none" playsInline style={{ width: "100%" }}><source src={submission.video_url} /></video>
            : <button type="button" onClick={() => loadMedia(submission.id)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 10px" }}>Load video</button>
          : <div style={{ fontSize: 13, color: "#64748b" }}>No video.</div>) : submission.response_mode === "text" ? (
          <div style={{ fontSize: 14, color: "#334155", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", padding: 10, whiteSpace: "pre-wrap" }}>
            {submission.text_response || "No text response."}
          </div>
        ) : (submission.audio_url
          ? <LazyAudioPlayer src={submission.audio_url} style={{ width: "100%" }} compact submissionIdForDebug={submission.id} />
          : <div style={{ fontSize: 13, color: "#64748b" }}>No audio.</div>)}
        <button type="button" onClick={() => p.toggleSubmissionDetails(submission.id)} style={{ minHeight: 34, marginTop: 8, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 10px" }}>{isExpanded ? "Hide details" : "View details"}</button>
        {isExpanded && draft ? <>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <input type="range" min={1} max={5} value={draft.score} onChange={(e) => p.updateDraft(submission.id, { score: Number(e.target.value), savedMessage: "", error: "" })} />
            <textarea value={draft.comment} onChange={(e) => p.updateDraft(submission.id, { comment: e.target.value, savedMessage: "", error: "" })} style={{ minHeight: 80, borderRadius: 10, border: "1px solid #dbe3f0", background: "#f8fafc", padding: 10 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => p.onSaveOverride(submission)} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Save override</button>
              <button type="button" onClick={() => p.onStartTeacherRecording(submission.id)} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Start recording</button>
              <button type="button" onClick={() => p.onStopTeacherRecording(submission.id)} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Stop recording</button>
              <button type="button" onClick={() => p.onSaveTeacherAudio(submission)} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Save teacher audio</button>
              <button type="button" onClick={() => p.onClearTeacherRecording(submission.id)} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Clear recording</button>
              <button type="button" onClick={() => p.onDeleteSubmission(submission)} disabled={Boolean(p.deletingSubmissionById[submission.id])} style={{ minHeight: 32, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontWeight: 700 }}>Delete submission</button>
            </div>
          </div>
        </> : null}
      </article>;
    })}

  </section>;
}
