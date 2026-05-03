import React from "react";
import { AssignmentActivityType, LessonBlock, LessonBlockType, LessonSourceKind, PromptRow } from "../TeacherDashboardTypes";
import { ExternalActivityLink, parseExternalActivityData } from "../../lib/externalLinks";

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
  newExternalLinks: ExternalActivityLink[];
  newLessonBlocks: LessonBlock[];
  newPromptImagePreviewUrl: string;
  setNewPrompt: (value: string) => void;
  setNewSuggestedTime: (value: string) => void;
  setNewAssignmentType: (value: AssignmentActivityType) => void;
  setNewInstructions: (value: string) => void;
  setNewExternalUrl: (value: string) => void;
  onExternalLinkChange: (index: number, patch: Partial<ExternalActivityLink>) => void;
  onAddExternalLink: () => void;
  onRemoveExternalLink: (index: number) => void;
  setNewLessonBlocks: React.Dispatch<React.SetStateAction<LessonBlock[]>>;
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
  selectedCategoryId: CategoryId;
};

type CategoryId = "speaking" | "picture" | "text" | "external" | "video" | "lesson" | "all";

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
const LESSON_BLOCK_TYPES: LessonBlockType[] = ["source", "grammar_explanation", "multiple_choice", "speaking_task", "writing_task"];
const SOURCE_KINDS: LessonSourceKind[] = ["text", "video", "image"];

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
    id: "lesson",
    title: "Lesson",
    description: "Create a lesson activity shown like other assignments.",
    icon: "📘",
    createButtonLabel: "Create lesson activity",
    createTypeLabel: "Lesson",
    assignmentType: "lesson",
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
  if (categoryId === "lesson") return type === "lesson";
  return false;
}

function typeLabel(type: AssignmentActivityType | null, hasImage: boolean) {
  if (type === "external_link") return "External link";
  if (type === "video_response") return "Video response";
  if (type === "text_response") return "Text response";
  if (type === "audio_response" && hasImage) return "Describe a picture";
  if (type === "audio_response") return "Speaking / Audio response";
  if (type === "lesson") return "Lesson";
  if (type === "guided_speaking") return "Guided speaking";
  if (type === "multiple_choice") return "Multiple choice";
  return "Audio response";
}

function instructionsPreview(value?: string | null) {
  if (!value) return "No instructions added.";
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

export default function TeacherAssignmentLibrary(props: Props) {
  const [isCreatingInCategory, setIsCreatingInCategory] = React.useState(false);
  const [creationCategoryId, setCreationCategoryId] = React.useState<CategoryId | null>(null);

  const activeCategoryId = props.selectedCategoryId;
  const activeCategory = activityCategories.find((category) => category.id === activeCategoryId) ?? null;
  const categoryCounts = React.useMemo(() => {
    return activityCategories.reduce<Record<CategoryId, number>>((acc, category) => {
      acc[category.id] = props.prompts.filter((prompt) => categoryMatchesPrompt(category.id, prompt)).length;
      return acc;
    }, { speaking: 0, picture: 0, text: 0, external: 0, video: 0, lesson: 0, all: 0 });
  }, [props.prompts]);

  const categoryPrompts = React.useMemo(() => {
    return props.prompts.filter((prompt) => categoryMatchesPrompt(activeCategoryId, prompt));
  }, [activeCategoryId, props.prompts]);

  const resolvedCreationCategory = creationCategoryId ? activityCategories.find((category) => category.id === creationCategoryId) ?? null : null;
  const effectiveCreationCategory = activeCategoryId === "all" ? resolvedCreationCategory : activeCategory;

  React.useEffect(() => {
    if (!isCreatingInCategory || !effectiveCreationCategory?.assignmentType) return;
    props.setNewAssignmentType(effectiveCreationCategory.assignmentType);
    if (effectiveCreationCategory.assignmentType !== "external_link") {
      props.setNewExternalUrl("");
    }
  }, [effectiveCreationCategory, isCreatingInCategory]);

  React.useEffect(() => {
    if (props.promptSuccess && isCreatingInCategory) {
      setIsCreatingInCategory(false);
    }
  }, [isCreatingInCategory, props.promptSuccess]);

  const showImageUpload = effectiveCreationCategory?.id === "speaking" || effectiveCreationCategory?.id === "picture";
  const showExternalUrl = effectiveCreationCategory?.id === "external";
  const showLessonBuilder = effectiveCreationCategory?.id === "lesson";
  const suggestedTimePlaceholder = effectiveCreationCategory?.id === "speaking" || effectiveCreationCategory?.id === "picture" ? "Suggested speaking time" : "Suggested time (optional)";
  const addLessonBlock = () => {
    props.setNewLessonBlocks((prev) => [...prev, { type: "source", source_kind: "text", content: "" }]);
  };

  return (
    <>
      <section style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,0.05)", padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Activities</div>
        <div style={{ fontSize: 29, fontWeight: 900, lineHeight: 1.15 }}>Activity library</div>
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

        {activeCategory ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>{activeCategory.title}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{activeCategory.description} • {categoryCounts[activeCategory.id]} total</div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingInCategory) {
                      setIsCreatingInCategory(false);
                      setCreationCategoryId(null);
                      return;
                    }
                    setIsCreatingInCategory(true);
                    if (activeCategory.id !== "all") setCreationCategoryId(activeCategory.id);
                  }}
                  style={{ minHeight: 40, borderRadius: 10, border: "1px solid #0f172a", background: isCreatingInCategory ? "#fff" : "#0f172a", color: isCreatingInCategory ? "#0f172a" : "#fff", padding: "0 14px", fontWeight: 800 }}
                >
                  {isCreatingInCategory ? "Cancel" : "+ Create activity"}
                </button>
              </div>
            </div>

            {isCreatingInCategory ? (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12, display: "grid", gap: 8, marginTop: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>Activity type</span>
                  <select
                    value={effectiveCreationCategory?.id ?? ""}
                    onChange={(e) => setCreationCategoryId(e.target.value || null)}
                    style={{ ...inputStyle, borderRadius: 999, minHeight: 42, padding: "0 14px", fontWeight: 700, background: "#fff" }}
                  >
                    <option value="" disabled>Select activity type</option>
                    <option value="speaking">Speaking / Audio response</option>
                    <option value="picture">Describe a picture</option>
                    <option value="text">Text response</option>
                    <option value="external">External link</option>
                    <option value="video">Video response</option>
                    <option value="lesson">Lesson (beta)</option>
                  </select>
                </label>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{effectiveCreationCategory?.createTypeLabel ?? "Choose an activity type"}</div>
                <input disabled={!effectiveCreationCategory} value={props.newPrompt} onChange={(e) => props.setNewPrompt(e.target.value)} placeholder="Activity title" style={inputStyle} />

                <textarea
                  disabled={!effectiveCreationCategory}
                  value={props.newInstructions}
                  onChange={(e) => props.setNewInstructions(e.target.value)}
                  placeholder={effectiveCreationCategory?.id === "external" ? "Instructions (optional)" : "Instructions / prompt"}
                  style={textareaStyle}
                />

                <input disabled={!effectiveCreationCategory} value={props.newSuggestedTime} onChange={(e) => props.setNewSuggestedTime(e.target.value)} placeholder={suggestedTimePlaceholder} style={inputStyle} />

                {showExternalUrl ? (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 10, display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Links</div>
                    {props.newExternalLinks.map((link, index) => (
                      <div key={`library-external-link-${index}`} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr auto" }}>
                        <input value={link.title} onChange={(e) => props.onExternalLinkChange(index, { title: e.target.value })} placeholder="Link title" style={inputStyle} />
                        <input value={link.url} onChange={(e) => props.onExternalLinkChange(index, { url: e.target.value })} placeholder="https://example.com/form" style={inputStyle} />
                        <button type="button" onClick={() => props.onRemoveExternalLink(index)} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontWeight: 800, padding: "0 10px" }}>
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={props.onAddExternalLink} style={{ minHeight: 38, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700 }}>
                      Add another link
                    </button>
                  </div>
                ) : null}
                {showLessonBuilder ? (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 10, display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Lesson Builder (beta)</div>
                    {props.newLessonBlocks.map((block, index) => (
                      <div key={`library-lesson-block-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 6 }}>
                          <select value={block.type} onChange={(e) => props.setNewLessonBlocks((prev) => prev.map((item, i) => i === index ? { ...item, type: e.target.value as LessonBlockType } : item))} style={inputStyle}>
                            {LESSON_BLOCK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                          <select value={block.source_kind ?? "text"} onChange={(e) => props.setNewLessonBlocks((prev) => prev.map((item, i) => i === index ? { ...item, source_kind: e.target.value as LessonSourceKind } : item))} style={{ ...inputStyle, opacity: block.type === "source" ? 1 : 0.6 }} disabled={block.type !== "source"}>
                            {SOURCE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                          </select>
                          <button type="button" onClick={() => props.setNewLessonBlocks((prev) => prev.filter((_, i) => i !== index))} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", fontWeight: 800, padding: "0 10px" }}>Remove</button>
                          <button type="button" onClick={() => props.setNewLessonBlocks((prev) => index < 1 ? prev : prev.map((item, i) => i === index - 1 ? prev[index] : i === index ? prev[index - 1] : item))} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 800, padding: "0 10px" }}>↑</button>
                          <button type="button" onClick={() => props.setNewLessonBlocks((prev) => index >= prev.length - 1 ? prev : prev.map((item, i) => i === index + 1 ? prev[index] : i === index ? prev[index + 1] : item))} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 800, padding: "0 10px" }}>↓</button>
                        </div>
                        <textarea value={block.content} onChange={(e) => props.setNewLessonBlocks((prev) => prev.map((item, i) => i === index ? { ...item, content: e.target.value } : item))} placeholder="Block content" style={textareaStyle} />
                      </div>
                    ))}
                    <button type="button" onClick={addLessonBlock} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700 }}>
                      Add block
                    </button>
                  </div>
                ) : null}

                {showImageUpload ? (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      {effectiveCreationCategory?.id === "picture" ? "Prompt image (recommended for this activity)" : "Prompt image (optional)"}
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

                <button type="button" onClick={props.onSavePrompt} disabled={props.isSavingPrompt || !effectiveCreationCategory} style={{ minHeight: 40, borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800 }}>
                  {props.isSavingPrompt ? "Saving..." : (effectiveCreationCategory?.createButtonLabel ?? "Create activity")}
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
                      {prompt.assignment_type === "external_link" ? (
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          Links: {parseExternalActivityData(prompt.example_text, prompt.external_url).externalLinks.map((link) => link.title).join(", ") || "No links"}
                        </div>
                      ) : null}

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
        ) : null}
      </section>
    </>
  );
}
