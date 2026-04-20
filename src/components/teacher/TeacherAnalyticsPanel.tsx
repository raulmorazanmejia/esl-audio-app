import React from "react";
import { StudentRow } from "../TeacherDashboardTypes";

type SubmissionAnalytics = {
  selectedClassStudents: StudentRow[];
  submittedStudents: StudentRow[];
  notSubmittedStudents: StudentRow[];
  totalSubmissions: number;
};

type Props = {
  selectedClassName: string;
  analyticsPromptFilter: string;
  setAnalyticsPromptFilter: (value: string) => void;
  analyticsPromptOptions: string[];
  submissionAnalytics: SubmissionAnalytics;
};

export default function TeacherAnalyticsPanel({ selectedClassName, analyticsPromptFilter, setAnalyticsPromptFilter, analyticsPromptOptions, submissionAnalytics }: Props) {
  return (
    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Submission analytics</div>
      <select value={analyticsPromptFilter} onChange={(e) => setAnalyticsPromptFilter(e.target.value)} disabled={!analyticsPromptOptions.length}>
        {!analyticsPromptOptions.length ? <option value="">No prompts available</option> : null}
        {analyticsPromptOptions.map((promptText) => <option key={promptText} value={promptText}>{promptText}</option>)}
      </select>
      {selectedClassName && analyticsPromptFilter ? (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div>Total students: {submissionAnalytics.selectedClassStudents.length}</div>
          <div>Submitted: {submissionAnalytics.submittedStudents.length}</div>
          <div>Not submitted: {submissionAnalytics.notSubmittedStudents.length}</div>
          <div>Total submissions: {submissionAnalytics.totalSubmissions}</div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13 }}>No analytics data yet.</div>
      )}
    </div>
  );
}
