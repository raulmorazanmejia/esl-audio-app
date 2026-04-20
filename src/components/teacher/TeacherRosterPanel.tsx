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
  updateStudentDraft: (id: string, patch: Partial<StudentRow>) => void;
  onSaveStudent: (student: StudentRow) => void;
  onDeleteStudent: (id: string) => void;
  newStudentNameInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function TeacherRosterPanel(props: Props) {
  const {
    selectedClassName, selectedClassVideoEnabled, isSavingClassVideoSetting, isDeletingClass, onBack, onToggleProjectVideo, onDeleteClass,
    newStudentName, newStudentCode, setNewStudentName, setNewStudentCode, onAddStudent, onRefreshStudents, isSavingStudent, rosterSuccess, rosterError,
    selectedClassStudents, filteredStudents, updateStudentDraft, onSaveStudent, onDeleteStudent, newStudentNameInputRef,
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
    <div style={{ marginTop: 10 }}>
      {filteredStudents.map((student) => (
        <div key={student.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 6, marginBottom: 6 }}>
          <input value={student.class_name ?? ""} onChange={(e) => updateStudentDraft(student.id, { class_name: e.target.value })} />
          <input value={student.student_name} onChange={(e) => updateStudentDraft(student.id, { student_name: e.target.value })} />
          <input value={student.student_code} onChange={(e) => updateStudentDraft(student.id, { student_code: e.target.value.toUpperCase() })} />
          <button type="button" onClick={() => onSaveStudent(student)}>Save</button>
          <button type="button" onClick={() => onDeleteStudent(student.id)}>Delete</button>
        </div>
      ))}
    </div>
  </section>;
}
