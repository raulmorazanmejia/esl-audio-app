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
      <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{selectedClassName}</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>{selectedClassStudents.length} students • {needsReviewCount} need review • {assignedPromptCount} assigned prompts</div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.85fr) minmax(320px, 1fr) minmax(460px, 1.5fr)", gap: 24 }} className="teacher-dashboard-grid">
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 14 }}><TeacherRosterPanel {...rosterPanelProps} /></section>
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 14 }}><TeacherPromptPanel {...promptPanelProps} /></section>
        <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 14 }}><TeacherSubmissionsPanel {...submissionsPanelProps} /></section>
      </div>
    </>
  );
}
