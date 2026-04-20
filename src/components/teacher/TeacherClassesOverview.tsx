import React from "react";

type ClassSummary = {
  className: string;
  studentCount: number;
  needsReviewCount: number;
  promptCount: number;
  projectVideoEnabled: boolean;
};

type Props = {
  classSummaries: ClassSummary[];
  newClassName: string;
  onNewClassNameChange: (value: string) => void;
  onUseNewClass: () => void;
  onRefreshClasses: () => void;
  onSelectClass: (className: string) => void;
  rosterError: string;
};

export default function TeacherClassesOverview({ classSummaries, newClassName, onNewClassNameChange, onUseNewClass, onRefreshClasses, onSelectClass, rosterError }: Props) {
  return (
    <section style={{ background: "#fff", borderRadius: 30, border: "1px solid #e2e8f0", boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)", padding: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.16em", color: "#64748b", marginBottom: 8 }}>Teacher LMS</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Classes Overview</div>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 14 }}>Choose a class to enter its workspace and review what needs attention.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
        <input value={newClassName} onChange={(e) => onNewClassNameChange(e.target.value)} placeholder="New class / group" style={{ minHeight: 44, borderRadius: 12, border: "1px solid #dbe3f0", background: "#f8fafc", padding: "0 12px" }} />
        <button type="button" onClick={onUseNewClass} style={{ minHeight: 44, borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800 }}>Create class</button>
        <button type="button" onClick={onRefreshClasses} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 800 }}>Refresh classes</button>
      </div>
      {rosterError ? <div style={{ fontSize: 14, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>{rosterError}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {classSummaries.map((row) => (
          <button key={row.className} type="button" onClick={() => onSelectClass(row.className)} style={{ border: "1px solid #dbe3f0", borderRadius: 18, background: "#f8fafc", padding: 16, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{row.className}</div>
            <div style={{ display: "grid", gap: 4, marginTop: 8, fontSize: 13, color: "#64748b" }}>
              <div>{row.studentCount} student{row.studentCount === 1 ? "" : "s"}</div>
              <div>{row.promptCount} assigned prompt{row.promptCount === 1 ? "" : "s"}</div>
              <div>{row.needsReviewCount} needing review</div>
              <div>Project videos: {row.projectVideoEnabled ? "Enabled" : "Disabled"}</div>
            </div>
          </button>
        ))}
      </div>
      {!classSummaries.length ? <div style={{ fontSize: 14, color: "#64748b", marginTop: 16 }}>No classes yet. Create one to get started.</div> : null}
    </section>
  );
}
