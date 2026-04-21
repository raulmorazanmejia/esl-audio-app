import React from "react";
import { PromptRow } from "../TeacherDashboardTypes";

type Props = {
  mode?: "library" | "class";
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
  onTogglePromptAssignment: (prompt: PromptRow, className: string, shouldAssign: boolean) => void;
  onTogglePromptVisibility: (prompt: PromptRow, className: string) => void;
  onRemovePromptFromClass: (prompt: PromptRow, className: string) => void;
  onDeletePrompt: (prompt: PromptRow) => void;
  savingPromptVisibilityById: Record<string, boolean>;
  deletingPromptById: Record<string, boolean>;
  onClearVisiblePromptsForSelectedClass: () => void;
  classNameOptions: string[];
  isAssignmentEditable?: boolean;
  showCreateForm?: boolean;
  showBulkHideButton?: boolean;
  assignedPrompts?: PromptRow[];
  allLibraryPrompts?: PromptRow[];
  showPromptLibraryTabs?: boolean;
  emptyAssignedStateText?: string;
  emptyLibraryStateText?: string;
  emptyStateText?: string;
  onHeaderAction?: () => void;
  headerActionLabel?: string;
  createClassName: string;
  setCreateClassName: (v: string) => void;
  showCreateClassPicker?: boolean;
};

const inputStyle: React.CSSProperties = { minHeight: 38, borderRadius: 10, border: "1px solid #dbe3f0", background: "#f8fafc", padding: "0 10px" };

export default function TeacherPromptPanel(props: Props) {
  const p = props;
  const [activePromptView, setActivePromptView] = React.useState<"assigned" | "library">("assigned");
  const [expandedImagePromptId, setExpandedImagePromptId] = React.useState<string | null>(null);
  const title = p.title ?? "Prompt library";
  const createPromptLabel = p.createPromptLabel ?? `Create a prompt for ${p.selectedClassName}`;
  const isAssignmentEditable = p.isAssignmentEditable !== false;
  const showCreateForm = p.showCreateForm !== false;
  const showBulkHideButton = p.showBulkHideButton !== false;
  const showPromptLibraryTabs = Boolean(p.showPromptLibraryTabs);

  React.useEffect(() => {
    setActivePromptView("assigned");
  }, [p.selectedClassName, showPromptLibraryTabs]);

  const assignedPrompts = p.assignedPrompts ?? p.filteredPrompts;
  const allLibraryPrompts = p.allLibraryPrompts ?? p.filteredPrompts;
  const visiblePrompts = showPromptLibraryTabs ? (activePromptView === "assigned" ? assignedPrompts : allLibraryPrompts) : p.filteredPrompts;

  const emptyStateText = showPromptLibraryTabs
    ? activePromptView === "assigned"
      ? p.emptyAssignedStateText ?? `No prompts are currently assigned to ${p.selectedClassName}.`
      : p.emptyLibraryStateText ?? "No prompts found in the full library."
    : p.emptyStateText ?? `No prompts yet for this class.`;

  return <section>
    <div style={{ fontWeight: 900, fontSize: 22 }}>{title}</div>
    {showCreateForm ? <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{createPromptLabel}</div> : null}
    {p.onHeaderAction && p.headerActionLabel ? <button type="button" onClick={p.onHeaderAction} style={{ marginTop: 8, minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "0 10px", fontWeight: 700 }}>{p.headerActionLabel}</button> : null}

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

    {showPromptLibraryTabs ? (
      <div style={{ display: "inline-flex", border: "1px solid #cbd5e1", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActivePromptView("assigned")}
          style={{ minHeight: 34, border: "none", background: activePromptView === "assigned" ? "#0f172a" : "#fff", color: activePromptView === "assigned" ? "#fff" : "#334155", padding: "0 12px", fontWeight: 700 }}
        >
          Assigned to this class ({assignedPrompts.length})
        </button>
        <button
          type="button"
          onClick={() => setActivePromptView("library")}
          style={{ minHeight: 34, border: "none", borderLeft: "1px solid #cbd5e1", background: activePromptView === "library" ? "#0f172a" : "#fff", color: activePromptView === "library" ? "#fff" : "#334155", padding: "0 12px", fontWeight: 700 }}
        >
          All prompts library ({allLibraryPrompts.length})
        </button>
      </div>
    ) : null}

    <div style={{ marginTop: 10 }}>
      {visiblePrompts.map((prompt) => {
        const fallbackClass = prompt.class_name?.trim();
        const normalizedAssignments = (prompt.prompt_assignments ?? [])
          .map((row) => ({ className: row.class_name.trim(), isVisible: Boolean(row.is_visible) }))
          .filter((row) => Boolean(row.className));
        const currentAssignments = normalizedAssignments.length
          ? normalizedAssignments
          : (fallbackClass ? [{ className: fallbackClass, isVisible: Boolean(prompt.is_active) }] : []);
        const selectedClassAssignment = prompt.prompt_assignments?.find((row) => row.class_name === p.selectedClassName);
        const selectedClassVisible = selectedClassAssignment ? Boolean(selectedClassAssignment.is_visible) : false;
        const isLibraryMode = p.mode === "library";
        return <div key={prompt.id} style={{ border: "1px solid #e2e8f0", padding: 10, borderRadius: 12, marginBottom: 8, background: "#fff" }}>
          {prompt.prompt_image_url ? <div style={{ marginBottom: 8 }}>
            <img src={prompt.prompt_image_url} alt="Prompt" style={{ width: "100%", maxHeight: expandedImagePromptId === prompt.id ? 420 : 160, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />
            <button type="button" onClick={() => setExpandedImagePromptId((prev) => prev === prompt.id ? null : prompt.id)} style={{ minHeight: 30, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, padding: "0 8px" }}>
              {expandedImagePromptId === prompt.id ? "Show thumbnail" : "Full preview"}
            </button>
          </div> : null}
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{prompt.prompt_text}</div>
          {isLibraryMode ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, marginBottom: 4 }}>
            {currentAssignments.length ? currentAssignments.map((assignment) => (
              <span
                key={`${prompt.id}-assigned-${assignment.className}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: `1px solid ${assignment.isVisible ? "#99f6e4" : "#cbd5e1"}`,
                  borderRadius: 999,
                  padding: "3px 8px",
                  fontSize: 12,
                  color: assignment.isVisible ? "#0f766e" : "#475569",
                  background: assignment.isVisible ? "#f0fdfa" : "#f8fafc",
                }}
              >
                {assignment.className} · {assignment.isVisible ? "Visible" : "Hidden"}
              </span>
            )) : <span style={{ fontSize: 12, color: "#64748b" }}>Unassigned</span>}
          </div> : null}
          {prompt.suggested_time ? <div style={{ fontSize: 12, color: "#64748b" }}>Suggested time: {prompt.suggested_time}</div> : null}
          {prompt.example_text ? <div style={{ fontSize: 12, color: "#64748b" }}>Example: {prompt.example_text}</div> : null}
          {prompt.created_at ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Created: {new Date(prompt.created_at).toLocaleString()}</div> : null}
          {p.selectedClassName && p.selectedClassName !== "Assignment Library" ? (
            <div style={{ fontSize: 12, color: selectedClassVisible ? "#0f766e" : "#64748b", marginBottom: 8 }}>
              Status: Assigned to {p.selectedClassName} · {selectedClassVisible ? "Visible to students" : "Hidden from students"}
            </div>
          ) : null}

          {isAssignmentEditable && isLibraryMode ? (
            <div style={{ display: "grid", gap: 6, marginBottom: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.classNameOptions.map((className) => {
                  const checked = currentAssignments.some((assignment) => assignment.className === className);
                  return (
                    <label key={`${prompt.id}-${className}`} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => p.onTogglePromptAssignment(prompt, className, !checked)}
                      />
                      {className}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {!isLibraryMode && p.selectedClassName && p.selectedClassName !== "Assignment Library" && selectedClassAssignment ? (
              <button type="button" onClick={() => p.onTogglePromptVisibility(prompt, p.selectedClassName)} disabled={Boolean(p.savingPromptVisibilityById[`${prompt.id}:${p.selectedClassName}`])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>
                {selectedClassVisible ? "Hide from students" : "Show to students"}
              </button>
            ) : null}
            {!isLibraryMode && selectedClassAssignment ? (
              <button type="button" onClick={() => p.onRemovePromptFromClass(prompt, p.selectedClassName)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>
                Remove from {p.selectedClassName}
              </button>
            ) : null}
            {isLibraryMode ? <button type="button" onClick={() => p.onDeletePrompt(prompt)} disabled={Boolean(p.deletingPromptById[prompt.id])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontSize: 13, fontWeight: 700, padding: "0 10px" }}>Delete permanently</button> : null}
          </div>
        </div>;
      })}
      {!visiblePrompts.length ? <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", padding: 10 }}>{emptyStateText}</div> : null}
    </div>
  </section>;
}
