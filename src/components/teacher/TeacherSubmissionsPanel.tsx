import React from "react";
import ReliableAudioPlayer from "../ReliableAudioPlayer";
import { DraftsById, ProjectVideoSubmissionRow, SubmissionRow } from "../TeacherDashboardTypes";
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
  filteredProjectVideoSubmissions: ProjectVideoSubmissionRow[];
};

export default function TeacherSubmissionsPanel(p: Props) {
  return <section>
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <button type="button" onClick={() => p.setReviewFilter("all")}>All</button>
      <button type="button" onClick={() => p.setReviewFilter("needs_review")}>Needs review</button>
      <button type="button" onClick={() => p.setReviewFilter("reviewed")}>Reviewed</button>
      <button type="button" onClick={p.onRefreshSubmissions} disabled={p.isLoadingSubmissions}>{p.isLoadingSubmissions ? "Refreshing..." : "Refresh"}</button>
    </div>
    <select value={p.submissionPromptFilter} onChange={(e) => p.setSubmissionPromptFilter(e.target.value)}>
      <option value="__all_prompts__">All prompts</option>
      {p.submissionPromptOptions.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>

    <TeacherAnalyticsPanel
      selectedClassName={p.selectedClassName}
      analyticsPromptFilter={p.analyticsPromptFilter}
      setAnalyticsPromptFilter={p.setAnalyticsPromptFilter}
      analyticsPromptOptions={p.analyticsPromptOptions}
      submissionAnalytics={p.submissionAnalytics}
    />

    {p.filteredSubmissions.length === 0 ? <div>No submissions for this class.</div> : null}
    {p.filteredSubmissions.map((submission) => {
      const draft = p.drafts[submission.id];
      const isExpanded = Boolean(p.expandedSubmissionIds[submission.id]);
      return <article key={submission.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, marginBottom: 8 }}>
        <div style={{ fontWeight: 800 }}>{submission.student_code || submission.student_name}</div>
        <div>{submission.prompt_text}</div>
        {submission.audio_url ? <ReliableAudioPlayer src={submission.audio_url} style={{ width: "100%" }} /> : <div>No audio.</div>}
        <button type="button" onClick={() => p.toggleSubmissionDetails(submission.id)}>{isExpanded ? "Hide details" : "View details"}</button>
        {isExpanded && draft ? <>
          <input type="range" min={1} max={5} value={draft.score} onChange={(e) => p.updateDraft(submission.id, { score: Number(e.target.value), savedMessage: "", error: "" })} />
          <textarea value={draft.comment} onChange={(e) => p.updateDraft(submission.id, { comment: e.target.value, savedMessage: "", error: "" })} />
          <button type="button" onClick={() => p.onSaveOverride(submission)}>Save override</button>
          <button type="button" onClick={() => p.onStartTeacherRecording(submission.id)}>Start recording</button>
          <button type="button" onClick={() => p.onStopTeacherRecording(submission.id)}>Stop recording</button>
          <button type="button" onClick={() => p.onSaveTeacherAudio(submission)}>Save teacher audio</button>
          <button type="button" onClick={() => p.onClearTeacherRecording(submission.id)}>Clear recording</button>
          <button type="button" onClick={() => p.onDeleteSubmission(submission)} disabled={Boolean(p.deletingSubmissionById[submission.id])}>Delete submission</button>
        </> : null}
      </article>;
    })}

    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Project update video submissions</div>
      {!p.filteredProjectVideoSubmissions.length ? <div>No project update videos submitted yet.</div> : null}
      {p.filteredProjectVideoSubmissions.map((submission) => (
        <article key={submission.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div>{submission.student_name} ({submission.student_code})</div>
          {submission.video_url ? <video controls style={{ width: "100%" }}><source src={submission.video_url} /></video> : <div>Video not available.</div>}
        </article>
      ))}
    </div>
  </section>;
}
