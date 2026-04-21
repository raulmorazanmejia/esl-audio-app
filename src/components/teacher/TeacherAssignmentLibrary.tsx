import React from "react";
import TeacherPromptPanel from "./TeacherPromptPanel";

type Props = {
  totalPromptCount: number;
  classNameOptions: string[];
  promptPanelProps: React.ComponentProps<typeof TeacherPromptPanel>;
  onGoToClasses: () => void;
  unassignedPromptCount: number;
};

export default function TeacherAssignmentLibrary({ totalPromptCount, classNameOptions, promptPanelProps, onGoToClasses, unassignedPromptCount }: Props) {
  return (
    <>
      <section style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,0.05)", padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Content management</div>
        <div style={{ fontSize: 29, fontWeight: 900, lineHeight: 1.15 }}>Assignment Library</div>
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
          {totalPromptCount} assignments total • {unassignedPromptCount} unassigned • {classNameOptions.length} classes available for assignment
        </div>
        <div style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>
          New class assignments are visible to students by default. Use class-level Hide/Show controls only when needed.
        </div>
        <button
          type="button"
          onClick={onGoToClasses}
          style={{ marginTop: 12, minHeight: 36, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "0 12px", fontWeight: 700 }}
        >
          Back to classes workspace
        </button>
      </section>

      <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}>
        <TeacherPromptPanel {...promptPanelProps} />
      </section>
    </>
  );
}
