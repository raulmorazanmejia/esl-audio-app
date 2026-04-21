import React from "react";
import { PromptRow } from "../TeacherDashboardTypes";

type Props = {
  selectedClassName: string;
  title?: string;
  createPromptLabel?: string;
  newPrompt: string;
  newSuggestedTime: string;
  setNewPrompt: (v: string) => void;
  setNewSuggestedTime: (v: string) => void;
  newPromptImagePreviewUrl: string;
  onPromptImageChange: (file: File | null) => void;
  onClearPromptImage: () => void;
  onSavePrompt: () => void;
  isSavingPrompt: boolean;
  promptSuccess: string;
  promptError: string;
  filteredPrompts: PromptRow[];
  promptAssignmentDrafts: Record<string, string>;
  setPromptAssignmentDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSavePromptAssignment: (id: string) => void;
  onTogglePromptVisibility: (prompt: PromptRow) => void;
  onDeletePrompt: (prompt: PromptRow) => void;
  savingPromptAssignmentById: Record<string, boolean>;
  savingPromptVisibilityById: Record<string, boolean>;
  deletingPromptById: Record<string, boolean>;
  onClearVisiblePromptsForSelectedClass: () => void;
  classNameOptions: string[];
  isAssignmentEditable?: boolean;
  showCreateForm?: boolean;
  showBulkHideButton?: boolean;
};

const inputStyle: React.CSSProperties = { minHeight: 38, borderRadius: 10, border: "1px solid #dbe3f0", background: "#f8fafc", padding: "0 10px" };

export default function TeacherPromptPanel(props: Props) {
  const p = props;
  const title = p.title ?? "Prompt library";
  const createPromptLabel = p.createPromptLabel ?? `Create a prompt for ${p.selectedClassName}`;
  const isAssignmentEditable = p.isAssignmentEditable !== false;
  const showCreateForm = p.showCreateForm !== false;
  const showBulkHideButton = p.showBulkHideButton !== false;

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22 }}>{title}</div>
    {showCreateForm ? <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{createPromptLabel}</div> : null}

    {showCreateForm ? <div style={{ display: "grid", gap: 8, margin: "10px 0 12px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc", padding: 10 }}>
      <input value={p.newPrompt} onChange={(e) => p.setNewPrompt(e.target.value)} placeholder="Prompt title or text" style={inputStyle} />
      <input value={p.newSuggestedTime} onChange={(e) => p.setNewSuggestedTime(e.target.value)} placeholder="Suggested speaking time" style={inputStyle} />
      <input type="file" accept="image/*" onChange={(e) => p.onPromptImageChange(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
      {p.newPromptImagePreviewUrl ? (
        <div style={{ display: "grid", gap: 6 }}>
          <img src={p.newPromptImagePreviewUrl} alt="Prompt preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd" }} />
          <button type="button" onClick={p.onClearPromptImage} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>Remove image</button>
        </div>
      ) : null}
      <button type="button" onClick={p.onSavePrompt} disabled={p.isSavingPrompt} style={{ minHeight: 38, borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800 }}>{p.isSavingPrompt ? "Saving..." : "Save prompt"}</button>
    </div> : null}

    {p.promptSuccess ? <div style={{ fontSize: 13, color: "#166534", marginBottom: 8 }}>{p.promptSuccess}</div> : null}
    {p.promptError ? <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }}>{p.promptError}</div> : null}

    {showBulkHideButton ? (
      <div style={{ marginBottom: 10 }}>
        <button type="button" onClick={p.onClearVisiblePromptsForSelectedClass} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 10px" }}>
          Hide all visible for {p.selectedClassName}
        </button>
      </div>
    ) : null}

    <div style={{ marginTop: 10 }}>
      {p.filteredPrompts.map((prompt) => {
        const isVisible = Boolean(prompt.is_active);
        const assignmentValue = p.promptAssignmentDrafts[prompt.id] ?? (prompt.class_name?.trim() || "");
        return <div key={prompt.id} style={{ border: "1px solid #e2e8f0", padding: 10, borderRadius: 12, marginBottom: 8, background: "#fff" }}>
          {prompt.prompt_image_url ? <img src={prompt.prompt_image_url} alt="Prompt" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} /> : null}
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{prompt.prompt_text}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Assignment: {prompt.class_name?.trim() || "Unassigned"}</div>
          {prompt.suggested_time ? <div style={{ fontSize: 12, color: "#64748b" }}>Suggested time: {prompt.suggested_time}</div> : null}
          <div style={{ fontSize: 12, color: isVisible ? "#0f766e" : "#64748b", marginBottom: 8 }}>Visibility: {isVisible ? "Shown to students" : "Hidden from students"}</div>

          {isAssignmentEditable ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
              <select value={assignmentValue} onChange={(e) => p.setPromptAssignmentDrafts((prev) => ({ ...prev, [prompt.id]: e.target.value }))} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", padding: "0 8px", fontSize: 13 }}>
                <option value="">Unassigned</option>
                {p.classNameOptions.map((className) => <option key={`${prompt.id}-${className}`} value={className}>{className}</option>)}
              </select>
              <button type="button" onClick={() => p.onSavePromptAssignment(prompt.id)} disabled={Boolean(p.savingPromptAssignmentById[prompt.id])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>Save class</button>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => p.onTogglePromptVisibility(prompt)} disabled={Boolean(p.savingPromptVisibilityById[prompt.id])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>{isVisible ? "Hide" : "Show"} for students</button>
            <button type="button" onClick={() => p.onDeletePrompt(prompt)} disabled={Boolean(p.deletingPromptById[prompt.id])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>Delete permanently</button>
          </div>
        </div>;
      })}
      {!p.filteredPrompts.length ? <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", padding: 10 }}>No prompts yet for this class.</div> : null}
    </div>
  </section>;
}
