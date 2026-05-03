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
  viewMode?: "by_student" | "by_class" | "by_submission";
};

const metricCard: React.CSSProperties = { border: "1px solid #dbe3f0", borderRadius: 12, background: "#fff", padding: 10 };

export default function TeacherAnalyticsPanel({ selectedClassName, analyticsPromptFilter, setAnalyticsPromptFilter, analyticsPromptOptions, submissionAnalytics, viewMode = "by_student" }: Props) {
  const hasActivity = Boolean(analyticsPromptFilter);
  const hasContext = Boolean((selectedClassName || viewMode === "by_class") && hasActivity);
  const safeOptions = Array.isArray(analyticsPromptOptions) ? analyticsPromptOptions : [];

  return (
    <div style={{ border: "1px solid #dbe3f0", borderRadius: 16, padding: 14, background: "#f8faff", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, color: "#1e293b" }}>Activity coverage</div>
        <select value={analyticsPromptFilter} onChange={(e) => setAnalyticsPromptFilter(e.target.value)} disabled={!safeOptions.length} style={{ minHeight: 38, borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "0 12px", fontSize: 13 }}>
          {!safeOptions.length ? <option value="">No activities available</option> : null}
          {safeOptions.map((promptText) => <option key={promptText} value={promptText}>{promptText}</option>)}
        </select>
      </div>
      {hasContext ? <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <div style={metricCard}><div style={{ fontSize: 11, color: "#64748b" }}>Students</div><div style={{ fontSize: 17, fontWeight: 800 }}>{submissionAnalytics.selectedClassStudents?.length || 0}</div></div>
          <div style={metricCard}><div style={{ fontSize: 11, color: "#64748b" }}>Submitted</div><div style={{ fontSize: 17, fontWeight: 800 }}>{submissionAnalytics.submittedStudents?.length || 0}</div></div>
          <div style={metricCard}><div style={{ fontSize: 11, color: "#64748b" }}>Not submitted</div><div style={{ fontSize: 17, fontWeight: 800 }}>{submissionAnalytics.notSubmittedStudents?.length || 0}</div></div>
          <div style={metricCard}><div style={{ fontSize: 11, color: "#64748b" }}>Total uploads</div><div style={{ fontSize: 17, fontWeight: 800 }}>{submissionAnalytics.totalSubmissions || 0}</div></div>
        </div>
        <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#475569" }}>
          <div><strong>Submitted names:</strong> {submissionAnalytics.submittedStudents?.map((student) => student.student_name || student.student_code).join(", ") || "None yet"}</div>
          <div><strong>Not submitted names:</strong> {submissionAnalytics.notSubmittedStudents?.map((student) => student.student_name || student.student_code).join(", ") || "Everyone has submitted"}</div>
        </div>
      </> : <div style={{ fontSize: 13, color: "#64748b" }}>{viewMode === "by_class" ? "Choose an activity to see class submission coverage." : "Choose an activity to see submission coverage."}</div>}
    </div>
  );
}
