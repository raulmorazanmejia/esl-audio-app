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

export default function TeacherPromptPanel(props: Props) {
  const p = props;
  const title = p.title ?? "Prompt library";
  const createPromptLabel = p.createPromptLabel ?? `Create a prompt for ${p.selectedClassName}`;
  const isAssignmentEditable = p.isAssignmentEditable !== false;
  const showCreateForm = p.showCreateForm !== false;
  const showBulkHideButton = p.showBulkHideButton !== false;

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22 }}>{title}</div>
    {showCreateForm ? <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>{createPromptLabel}</div> : null}
    {showCreateForm ? <div style={{ display: "grid", gap: 8, margin: "10px 0" }}>
      <input value={p.newPrompt} onChange={(e) => p.setNewPrompt(e.target.value)} placeholder="Type a new prompt" />
      <input value={p.newSuggestedTime} onChange={(e) => p.setNewSuggestedTime(e.target.value)} placeholder="Suggested speaking time" />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => p.onPromptImageChange(e.target.files?.[0] ?? null)}
      />
      {p.newPromptImagePreviewUrl ? (
        <div style={{ display: "grid", gap: 6 }}>
          <img src={p.newPromptImagePreviewUrl} alt="Prompt preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd" }} />
          <button type="button" onClick={p.onClearPromptImage}>Remove image</button>
        </div>
      ) : null}
      <button type="button" onClick={p.onSavePrompt} disabled={p.isSavingPrompt}>{p.isSavingPrompt ? "Saving..." : "Save"}</button>
    </div> : null}
    {p.promptSuccess ? <div>{p.promptSuccess}</div> : null}
    {p.promptError ? <div>{p.promptError}</div> : null}
    <div style={{ display: "flex", gap: 8 }}>
      {showBulkHideButton ? (
      <button type="button" onClick={p.onClearVisiblePromptsForSelectedClass}>Hide all visible for {p.selectedClassName}</button>
      ) : null}
    </div>
    <div style={{ marginTop: 10 }}>
      {p.filteredPrompts.map((prompt) => {
        const isVisible = Boolean(prompt.is_active);
        const assignmentValue = p.promptAssignmentDrafts[prompt.id] ?? (prompt.class_name?.trim() || "");
        return <div key={prompt.id} style={{ border: "1px solid #ddd", padding: 10, borderRadius: 10, marginBottom: 8 }}>
          {prompt.prompt_image_url ? <img src={prompt.prompt_image_url} alt="Prompt" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} /> : null}
          <div>{prompt.prompt_text}</div>
          <div style={{ fontSize: 12, color: "#666" }}>Assignment: {prompt.class_name?.trim() || "Unassigned"}</div>
          {prompt.suggested_time ? <div style={{ fontSize: 12, color: "#666" }}>Suggested time: {prompt.suggested_time}</div> : null}
          {isAssignmentEditable ? (
            <>
              <select value={assignmentValue} onChange={(e) => p.setPromptAssignmentDrafts((prev) => ({ ...prev, [prompt.id]: e.target.value }))}>
                <option value="">Unassigned</option>
                {p.classNameOptions.map((className) => <option key={`${prompt.id}-${className}`} value={className}>{className}</option>)}
              </select>
              <button type="button" onClick={() => p.onSavePromptAssignment(prompt.id)} disabled={Boolean(p.savingPromptAssignmentById[prompt.id])}>Save class</button>
            </>
          ) : null}
          <button type="button" onClick={() => p.onTogglePromptVisibility(prompt)} disabled={Boolean(p.savingPromptVisibilityById[prompt.id])}>{isVisible ? "Hide" : "Show"} to students</button>
          <button type="button" onClick={() => p.onDeletePrompt(prompt)} disabled={Boolean(p.deletingPromptById[prompt.id])}>Delete</button>
        </div>;
      })}
      {!p.filteredPrompts.length ? <div>No prompts in this view.</div> : null}
    </div>
  </section>;
}
