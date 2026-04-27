import React from "react";
import { AssignmentActivityType, PromptRow } from "../TeacherDashboardTypes";

type Props = {
  totalPromptCount: number;
  classNameOptions: string[];
  unassignedPromptCount: number;
  prompts: PromptRow[];
  newPrompt: string;
  newSuggestedTime: string;
  newAssignmentType: AssignmentActivityType;
  newInstructions: string;
  newExternalUrl: string;
  newPromptImagePreviewUrl: string;
  setNewPrompt: (value: string) => void;
  setNewSuggestedTime: (value: string) => void;
  setNewAssignmentType: (value: AssignmentActivityType) => void;
  setNewInstructions: (value: string) => void;
  setNewExternalUrl: (value: string) => void;
  onPromptImageChange: (file: File | null) => void;
  onClearPromptImage: () => void;
  onSavePrompt: () => void;
  isSavingPrompt: boolean;
  promptSuccess: string;
  promptError: string;
  onTogglePromptAssignment: (prompt: PromptRow, className: string, shouldAssign: boolean) => void;
  onTogglePromptVisibility: (prompt: PromptRow, className: string) => void;
  onRemovePromptFromClass: (prompt: PromptRow, className: string) => void;
  onDeletePrompt: (prompt: PromptRow) => void;
  savingPromptVisibilityById: Record<string, boolean>;
  removingPromptFromClassById: Record<string, boolean>;
  deletingPromptById: Record<string, boolean>;
  onGoToClasses: () => void;
};

type CategoryId = "speaking" | "picture" | "text" | "external" | "video" | "all";

type ActivityCategory = {
  id: CategoryId;
  title: string;
  description: string;
  icon: string;
  createButtonLabel?: string;
  createTypeLabel?: string;
  assignmentType?: AssignmentActivityType;
  includesPromptImages?: boolean;
};

const inputStyle: React.CSSProperties = { minHeight: 42, borderRadius: 12, border: "1px solid #dbe3f0", background: "#fff", padding: "0 12px", fontSize: 14, color: "#0f172a" };
const textareaStyle: React.CSSProperties = { minHeight: 96, borderRadius: 12, border: "1px solid #dbe3f0", background: "#fff", padding: "10px 12px", fontSize: 14, color: "#0f172a", resize: "vertical" };

const activityCategories: ActivityCategory[] = [
  {
    id: "speaking",
    title: "Speaking / Audio response",
    description: "Students record a voice response without a required picture prompt.",
    icon: "🎙️",
    createButtonLabel: "Create speaking activity",
    createTypeLabel: "Speaking / Audio response",
    assignmentType: "audio_response",
    includesPromptImages: false,
  },
  {
    id: "picture",
    title: "Describe a picture",
    description: "Students describe and respond to a visual prompt.",
    icon: "🖼️",
    createButtonLabel: "Create picture activity",
    createTypeLabel: "Describe a picture",
    assignmentType: "audio_response",
    includesPromptImages: true,
  },
  {
    id: "text",
    title: "Text response",
    description: "Students write a short text response.",
    icon: "✍️",
    createButtonLabel: "Create text activity",
    createTypeLabel: "Text response",
    assignmentType: "text_response",
  },
  {
    id: "external",
    title: "External link",
    description: "Send students to an outside activity like a form, website, or video.",
    icon: "🔗",
    createButtonLabel: "Create link activity",
    createTypeLabel: "External link",
    assignmentType: "external_link",
  },
  {
    id: "video",
    title: "Video response",
    description: "Students submit a recorded video response.",
    icon: "🎥",
    createButtonLabel: "Create video activity",
    createTypeLabel: "Video response",
    assignmentType: "video_response",
  },
  {
    id: "all",
    title: "All activities",
    description: "View and manage every activity in one place.",
    icon: "📚",
  },
];

function hasPromptImage(prompt: PromptRow) {
  return Boolean(prompt.prompt_image_url || prompt.prompt_image_path);
}

function categoryMatchesPrompt(categoryId: CategoryId, prompt: PromptRow) {
  const type = prompt.assignment_type;
  const hasImage = hasPromptImage(prompt);

  if (categoryId === "all") return true;
  if (categoryId === "speaking") return type === "audio_response" && !hasImage;
  if (categoryId === "picture") return type === "audio_response" && hasImage;
  if (categoryId === "text") return type === "text_response";
  if (categoryId === "external") return type === "external_link";
  if (categoryId === "video") return type === "video_response";
  return false;
}

function typeLabel(type: AssignmentActivityType | null, hasImage: boolean) {
  if (type === "external_link") return "External link";
  if (type === "video_response") return "Video response";
  if (type === "text_response") return "Text response";
  if (type === "audio_response" && hasImage) return "Describe a picture";
  if (type === "audio_response") return "Speaking / Audio response";
  if (type === "guided_speaking") return "Guided speaking";
  if (type === "multiple_choice") return "Multiple choice";
  return "Audio response";
}

function instructionsPreview(value?: string | null) {
  if (!value) return "No instructions added.";
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

export default function TeacherAssignmentLibrary(props: Props) {
  const [activeCategoryId, setActiveCategoryId] = React.useState<CategoryId | null>(null);
  const [isCreatingInCategory, setIsCreatingInCategory] = React.useState(false);

  const activeCategory = activityCategories.find((category) => category.id === activeCategoryId) ?? null;
  const categoryCounts = React.useMemo(() => {
    return activityCategories.reduce<Record<CategoryId, number>>((acc, category) => {
      acc[category.id] = props.prompts.filter((prompt) => categoryMatchesPrompt(category.id, prompt)).length;
      return acc;
    }, { speaking: 0, picture: 0, text: 0, external: 0, video: 0, all: 0 });
  }, [props.prompts]);

  const categoryPrompts = React.useMemo(() => {
    if (!activeCategoryId) return [];
    return props.prompts.filter((prompt) => categoryMatchesPrompt(activeCategoryId, prompt));
  }, [activeCategoryId, props.prompts]);

  React.useEffect(() => {
    if (!isCreatingInCategory || !activeCategory?.assignmentType) return;
    props.setNewAssignmentType(activeCategory.assignmentType);
    if (activeCategory.assignmentType !== "external_link") {
      props.setNewExternalUrl("");
    }
  }, [activeCategory, isCreatingInCategory]);

  React.useEffect(() => {
    if (props.promptSuccess && isCreatingInCategory) {
      setIsCreatingInCategory(false);
    }
  }, [isCreatingInCategory, props.promptSuccess]);

  const showImageUpload = activeCategoryId === "speaking" || activeCategoryId === "picture";
  const showExternalUrl = activeCategoryId === "external";
  const suggestedTimePlaceholder = activeCategoryId === "speaking" || activeCategoryId === "picture" ? "Suggested speaking time" : "Suggested time (optional)";

  return (
    <>
      <section style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,0.05)", padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Activities</div>
        <div style={{ fontSize: 29, fontWeight: 900, lineHeight: 1.15 }}>Category-first Activity Library</div>
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
          {props.totalPromptCount} activities total • {props.unassignedPromptCount} unassigned • {props.classNameOptions.length} classes available for assignment
        </div>
        <div>
          <button
            type="button"
            onClick={props.onGoToClasses}
            style={{ marginTop: 12, minHeight: 36, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "0 12px", fontWeight: 700 }}
          >
            Back to classes workspace
          </button>
        </div>
      </section>

      <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}>
        {props.promptSuccess ? <div style={{ fontSize: 13, color: "#166534", marginBottom: 10 }}>{props.promptSuccess}</div> : null}
        {props.promptError ? <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 10 }}>{props.promptError}</div> : null}

        {!activeCategory ? (
          <>
            <div style={{ fontWeight: 900, fontSize: 22 }}>Activity categories</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 12 }}>Choose a category to create and manage activities in the same workspace.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {activityCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setIsCreatingInCategory(false);
                  }}
                  style={{ textAlign: "left", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", padding: 12, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }} aria-hidden="true">{category.icon}</span>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{category.title}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#334155", border: "1px solid #cbd5e1", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>{categoryCounts[category.id]}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{category.description}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveCategoryId(null);
                setIsCreatingInCategory(false);
              }}
              style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "0 10px", fontSize: 12, fontWeight: 700 }}
            >
              Back to categories
            </button>

            <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>{activeCategory.title}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{activeCategory.description}</div>
              </div>

              {activeCategory.id !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingInCategory((prev) => !prev);
                  }}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #0f172a", background: isCreatingInCategory ? "#fff" : "#0f172a", color: isCreatingInCategory ? "#0f172a" : "#fff", padding: "0 12px", fontWeight: 800 }}
                >
                  {isCreatingInCategory ? "Cancel" : activeCategory.createButtonLabel}
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>Choose a category to create a new activity.</div>
              )}
            </div>

            {isCreatingInCategory && activeCategory.id !== "all" ? (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12, display: "grid", gap: 8, marginTop: 12 }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{activeCategory.createTypeLabel}</div>
                <input value={props.newPrompt} onChange={(e) => props.setNewPrompt(e.target.value)} placeholder="Activity title" style={inputStyle} />

                <textarea
                  value={props.newInstructions}
                  onChange={(e) => props.setNewInstructions(e.target.value)}
                  placeholder={activeCategory.id === "external" ? "Instructions (optional)" : "Instructions / prompt"}
                  style={textareaStyle}
                />

                <input value={props.newSuggestedTime} onChange={(e) => props.setNewSuggestedTime(e.target.value)} placeholder={suggestedTimePlaceholder} style={inputStyle} />

                {showExternalUrl ? <input value={props.newExternalUrl} onChange={(e) => props.setNewExternalUrl(e.target.value)} placeholder="External URL (required)" style={inputStyle} /> : null}

                {showImageUpload ? (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      {activeCategory.id === "picture" ? "Prompt image (recommended for this activity)" : "Prompt image (optional)"}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => props.onPromptImageChange(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
                    {props.newPromptImagePreviewUrl ? (
                      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                        <img src={props.newPromptImagePreviewUrl} alt="Prompt preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd" }} />
                        <button type="button" onClick={props.onClearPromptImage} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}>
                          Remove image
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button type="button" onClick={props.onSavePrompt} disabled={props.isSavingPrompt} style={{ minHeight: 40, borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800 }}>
                  {props.isSavingPrompt ? "Saving..." : activeCategory.createButtonLabel}
                </button>
              </div>
            ) : null}

            {categoryPrompts.length ? (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {categoryPrompts.map((prompt) => {
                  const assignedRows = (prompt.prompt_assignments ?? [])
                    .map((assignment) => ({ className: assignment.class_name.trim(), isVisible: Boolean(assignment.is_visible) }))
                    .filter((assignment) => Boolean(assignment.className));
                  const isAssigned = assignedRows.length > 0;

                  return (
                    <article key={prompt.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{prompt.prompt_text || "Untitled activity"}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, border: "1px solid #cbd5e1", padding: "3px 9px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#475569", background: "#f8fafc" }}>
                              {typeLabel(prompt.assignment_type, hasPromptImage(prompt))}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, border: `1px solid ${isAssigned ? "#99f6e4" : "#cbd5e1"}`, padding: "3px 9px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: isAssigned ? "#0f766e" : "#475569", background: isAssigned ? "#f0fdfa" : "#f8fafc" }}>
                              {isAssigned ? "Assigned" : "Unassigned"}
                            </span>
                          </div>
                        </div>
                        {prompt.created_at ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Created {new Date(prompt.created_at).toLocaleDateString()}</div> : null}
                      </div>

                      {prompt.prompt_image_url ? <img src={prompt.prompt_image_url} alt="Activity prompt" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, marginTop: 10, border: "1px solid #e2e8f0" }} /> : null}

                      <div style={{ fontSize: 13, color: "#475569", marginTop: 8 }}>{instructionsPreview(prompt.example_text)}</div>
                      {prompt.suggested_time ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Suggested time: {prompt.suggested_time}</div> : null}
                      {prompt.external_url ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>External URL: {prompt.external_url}</div> : null}

                      <div style={{ marginTop: 10, borderTop: "1px dashed #e2e8f0", paddingTop: 10 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 6 }}>Assign to class</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {props.classNameOptions.map((className) => {
                            const checked = assignedRows.some((assignment) => assignment.className === className);
                            return (
                              <label key={`${prompt.id}-${className}`} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", background: "#fff" }}>
                                <input type="checkbox" checked={checked} onChange={() => props.onTogglePromptAssignment(prompt, className, !checked)} />
                                {className}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {assignedRows.length ? (
                        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                          {assignedRows.map((assignment) => {
                            const savingKey = `${prompt.id}:${assignment.className}`;
                            const isSavingVisibility = Boolean(props.savingPromptVisibilityById[savingKey]);
                            const isRemoving = Boolean(props.removingPromptFromClassById[savingKey]);
                            return (
                              <div key={`${prompt.id}-${assignment.className}-controls`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 8px", background: "#f8fafc", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, color: "#334155" }}>
                                  {assignment.className} · {assignment.isVisible ? "Visible" : "Hidden"}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  <button type="button" onClick={() => props.onTogglePromptVisibility(prompt, assignment.className)} disabled={isSavingVisibility} style={{ minHeight: 30, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, padding: "0 8px" }}>
                                    {assignment.isVisible ? "Hide" : "Show"}
                                  </button>
                                  <button type="button" onClick={() => props.onRemovePromptFromClass(prompt, assignment.className)} disabled={isRemoving} style={{ minHeight: 30, borderRadius: 8, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontSize: 12, fontWeight: 700, padding: "0 8px" }}>
                                    {isRemoving ? "Removing..." : "Remove"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" disabled style={{ minHeight: 34, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#94a3b8", fontSize: 12, fontWeight: 700, padding: "0 10px", cursor: "not-allowed" }}>
                          Edit (not available)
                        </button>
                        <button type="button" onClick={() => props.onDeletePrompt(prompt)} disabled={Boolean(props.deletingPromptById[prompt.id])} style={{ minHeight: 34, borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontSize: 12, fontWeight: 700, padding: "0 10px" }}>
                          {props.deletingPromptById[prompt.id] ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", padding: 10, marginTop: 12 }}>
                No activities in this category yet.
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
