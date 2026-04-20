import React from "react";
import { PromptRow } from "../TeacherDashboardTypes";

type Props = {
  selectedClassName: string;
  newPrompt: string;
  newSuggestedTime: string;
  newPromptClassName: string;
  setNewPrompt: (v: string) => void;
  setNewSuggestedTime: (v: string) => void;
  setNewPromptClassName: (v: string) => void;
  classNameOptions: string[];
  onSavePrompt: () => void;
  isSavingPrompt: boolean;
  promptSuccess: string;
  promptError: string;
  promptListFilter: string;
  setPromptListFilter: (v: string) => void;
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
};

export default function TeacherPromptPanel(props: Props) {
  const p = props;
  return <section>
    <div style={{ fontWeight: 900, fontSize: 22 }}>Prompt library</div>
    <div style={{ display: "grid", gap: 8, margin: "10px 0" }}>
      <input value={p.newPrompt} onChange={(e) => p.setNewPrompt(e.target.value)} placeholder="Type a new prompt" />
      <input value={p.newSuggestedTime} onChange={(e) => p.setNewSuggestedTime(e.target.value)} placeholder="Suggested speaking time" />
      <select value={p.newPromptClassName} onChange={(e) => p.setNewPromptClassName(e.target.value)}>
        <option value="">Unassigned (teacher-only)</option>
        {p.classNameOptions.map((className) => <option key={className} value={className}>{className}</option>)}
      </select>
      <button type="button" onClick={p.onSavePrompt} disabled={p.isSavingPrompt}>{p.isSavingPrompt ? "Saving..." : "Save"}</button>
    </div>
    {p.promptSuccess ? <div>{p.promptSuccess}</div> : null}
    {p.promptError ? <div>{p.promptError}</div> : null}
    <div style={{ display: "flex", gap: 8 }}>
      <select value={p.promptListFilter} onChange={(e) => p.setPromptListFilter(e.target.value)}>
        <option value="__all_prompts__">All assigned to this class</option>
        <option value="__unassigned_only__">Unassigned prompts</option>
      </select>
      <button type="button" onClick={p.onClearVisiblePromptsForSelectedClass}>Hide all visible for {p.selectedClassName}</button>
    </div>
    <div style={{ marginTop: 10 }}>
      {p.filteredPrompts.map((prompt) => {
        const isVisible = Boolean(prompt.is_active);
        const assignmentValue = p.promptAssignmentDrafts[prompt.id] ?? (prompt.class_name?.trim() || "");
        return <div key={prompt.id} style={{ border: "1px solid #ddd", padding: 10, borderRadius: 10, marginBottom: 8 }}>
          <div>{prompt.prompt_text}</div>
          <div style={{ fontSize: 12, color: "#666" }}>Assignment: {prompt.class_name?.trim() || "Unassigned"}</div>
          <select value={assignmentValue} onChange={(e) => p.setPromptAssignmentDrafts((prev) => ({ ...prev, [prompt.id]: e.target.value }))}>
            <option value="">Unassigned</option>
            {p.classNameOptions.map((className) => <option key={`${prompt.id}-${className}`} value={className}>{className}</option>)}
          </select>
          <button type="button" onClick={() => p.onSavePromptAssignment(prompt.id)} disabled={Boolean(p.savingPromptAssignmentById[prompt.id])}>Save class</button>
          <button type="button" onClick={() => p.onTogglePromptVisibility(prompt)} disabled={Boolean(p.savingPromptVisibilityById[prompt.id])}>{isVisible ? "Hide" : "Show"} to students</button>
          <button type="button" onClick={() => p.onDeletePrompt(prompt)} disabled={Boolean(p.deletingPromptById[prompt.id])}>Delete</button>
        </div>;
      })}
      {!p.filteredPrompts.length ? <div>No prompts in this view.</div> : null}
    </div>
  </section>;
}
