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
  const hasContext = Boolean(selectedClassName && analyticsPromptFilter);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 12, background: "#f8fafc" }}>
      <div style={{ fontWeight: 800, marginBottom: 8, color: "#334155" }}>Submission analytics</div>
      <select value={analyticsPromptFilter} onChange={(e) => setAnalyticsPromptFilter(e.target.value)} disabled={!analyticsPromptOptions.length} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", padding: "0 8px", fontSize: 13 }}>
        {!analyticsPromptOptions.length ? <option value="">No prompts available</option> : null}
        {analyticsPromptOptions.map((promptText) => <option key={promptText} value={promptText}>{promptText}</option>)}
      </select>
      {hasContext ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(80px, 1fr))", gap: 8, marginBottom: 10 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 8 }}><div style={{ fontSize: 11, color: "#64748b" }}>Students</div><div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{submissionAnalytics.selectedClassStudents.length}</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 8 }}><div style={{ fontSize: 11, color: "#64748b" }}>Submitted</div><div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{submissionAnalytics.submittedStudents.length}</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 8 }}><div style={{ fontSize: 11, color: "#64748b" }}>Not submitted</div><div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{submissionAnalytics.notSubmittedStudents.length}</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 8 }}><div style={{ fontSize: 11, color: "#64748b" }}>Total uploads</div><div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{submissionAnalytics.totalSubmissions}</div></div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div><strong>Submitted:</strong> {submissionAnalytics.submittedStudents.map((student) => student.student_name || student.student_code).join(", ") || "None yet"}</div>
            <div><strong>Not submitted:</strong> {submissionAnalytics.notSubmittedStudents.map((student) => student.student_name || student.student_code).join(", ") || "Everyone has submitted"}</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Choose a prompt to see class submission coverage.</div>
      )}
    </div>
  );
}
