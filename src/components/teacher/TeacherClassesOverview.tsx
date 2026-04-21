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
  onOpenAssignmentLibrary: () => void;
};

const shellCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
  padding: 24,
};

const createInput: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #dbe3f0",
  background: "#f8fafc",
  padding: "0 12px",
};

export default function TeacherClassesOverview({ classSummaries, newClassName, onNewClassNameChange, onUseNewClass, onRefreshClasses, onSelectClass, rosterError, onOpenAssignmentLibrary }: Props) {
  return (
    <section style={shellCard}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#64748b", marginBottom: 10 }}>Teacher workspace</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", marginBottom: 6, lineHeight: 1.15 }}>Classes</div>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Start with a class to manage prompts, roster, and submissions in one place.</div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc", padding: 12, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <input value={newClassName} onChange={(e) => onNewClassNameChange(e.target.value)} placeholder="New class / group" style={createInput} />
          <button type="button" onClick={onUseNewClass} style={{ minHeight: 44, borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800 }}>Create class</button>
          <button type="button" onClick={onRefreshClasses} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700 }}>Refresh classes</button>
        </div>
      </div>

      <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, padding: 10, marginBottom: 14, background: "#fff" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 700, marginBottom: 6 }}>Admin / cleanup</div>
        <button type="button" onClick={onOpenAssignmentLibrary} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700, padding: "0 12px" }}>
          Open Assignment Library
        </button>
      </div>

      {rosterError ? <div style={{ fontSize: 14, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>{rosterError}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {classSummaries.map((row) => (
          <button key={row.className} type="button" onClick={() => onSelectClass(row.className)} style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 16, textAlign: "left", cursor: "pointer", boxShadow: "0 4px 10px rgba(15,23,42,0.03)" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{row.className}</div>
            <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#64748b" }}>
              <div>{row.studentCount} student{row.studentCount === 1 ? "" : "s"}</div>
              <div>{row.needsReviewCount} needing review</div>
              <div>{row.promptCount} assigned prompt{row.promptCount === 1 ? "" : "s"}</div>
              <div>Project videos: {row.projectVideoEnabled ? "Enabled" : "Disabled"}</div>
            </div>
          </button>
        ))}
      </div>

      {!classSummaries.length ? (
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 16, border: "1px dashed #cbd5e1", borderRadius: 14, background: "#f8fafc", padding: 12 }}>
          No classes yet. Create your first class to begin.
        </div>
      ) : null}
    </section>
  );
}
