import React from "react";
import { StudentRow } from "../TeacherDashboardTypes";

type Props = {
  selectedClassName: string;
  isDeletingClass: boolean;
  onBack: () => void;
  onDeleteClass: () => void;
  newStudentName: string;
  newStudentCode: string;
  setNewStudentName: (value: string) => void;
  setNewStudentCode: (value: string) => void;
  onAddStudent: () => void;
  onRefreshStudents: () => void;
  isSavingStudent: boolean;
  rosterSuccess: string;
  rosterError: string;
  selectedClassStudents: StudentRow[];
  filteredStudents: StudentRow[];
  selectedStudentCode: string;
  onSelectStudent: (student: StudentRow) => void;
  updateStudentDraft: (id: string, patch: Partial<StudentRow>) => void;
  onSaveStudent: (student: StudentRow) => void;
  onDeleteStudent: (id: string) => void;
  newStudentNameInputRef: React.RefObject<HTMLInputElement | null>;
};

const inputStyle: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #dbe3f0",
  background: "#f8fafc",
  padding: "0 10px",
};

export default function TeacherRosterPanel(props: Props) {
  const {
    selectedClassName, isDeletingClass, onBack, onDeleteClass,
    newStudentName, newStudentCode, setNewStudentName, setNewStudentCode, onAddStudent, onRefreshStudents, isSavingStudent, rosterSuccess, rosterError,
    selectedClassStudents, filteredStudents, selectedStudentCode, onSelectStudent, updateStudentDraft, onSaveStudent, onDeleteStudent, newStudentNameInputRef,
  } = props;

  return <section>
    <button type="button" onClick={onBack} style={{ minHeight: 36, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700, marginBottom: 10, color: "#334155", padding: "0 12px" }}>← Back to Classes</button>

    <div style={{ fontWeight: 900, fontSize: 23, lineHeight: 1.2 }}>{selectedClassName}</div>
    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>{selectedClassStudents.length} students</div>

    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={onDeleteClass} disabled={isDeletingClass} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontWeight: 700, padding: "0 10px" }}>
        {isDeletingClass ? "Deleting..." : "Delete class"}
      </button>
    </div>

    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 10, marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Add student</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
        <input ref={newStudentNameInputRef} value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" style={inputStyle} />
        <input value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value.toUpperCase())} placeholder="Code" style={inputStyle} />
        <button type="button" onClick={onAddStudent} disabled={isSavingStudent} style={{ minHeight: 38, borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700 }}>{isSavingStudent ? "Saving..." : "Add"}</button>
        <button type="button" onClick={onRefreshStudents} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700 }}>Refresh</button>
      </div>
    </div>

    {rosterSuccess ? <div style={{ fontSize: 13, color: "#166534", marginBottom: 8 }}>{rosterSuccess}</div> : null}
    {rosterError ? <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }}>{rosterError}</div> : null}

    <div style={{ marginTop: 10, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", padding: "10px 10px 8px", background: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Class roster</div>
      {!selectedClassStudents.length ? <div style={{ color: "#64748b", fontSize: 13, padding: 10 }}>No students in this class yet.</div> : null}
      {selectedClassStudents.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "7px 10px", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Student</th>
              <th style={{ textAlign: "left", padding: "7px 10px", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Code</th>
            </tr>
          </thead>
          <tbody>
            {selectedClassStudents.map((student) => {
              const isSelected = selectedStudentCode === student.student_code.trim();
              return (
                <tr key={student.id} onClick={() => onSelectStudent(student)} style={{ background: isSelected ? "#f0f9ff" : "#fff", cursor: "pointer", borderLeft: isSelected ? "3px solid #0ea5e9" : "3px solid transparent" }}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: isSelected ? 700 : 500 }}>{student.student_name}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontWeight: 800 }}>{student.student_code}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>

    <div style={{ marginTop: 12, border: "1px dashed #cbd5e1", borderRadius: 12, padding: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Edit roster</div>
      {!filteredStudents.length ? <div style={{ fontSize: 13, color: "#64748b" }}>No students to edit yet.</div> : null}
      {filteredStudents.map((student) => (
        <div key={student.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 6, marginBottom: 6 }}>
          <input value={student.student_name} onChange={(e) => updateStudentDraft(student.id, { student_name: e.target.value })} style={inputStyle} />
          <input value={student.student_code} onChange={(e) => updateStudentDraft(student.id, { student_code: e.target.value.toUpperCase() })} style={inputStyle} />
          <button type="button" onClick={() => onSaveStudent(student)} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Save</button>
          <button type="button" onClick={() => onDeleteStudent(student.id)} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontWeight: 700 }}>Delete</button>
        </div>
      ))}
    </div>
  </section>;
}
