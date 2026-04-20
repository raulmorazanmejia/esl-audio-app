import React from "react";
import { StudentRow } from "../TeacherDashboardTypes";

type Props = {
  selectedClassName: string;
  selectedClassVideoEnabled: boolean;
  isSavingClassVideoSetting: boolean;
  isDeletingClass: boolean;
  onBack: () => void;
  onToggleProjectVideo: () => void;
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

export default function TeacherRosterPanel(props: Props) {
  const {
    selectedClassName, selectedClassVideoEnabled, isSavingClassVideoSetting, isDeletingClass, onBack, onToggleProjectVideo, onDeleteClass,
    newStudentName, newStudentCode, setNewStudentName, setNewStudentCode, onAddStudent, onRefreshStudents, isSavingStudent, rosterSuccess, rosterError,
    selectedClassStudents, filteredStudents, selectedStudentCode, onSelectStudent, updateStudentDraft, onSaveStudent, onDeleteStudent, newStudentNameInputRef,
  } = props;
  return <section>{/* extracted UI kept in dashboard in this refactor step */}
    <button type="button" onClick={onBack} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 800, marginBottom: 10 }}>← Back to Classes</button>
    <div style={{ fontWeight: 900, fontSize: 28 }}>{selectedClassName}</div>
    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>{selectedClassStudents.length} students • Project videos {selectedClassVideoEnabled ? "enabled" : "disabled"}</div>
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <button type="button" onClick={onToggleProjectVideo} disabled={isSavingClassVideoSetting}>{isSavingClassVideoSetting ? "Saving..." : selectedClassVideoEnabled ? "Disable project video" : "Enable project video"}</button>
      <button type="button" onClick={onDeleteClass} disabled={isDeletingClass}>{isDeletingClass ? "Deleting..." : "Delete class"}</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
      <input ref={newStudentNameInputRef} value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" />
      <input value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value.toUpperCase())} placeholder="Code" />
      <button type="button" onClick={onAddStudent} disabled={isSavingStudent}>{isSavingStudent ? "Saving..." : "Add"}</button>
      <button type="button" onClick={onRefreshStudents}>Refresh</button>
    </div>
    {rosterSuccess ? <div>{rosterSuccess}</div> : null}
    {rosterError ? <div>{rosterError}</div> : null}
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#475569", marginBottom: 6 }}>Class roster</div>
      {!selectedClassStudents.length ? <div style={{ color: "#64748b", fontSize: 13 }}>No students yet.</div> : null}
      {selectedClassStudents.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "7px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Student</th>
              <th style={{ textAlign: "left", padding: "7px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Code</th>
            </tr>
          </thead>
          <tbody>
            {selectedClassStudents.map((student) => {
              const isSelected = selectedStudentCode === student.student_code.trim();
              return (
                <tr
                  key={student.id}
                  onClick={() => onSelectStudent(student)}
                  style={{ background: isSelected ? "#e0f2fe" : "#fff", cursor: "pointer", borderLeft: isSelected ? "3px solid #0284c7" : "3px solid transparent" }}
                >
                  <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontWeight: isSelected ? 700 : 500 }}>{student.student_name}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontWeight: 800 }}>{student.student_code}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#475569", marginBottom: 6 }}>Edit roster</div>
      {filteredStudents.map((student) => (
        <div key={student.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 6, marginBottom: 6 }}>
          <input value={student.student_name} onChange={(e) => updateStudentDraft(student.id, { student_name: e.target.value })} />
          <input value={student.student_code} onChange={(e) => updateStudentDraft(student.id, { student_code: e.target.value.toUpperCase() })} />
          <button type="button" onClick={() => onSaveStudent(student)}>Save</button>
          <button type="button" onClick={() => onDeleteStudent(student.id)}>Delete</button>
        </div>
      ))}
    </div>
  </section>;
}
