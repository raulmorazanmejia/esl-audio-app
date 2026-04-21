import React from "react";
import { StudentRow } from "../TeacherDashboardTypes";
import TeacherPromptPanel from "./TeacherPromptPanel";
import TeacherRosterPanel from "./TeacherRosterPanel";
import TeacherSubmissionsPanel from "./TeacherSubmissionsPanel";

type Props = {
  selectedClassName: string;
  selectedClassStudents: StudentRow[];
  needsReviewCount: number;
  assignedPromptCount: number;
  rosterPanelProps: any;
  promptPanelProps: any;
  submissionsPanelProps: any;
};

export default function TeacherClassDetail({ selectedClassName, selectedClassStudents, needsReviewCount, assignedPromptCount, rosterPanelProps, promptPanelProps, submissionsPanelProps }: Props) {
  return (
    <>
      <section style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,0.05)", padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Class workspace</div>
        <div style={{ fontSize: 29, fontWeight: 900, lineHeight: 1.15 }}>{selectedClassName}</div>
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>{selectedClassStudents.length} students • {needsReviewCount} need review • {assignedPromptCount} assigned assignments</div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.85fr) minmax(320px, 1fr) minmax(460px, 1.5fr)", gap: 18 }} className="teacher-dashboard-grid">
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}><TeacherRosterPanel {...rosterPanelProps} /></section>
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}><TeacherPromptPanel {...promptPanelProps} /></section>
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}><TeacherSubmissionsPanel {...submissionsPanelProps} /></section>
      </div>
    </>
  );
}
