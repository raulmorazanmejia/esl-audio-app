import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import TeacherClassesOverview from "./teacher/TeacherClassesOverview";
import TeacherClassDetail from "./teacher/TeacherClassDetail";
import { ClassVideoSettingRow, DraftState, DraftsById, ProjectVideoSubmissionRow, PromptRow, StudentRow, SubmissionRow } from "./TeacherDashboardTypes";

const SUBMISSION_SELECT =
  "id, student_name, prompt_text, audio_path, audio_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, teacher_score, teacher_comment, student_code";
const PROJECT_VIDEO_SUBMISSION_SELECT = "id, student_name, student_code, class_name, video_path, video_url, created_at";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
    padding: "24px",
    boxSizing: "border-box" as const,
    color: "#0f172a",
  },
  container: {
    maxWidth: "1360px",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.85fr) minmax(320px, 1fr) minmax(460px, 1.5fr)",
    gap: "24px",
    alignItems: "start",
  },
  panel: {
    background: "#ffffff",
    borderRadius: "30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
    padding: "28px",
  },
  panelLabel: {
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.16em",
    color: "#64748b",
    marginBottom: "8px",
  },
  panelHeading: {
    fontSize: "24px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "6px",
    lineHeight: 1.2,
  },
  panelDescription: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "14px",
  },
  promptInputRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    marginBottom: "20px",
  },
  promptInputs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  promptInput: {
    flex: 1,
    minHeight: "56px",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "0 18px",
    fontSize: "18px",
    color: "#334155",
    outline: "none",
  },
  promptHelper: {
    fontSize: "14px",
    color: "#94a3b8",
    marginTop: "-6px",
  },
  primaryButton: {
    minHeight: "56px",
    borderRadius: "18px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 800,
    padding: "0 22px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
  },
  secondaryButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "16px",
    fontWeight: 800,
    padding: "0 18px",
    cursor: "pointer",
  },
  promptCard: {
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    padding: "16px",
    marginBottom: "14px",
  },
  promptTitle: {
    fontSize: "17px",
    fontWeight: 800,
    lineHeight: 1.3,
    marginBottom: "2px",
  },
  promptMeta: {
    fontSize: "12px",
    lineHeight: 1.3,
    color: "#94a3b8",
    marginTop: "0",
  },
  promptHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start" as const,
    marginBottom: "10px",
  },
  promptInfoWrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  promptBadgeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "6px",
    marginTop: "2px",
  },
  promptBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    background: "#ffffff",
    color: "#475569",
  },
  promptStatusBadge: {
    borderRadius: "999px",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    border: "1px solid #cbd5e1",
  },
  promptAssignmentControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
    flexWrap: "wrap" as const,
    paddingTop: "8px",
    borderTop: "1px solid #e2e8f0",
  },
  promptAssignmentSelect: {
    minHeight: "34px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "0 10px",
    fontSize: "13px",
    color: "#334155",
    minWidth: "150px",
  },
  promptAssignmentButton: {
    minHeight: "34px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 700,
    padding: "0 10px",
    cursor: "pointer",
  },
  promptDeleteButton: {
    minHeight: "34px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
    background: "#fff7f7",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: 700,
    padding: "0 10px",
    cursor: "pointer",
  },
  promptFilterRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap" as const,
  },
  promptImage: {
    width: "100%",
    height: "112px",
    objectFit: "cover" as const,
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    marginBottom: "8px",
  },
  exampleBox: {
    borderRadius: "14px",
    background: "#f8fafc",
    padding: "10px 12px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.4,
    marginTop: "8px",
  },
  rosterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
    alignItems: "center",
  },
  rosterInput: {
    minHeight: "44px",
    borderRadius: "12px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "0 12px",
    fontSize: "14px",
    color: "#334155",
    outline: "none",
  },
  rosterRows: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    maxHeight: "260px",
    overflowY: "auto" as const,
  },
  rosterTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: "12px",
    borderRadius: "14px",
    overflow: "hidden",
    border: "1px solid #dbe3f0",
  },
  rosterTh: {
    textAlign: "left" as const,
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#64748b",
    background: "#f8fafc",
    padding: "11px 12px",
    borderBottom: "1px solid #e2e8f0",
  },
  rosterTd: {
    padding: "11px 12px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "middle" as const,
    fontSize: "14px",
    color: "#1e293b",
  },
  rosterSummaryCard: {
    marginTop: "12px",
    borderRadius: "14px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "10px 12px 12px",
  },
  submissionsScroller: {
    maxHeight: "78vh",
    overflowY: "auto" as const,
    paddingRight: "4px",
  },
  submissionCard: {
    borderRadius: "28px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "24px",
    marginBottom: "22px",
  },
  studentCode: {
    fontSize: "42px",
    fontWeight: 900,
    lineHeight: 1,
    color: "#0f172a",
  },
  studentName: {
    marginTop: "8px",
    fontSize: "18px",
    color: "#64748b",
  },
  pillRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "6px 12px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  reviewStatePill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  promptBanner: {
    marginTop: "18px",
    marginBottom: "18px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "18px 20px",
    fontSize: "18px",
    fontStyle: "italic" as const,
    color: "#334155",
  },
  sectionBox: {
    borderRadius: "22px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "20px",
    marginBottom: "18px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#94a3b8",
    marginBottom: "12px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "18px",
  },
  bodyText: {
    fontSize: "18px",
    lineHeight: 1.45,
    color: "#334155",
  },
  labelStrong: {
    fontWeight: 800,
    color: "#0f172a",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap" as const,
    marginBottom: "14px",
  },
  slider: {
    width: "100%",
    marginBottom: "18px",
  },
  textarea: {
    width: "100%",
    minHeight: "108px",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "14px 16px",
    fontSize: "18px",
    color: "#334155",
    lineHeight: 1.4,
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    outline: "none",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap" as const,
    marginTop: "14px",
  },
  helper: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  success: {
    fontSize: "14px",
    color: "#059669",
    fontWeight: 700,
  },
  error: {
    fontSize: "14px",
    color: "#dc2626",
    fontWeight: 700,
  },
  audioWrap: {
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "14px",
    marginTop: "10px",
  },
  classesScreen: {
    background: "#ffffff",
    borderRadius: "30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
    padding: "28px",
  },
  classCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },
  classCard: {
    border: "1px solid #dbe3f0",
    borderRadius: "18px",
    background: "#f8fafc",
    padding: "14px 16px",
    textAlign: "left" as const,
  },
} as const;

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function buildDraft(row: SubmissionRow, previous?: Partial<DraftState>): DraftState {
  return {
    score: previous?.score ?? clampScore(row.teacher_score ?? row.ai_score ?? 3),
    comment: previous?.comment ?? row.teacher_comment ?? row.ai_comment ?? "",
    savingOverride: false,
    savingAudio: false,
    savedMessage: previous?.savedMessage ?? "",
    error: "",
    teacherBlob: previous?.teacherBlob ?? null,
    teacherPreviewUrl: previous?.teacherPreviewUrl ?? "",
    isRecordingTeacher: false,
    recordingError: "",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg;codecs=opus",
  ];

  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function StarRow({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "24px", lineHeight: 1, color: "#f59e0b" }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= value ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function clampButton(disabled?: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...(extra || {}),
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function buildAudioLabel(url?: string | null) {
  return url ? "Saved teacher audio" : "No saved teacher audio yet";
}

const PROMPT_IMAGES_BUCKET = "prompt-images";

export default function TeacherDashboard() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSubmissionIdRef = useRef<string | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const newStudentNameInputRef = useRef<HTMLInputElement | null>(null);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newSuggestedTime, setNewSuggestedTime] = useState("");
  const [newPromptClassName, setNewPromptClassName] = useState("");
  const [newPromptImageFile, setNewPromptImageFile] = useState<File | null>(null);
  const [newPromptImagePreviewUrl, setNewPromptImagePreviewUrl] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [promptSuccess, setPromptSuccess] = useState("");
  const [promptAssignmentDrafts, setPromptAssignmentDrafts] = useState<Record<string, string>>({});
  const [savingPromptAssignmentById, setSavingPromptAssignmentById] = useState<Record<string, boolean>>({});
  const [savingPromptVisibilityById, setSavingPromptVisibilityById] = useState<Record<string, boolean>>({});
  const [deletingPromptById, setDeletingPromptById] = useState<Record<string, boolean>>({});
  const [promptListFilter, setPromptListFilter] = useState("__all_prompts__");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterSuccess, setRosterSuccess] = useState("");
  const [classVideoSettings, setClassVideoSettings] = useState<Record<string, boolean>>({});
  const [isSavingClassVideoSetting, setIsSavingClassVideoSetting] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [submissionsSuccess, setSubmissionsSuccess] = useState("");
  const [deletingSubmissionById, setDeletingSubmissionById] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<DraftsById>({});
  const [expandedSubmissionIds, setExpandedSubmissionIds] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<"all" | "needs_review" | "reviewed">("all");
  const [submissionPromptFilter, setSubmissionPromptFilter] = useState("__all_prompts__");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<{ code: string; name?: string } | null>(null);
  const [analyticsPromptFilter, setAnalyticsPromptFilter] = useState("");
  const [projectVideoSubmissions, setProjectVideoSubmissions] = useState<ProjectVideoSubmissionRow[]>([]);
  const [isLoadingProjectVideoSubmissions, setIsLoadingProjectVideoSubmissions] = useState(false);
  const [projectVideoSubmissionsError, setProjectVideoSubmissionsError] = useState("");

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [prompts]);

  const studentClassByCode = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((student) => {
      const code = student.student_code.trim();
      const className = student.class_name?.trim() ?? "";
      if (!code || !className) return;
      map.set(code, className);
    });
    return map;
  }, [students]);

  const studentClassByName = useMemo(() => {
    const grouped = new Map<string, Set<string>>();
    students.forEach((student) => {
      const name = student.student_name.trim().toLowerCase();
      const className = student.class_name?.trim() ?? "";
      if (!name || !className) return;
      if (!grouped.has(name)) grouped.set(name, new Set());
      grouped.get(name)?.add(className);
    });

    const map = new Map<string, string>();
    grouped.forEach((classNames, name) => {
      if (classNames.size === 1) {
        map.set(name, Array.from(classNames)[0]);
      }
    });
    return map;
  }, [students]);

  const getSubmissionClassName = useCallback(
    (submission: SubmissionRow) => {
      const codeKey = submission.student_code?.trim() ?? "";
      if (codeKey && studentClassByCode.has(codeKey)) {
        return studentClassByCode.get(codeKey) ?? "";
      }
      const nameKey = submission.student_name?.trim().toLowerCase() ?? "";
      if (nameKey && studentClassByName.has(nameKey)) {
        return studentClassByName.get(nameKey) ?? "";
      }
      return "";
    },
    [studentClassByCode, studentClassByName],
  );

  const selectedClassName = selectedClass?.trim() ?? "";

  const submissionPromptOptions = useMemo(() => {
    const promptSet = new Set<string>();

    prompts.forEach((prompt) => {
      const promptText = prompt.prompt_text?.trim() ?? "";
      if (!promptText) return;
      const promptClass = prompt.class_name?.trim() ?? "";
      if (!selectedClassName || promptClass === selectedClassName) {
        promptSet.add(promptText);
      }
    });

    submissions.forEach((submission) => {
      const promptText = submission.prompt_text?.trim() ?? "";
      if (!promptText) return;
      if (!selectedClassName || getSubmissionClassName(submission) === selectedClassName) {
        promptSet.add(promptText);
      }
    });

    return Array.from(promptSet).sort((a, b) => a.localeCompare(b));
  }, [prompts, submissions, selectedClassName, getSubmissionClassName]);

  useEffect(() => {
    if (submissionPromptFilter === "__all_prompts__") return;
    if (!submissionPromptOptions.includes(submissionPromptFilter)) {
      setSubmissionPromptFilter("__all_prompts__");
    }
  }, [submissionPromptFilter, submissionPromptOptions]);

  useEffect(() => {
    setPromptListFilter("__all_prompts__");
    setSubmissionPromptFilter("__all_prompts__");
    setNewPromptClassName(selectedClassName);
    setSelectedStudentFilter(null);
  }, [selectedClassName]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;
      const needsTeacherReview = !submission.teacher_comment && !savedTeacherAudioUrl;

      const submissionClassName = getSubmissionClassName(submission);
      const matchesClass = !selectedClassName || submissionClassName === selectedClassName;
      const submissionPrompt = submission.prompt_text?.trim() ?? "";
      const matchesPrompt = submissionPromptFilter === "__all_prompts__" || submissionPrompt === submissionPromptFilter;
      const matchesReview = reviewFilter === "needs_review" ? needsTeacherReview : reviewFilter === "reviewed" ? !needsTeacherReview : true;
      const submissionStudentCode = submission.student_code?.trim() ?? "";
      const matchesStudent = !selectedStudentFilter || submissionStudentCode === selectedStudentFilter.code;

      return matchesClass && matchesPrompt && matchesReview && matchesStudent;
    });
  }, [submissions, reviewFilter, selectedClassName, submissionPromptFilter, getSubmissionClassName, selectedStudentFilter]);

  const classNeedsReviewCount = useMemo(() => {
    if (!selectedClassName) return 0;
    return submissions.filter((submission) => {
      if (getSubmissionClassName(submission) !== selectedClassName) return false;
      const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;
      return !submission.teacher_comment && !savedTeacherAudioUrl;
    }).length;
  }, [submissions, selectedClassName, getSubmissionClassName]);

  const filteredPrompts = useMemo(() => {
    const bySelectedClass = sortedPrompts.filter((prompt) => {
      const promptClass = prompt.class_name?.trim() ?? "";
      return !selectedClassName ? Boolean(promptClass) : promptClass === selectedClassName;
    });
    if (promptListFilter === "__all_prompts__") return bySelectedClass;
    if (promptListFilter === "__unassigned_only__") {
      return sortedPrompts.filter((prompt) => !(prompt.class_name?.trim() || ""));
    }
    return bySelectedClass;
  }, [sortedPrompts, promptListFilter, selectedClassName]);

  const classNameOptions = useMemo(() => {
    const classNames = students
      .map((student) => student.class_name?.trim() ?? "")
      .filter((className) => className.length > 0);
    return Array.from(new Set(classNames)).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const classSummaries = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((student) => {
      const className = student.class_name?.trim() ?? "";
      if (!className) return;
      counts.set(className, (counts.get(className) ?? 0) + 1);
    });

    const promptCounts = new Map<string, number>();
    prompts.forEach((prompt) => {
      const className = prompt.class_name?.trim() ?? "";
      if (!className) return;
      promptCounts.set(className, (promptCounts.get(className) ?? 0) + 1);
    });

    const needsReviewCounts = new Map<string, number>();
    submissions.forEach((submission) => {
      const className = getSubmissionClassName(submission);
      if (!className) return;
      const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;
      const needsTeacherReview = !submission.teacher_comment && !savedTeacherAudioUrl;
      if (!needsTeacherReview) return;
      needsReviewCounts.set(className, (needsReviewCounts.get(className) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([className, studentCount]) => ({
        className,
        studentCount,
        promptCount: promptCounts.get(className) ?? 0,
        needsReviewCount: needsReviewCounts.get(className) ?? 0,
        projectVideoEnabled: Boolean(classVideoSettings[className]),
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [students, prompts, submissions, getSubmissionClassName, classVideoSettings]);

  const analyticsPromptOptions = useMemo(() => {
    if (!selectedClassName) return [];
    const promptSet = new Set<string>();

    prompts.forEach((prompt) => {
      const promptText = prompt.prompt_text?.trim() ?? "";
      const promptClass = prompt.class_name?.trim() ?? "";
      if (!promptText) return;
      if (promptClass === selectedClassName) {
        promptSet.add(promptText);
      }
    });

    submissions.forEach((submission) => {
      const promptText = submission.prompt_text?.trim() ?? "";
      if (!promptText) return;
      if (getSubmissionClassName(submission) === selectedClassName) {
        promptSet.add(promptText);
      }
    });

    return Array.from(promptSet).sort((a, b) => a.localeCompare(b));
  }, [prompts, submissions, selectedClassName, getSubmissionClassName]);

  useEffect(() => {
    if (!analyticsPromptOptions.length) {
      if (analyticsPromptFilter) setAnalyticsPromptFilter("");
      return;
    }
    if (analyticsPromptFilter && analyticsPromptOptions.includes(analyticsPromptFilter)) return;
    setAnalyticsPromptFilter(analyticsPromptOptions[0] ?? "");
  }, [analyticsPromptOptions, analyticsPromptFilter]);

  const submissionAnalytics = useMemo(() => {
    if (!selectedClassName || !analyticsPromptFilter) {
      return {
        selectedClassStudents: [] as StudentRow[],
        submittedStudents: [] as StudentRow[],
        notSubmittedStudents: [] as StudentRow[],
        totalSubmissions: 0,
      };
    }

    const classStudents = students.filter((student) => (student.class_name?.trim() ?? "") === selectedClassName);
    const rosterCodeSet = new Set(
      classStudents
        .map((student) => student.student_code.trim())
        .filter((studentCode) => studentCode.length > 0),
    );

    const relevantSubmissions = submissions.filter((submission) => {
      const submissionPrompt = submission.prompt_text?.trim() ?? "";
      const submissionCode = submission.student_code?.trim() ?? "";
      if (submissionPrompt !== analyticsPromptFilter || !submissionCode) return false;
      if (getSubmissionClassName(submission) !== selectedClassName) return false;
      return rosterCodeSet.has(submissionCode);
    });

    const submittedCodeSet = new Set(relevantSubmissions.map((submission) => submission.student_code?.trim() ?? "").filter(Boolean));
    const submittedStudents = classStudents.filter((student) => submittedCodeSet.has(student.student_code.trim()));
    const notSubmittedStudents = classStudents.filter((student) => !submittedCodeSet.has(student.student_code.trim()));

    return {
      selectedClassStudents: classStudents,
      submittedStudents,
      notSubmittedStudents,
      totalSubmissions: relevantSubmissions.length,
    };
  }, [students, submissions, selectedClassName, analyticsPromptFilter, getSubmissionClassName]);

  const filteredStudents = useMemo(() => {
    if (!selectedClassName) return students;
    return students.filter((student) => (student.class_name?.trim() ?? "") === selectedClassName);
  }, [students, selectedClassName]);

  const selectedClassStudents = useMemo(() => {
    if (!selectedClassName) return [];
    return students.filter((student) => (student.class_name?.trim() ?? "") === selectedClassName);
  }, [students, selectedClassName]);

  useEffect(() => {
    if (!selectedStudentFilter) return;
    const stillInClass = selectedClassStudents.some((student) => student.student_code.trim() === selectedStudentFilter.code);
    if (!stillInClass) {
      setSelectedStudentFilter(null);
    }
  }, [selectedClassStudents, selectedStudentFilter]);

  const selectedClassVideoEnabled = useMemo(() => {
    if (!selectedClassName) return false;
    return Boolean(classVideoSettings[selectedClassName]);
  }, [classVideoSettings, selectedClassName]);

  const filteredProjectVideoSubmissions = useMemo(() => {
    if (!selectedClassName) return projectVideoSubmissions;
    return projectVideoSubmissions.filter((submission) => (submission.class_name?.trim() ?? "") === selectedClassName);
  }, [projectVideoSubmissions, selectedClassName]);

  const stopRecorderAndTracks = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecorderAndTracks();
    };
  }, [stopRecorderAndTracks]);

  useEffect(() => {
    return () => {
      Object.values(drafts).forEach((draft) => {
        if (draft.teacherPreviewUrl) URL.revokeObjectURL(draft.teacherPreviewUrl);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (newPromptImagePreviewUrl) URL.revokeObjectURL(newPromptImagePreviewUrl);
    };
  }, [newPromptImagePreviewUrl]);

  useEffect(() => {
    if (!rosterSuccess) return;
    const timer = window.setTimeout(() => setRosterSuccess(""), 2800);
    return () => window.clearTimeout(timer);
  }, [rosterSuccess]);

  useEffect(() => {
    if (!promptSuccess) return;
    const timer = window.setTimeout(() => setPromptSuccess(""), 2800);
    return () => window.clearTimeout(timer);
  }, [promptSuccess]);

  useEffect(() => {
    if (!submissionsSuccess) return;
    const timer = window.setTimeout(() => setSubmissionsSuccess(""), 2800);
    return () => window.clearTimeout(timer);
  }, [submissionsSuccess]);

  const hydrateDrafts = useCallback((rows: SubmissionRow[]) => {
    setDrafts((prev) => {
      const next: DraftsById = {};
      for (const row of rows) {
        next[row.id] = buildDraft(row, prev[row.id]);
      }
      Object.keys(prev).forEach((id) => {
        if (!next[id] && prev[id]?.teacherPreviewUrl) {
          URL.revokeObjectURL(prev[id].teacherPreviewUrl);
        }
      });
      return next;
    });
  }, []);

  const fetchPrompts = useCallback(async () => {
    setPromptError("");
    const { data, error } = await supabase
      .from("prompts")
      .select("id, prompt_text, class_name, suggested_time, prompt_image_path, prompt_image_url, example_text, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setPromptError(error.message);
      return;
    }
    const rows = (data ?? []) as PromptRow[];
    setPrompts(rows);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    setSubmissionsError("");
    const { data, error } = await supabase
      .from("student_submissions")
      .select(SUBMISSION_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      setSubmissionsError(error.message);
      setIsLoadingSubmissions(false);
      return;
    }
    const rows = (data ?? []) as SubmissionRow[];
    setSubmissions(rows);
    hydrateDrafts(rows);
    setIsLoadingSubmissions(false);
  }, [hydrateDrafts]);

  const fetchStudents = useCallback(async () => {
    setRosterError("");
    const { data, error } = await supabase
      .from("students")
      .select("id, class_name, student_name, student_code, created_at")
      .order("class_name", { ascending: true })
      .order("student_name", { ascending: true });
    if (error) {
      setRosterError(error.message);
      return;
    }
    setStudents((data ?? []) as StudentRow[]);
  }, []);

  const fetchClassVideoSettings = useCallback(async () => {
    const { data, error } = await supabase.from("class_video_settings").select("class_name, project_video_updates_enabled");
    if (error) {
      return;
    }
    const rows = (data ?? []) as ClassVideoSettingRow[];
    const next: Record<string, boolean> = {};
    rows.forEach((row) => {
      const className = row.class_name?.trim();
      if (className) {
        next[className] = Boolean(row.project_video_updates_enabled);
      }
    });
    setClassVideoSettings(next);
  }, []);

  const fetchProjectVideoSubmissions = useCallback(async () => {
    setIsLoadingProjectVideoSubmissions(true);
    setProjectVideoSubmissionsError("");
    const { data, error } = await supabase
      .from("project_video_submissions")
      .select(PROJECT_VIDEO_SUBMISSION_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      setProjectVideoSubmissionsError(error.message);
      setIsLoadingProjectVideoSubmissions(false);
      return;
    }
    setProjectVideoSubmissions((data ?? []) as ProjectVideoSubmissionRow[]);
    setIsLoadingProjectVideoSubmissions(false);
  }, []);

  useEffect(() => {
    void fetchPrompts();
    void fetchStudents();
    void fetchClassVideoSettings();
    void fetchSubmissions();
    void fetchProjectVideoSubmissions();
  }, [fetchPrompts, fetchStudents, fetchClassVideoSettings, fetchSubmissions, fetchProjectVideoSubmissions]);

  async function handleSavePrompt() {
    if (isSavingPrompt) return;
    const text = newPrompt.trim();
    if (!text) return;
    setIsSavingPrompt(true);
    setPromptError("");
    setPromptSuccess("");
    let promptImagePath: string | null = null;
    let promptImageUrl: string | null = null;

    if (newPromptImageFile) {
      const ext = newPromptImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const imagePath = `prompts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(PROMPT_IMAGES_BUCKET).upload(imagePath, newPromptImageFile, {
        cacheControl: "3600",
        contentType: newPromptImageFile.type || "image/jpeg",
        upsert: false,
      });
      if (uploadError) {
        setPromptError(uploadError.message);
        setIsSavingPrompt(false);
        return;
      }
      promptImagePath = imagePath;
      const {
        data: { publicUrl },
      } = supabase.storage.from(PROMPT_IMAGES_BUCKET).getPublicUrl(imagePath);
      promptImageUrl = publicUrl;
    }

    const { error } = await supabase.from("prompts").insert({
      prompt_text: text,
      class_name: newPromptClassName.trim() || null,
      suggested_time: newSuggestedTime.trim() || null,
      prompt_image_path: promptImagePath,
      prompt_image_url: promptImageUrl,
      is_active: false,
    });
    if (error) {
      setPromptError(error.message);
      if (promptImagePath) {
        await supabase.storage.from(PROMPT_IMAGES_BUCKET).remove([promptImagePath]);
      }
      setIsSavingPrompt(false);
      return;
    }
    setNewPrompt("");
    setNewSuggestedTime("");
    setNewPromptClassName("");
    setNewPromptImageFile(null);
    if (newPromptImagePreviewUrl) {
      URL.revokeObjectURL(newPromptImagePreviewUrl);
      setNewPromptImagePreviewUrl("");
    }
    setPromptSuccess(`Prompt saved: “${text}”`);
    setIsSavingPrompt(false);
    await fetchPrompts();
  }

  async function handleTogglePromptVisibility(prompt: PromptRow) {
    setPromptError("");
    setPromptSuccess("");
    setSavingPromptVisibilityById((prev) => ({ ...prev, [prompt.id]: true }));
    const nextVisible = !Boolean(prompt.is_active);
    const { error } = await supabase.from("prompts").update({ is_active: nextVisible }).eq("id", prompt.id);
    if (error) {
      setPromptError(error.message);
      setSavingPromptVisibilityById((prev) => ({ ...prev, [prompt.id]: false }));
      return;
    }
    setPromptSuccess(`Prompt is now ${nextVisible ? "visible" : "hidden"} for students.`);
    setSavingPromptVisibilityById((prev) => ({ ...prev, [prompt.id]: false }));
    await fetchPrompts();
  }

  async function handleClearVisiblePromptsForSelectedClass() {
    const className = selectedClass?.trim() ?? "";
    if (!className) {
      setPromptError("Select a class first to clear visible prompts.");
      return;
    }
    setPromptError("");
    setPromptSuccess("");
    const { error } = await supabase.from("prompts").update({ is_active: false }).eq("class_name", className);
    if (error) {
      setPromptError(error.message);
      return;
    }
    setPromptSuccess(`No prompts are currently visible for ${className}.`);
    await fetchPrompts();
  }

  async function handleSavePromptAssignment(promptId: string) {
    const className = (promptAssignmentDrafts[promptId] ?? "").trim();
    setPromptError("");
    setPromptSuccess("");
    setSavingPromptAssignmentById((prev) => ({ ...prev, [promptId]: true }));
    const { error } = await supabase
      .from("prompts")
      .update({ class_name: className || null })
      .eq("id", promptId);
    if (error) {
      setPromptError(error.message);
      setSavingPromptAssignmentById((prev) => ({ ...prev, [promptId]: false }));
      return;
    }
    const assignmentLabel = className || "Not assigned";
    setPromptSuccess(`Prompt assignment saved: ${assignmentLabel}`);
    setSavingPromptAssignmentById((prev) => ({ ...prev, [promptId]: false }));
    await fetchPrompts();
  }

  async function handleDeletePrompt(prompt: PromptRow) {
    if (deletingPromptById[prompt.id]) return;
    const label = prompt.prompt_text?.trim() || "this prompt";
    const confirmed = window.confirm(`Delete prompt "${label}"? This cannot be undone.`);
    if (!confirmed) return;

    setPromptError("");
    setPromptSuccess("");
    setDeletingPromptById((prev) => ({ ...prev, [prompt.id]: true }));

    try {
      if (prompt.prompt_image_path) {
        const { error: removeImageError } = await supabase.storage.from(PROMPT_IMAGES_BUCKET).remove([prompt.prompt_image_path]);
        if (removeImageError) {
          throw removeImageError;
        }
      }

      const { error } = await supabase.from("prompts").delete().eq("id", prompt.id);
      if (error) throw error;

      setPrompts((prev) => prev.filter((row) => row.id !== prompt.id));
      setPromptAssignmentDrafts((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, prompt.id)) return prev;
        const next = { ...prev };
        delete next[prompt.id];
        return next;
      });
      setPromptSuccess("Prompt deleted.");
    } catch (error: any) {
      setPromptError(error?.message || "Could not delete prompt.");
    } finally {
      setDeletingPromptById((prev) => ({ ...prev, [prompt.id]: false }));
    }
  }

  async function handleAddStudent() {
    if (isSavingStudent) return;
    const className = selectedClass?.trim() ?? "";
    const studentName = newStudentName.trim();
    const studentCode = newStudentCode.trim().toUpperCase();

    if (!className || !studentName || !studentCode) {
      setRosterError("Choose a class/group, then enter student name and student code.");
      return;
    }

    setIsSavingStudent(true);
    setRosterError("");
    setRosterSuccess("");
    const { error } = await supabase.from("students").insert({
      class_name: className,
      student_name: studentName,
      student_code: studentCode,
    });

    if (error) {
      setRosterError(error.message);
      setIsSavingStudent(false);
      return;
    }

    setNewStudentName("");
    setNewStudentCode("");
    setSelectedClass(className);
    setRosterSuccess(`Added: ${studentName} (${studentCode})`);
    newStudentNameInputRef.current?.focus();
    setIsSavingStudent(false);
    await fetchStudents();
  }

  function handleUseNewClass() {
    const className = newClassName.trim();
    if (!className) return;
    setSelectedClass(className);
    setNewClassName("");
  }

  async function handleToggleProjectVideoForSelectedClass() {
    const className = selectedClass?.trim() ?? "";
    if (!className || isSavingClassVideoSetting) return;
    const nextEnabled = !selectedClassVideoEnabled;
    setIsSavingClassVideoSetting(true);
    setRosterError("");
    setRosterSuccess("");

    const { error } = await supabase.from("class_video_settings").upsert(
      {
        class_name: className,
        project_video_updates_enabled: nextEnabled,
      },
      { onConflict: "class_name" }
    );

    if (error) {
      setRosterError(error.message);
      setIsSavingClassVideoSetting(false);
      return;
    }

    setClassVideoSettings((prev) => ({ ...prev, [className]: nextEnabled }));
    setRosterSuccess(`Project update video ${nextEnabled ? "enabled" : "disabled"} for ${className}.`);
    setIsSavingClassVideoSetting(false);
  }

  async function handleDeleteSelectedClass() {
    const className = selectedClass?.trim() ?? "";
    if (!className || isDeletingClass) return;

    const assignedStudents = students.filter((student) => (student.class_name?.trim() ?? "") === className);
    if (assignedStudents.length > 0) {
      setRosterError(`Cannot delete "${className}" while ${assignedStudents.length} student(s) are still assigned.`);
      return;
    }

    const confirmed = window.confirm(
      `Delete class "${className}"? This removes class settings and unassigns prompts currently linked to this class.`
    );
    if (!confirmed) return;

    setIsDeletingClass(true);
    setRosterError("");
    setRosterSuccess("");

    try {
      const { error: promptError } = await supabase.from("prompts").update({ class_name: null }).eq("class_name", className);
      if (promptError) throw promptError;

      const { error: settingsError } = await supabase.from("class_video_settings").delete().eq("class_name", className);
      if (settingsError) throw settingsError;

      setClassVideoSettings((prev) => {
        const next = { ...prev };
        delete next[className];
        return next;
      });
      setSelectedClass(null);
      setRosterSuccess(`Class "${className}" deleted.`);
      await fetchPrompts();
    } catch (error: any) {
      setRosterError(error?.message || "Could not delete class.");
    } finally {
      setIsDeletingClass(false);
    }
  }

  function updateStudentDraft(id: string, patch: Partial<StudentRow>) {
    setStudents((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  useEffect(() => {
    setPromptAssignmentDrafts((prev) => {
      const next: Record<string, string> = {};
      prompts.forEach((prompt) => {
        const normalized = prompt.class_name?.trim() || "";
        next[prompt.id] = Object.prototype.hasOwnProperty.call(prev, prompt.id) ? prev[prompt.id] : normalized;
      });
      return next;
    });
  }, [prompts]);

  async function handleSaveStudent(student: StudentRow) {
    const className = (student.class_name ?? "").trim();
    const studentName = student.student_name.trim();
    const studentCode = student.student_code.trim().toUpperCase();

    if (!className || !studentName || !studentCode) {
      setRosterError("Class/group, student name, and student code are required.");
      return;
    }

    setRosterError("");
    const { error } = await supabase
      .from("students")
      .update({
        class_name: className,
        student_name: studentName,
        student_code: studentCode,
      })
      .eq("id", student.id);

    if (error) {
      setRosterError(error.message);
      return;
    }

    updateStudentDraft(student.id, { class_name: className, student_name: studentName, student_code: studentCode });
  }

  async function handleDeleteStudent(studentId: string) {
    setRosterError("");
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) {
      setRosterError(error.message);
      return;
    }
    setStudents((prev) => prev.filter((row) => row.id !== studentId));
    setSelectedStudentFilter((prev) => {
      if (!prev) return prev;
      const stillExists = students.some((row) => row.id !== studentId && row.student_code.trim() === prev.code);
      return stillExists ? prev : null;
    });
  }

  function updateDraft(id: string, patch: Partial<DraftState>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          score: 3,
          comment: "",
          savingOverride: false,
          savingAudio: false,
          savedMessage: "",
          error: "",
          teacherBlob: null,
          teacherPreviewUrl: "",
          isRecordingTeacher: false,
          recordingError: "",
        }),
        ...patch,
      },
    }));
  }

  function toggleSubmissionDetails(submissionId: string) {
    setExpandedSubmissionIds((prev) => ({
      ...prev,
      [submissionId]: !prev[submissionId],
    }));
  }

  async function handleSaveOverride(submission: SubmissionRow) {
    const draft = drafts[submission.id];
    if (!draft) return;
    updateDraft(submission.id, { savingOverride: true, savedMessage: "", error: "" });
    const { data, error } = await supabase
      .from("student_submissions")
      .update({ teacher_score: clampScore(draft.score), teacher_comment: draft.comment.trim() })
      .eq("id", submission.id)
      .select(SUBMISSION_SELECT)
      .single();
    if (error) {
      updateDraft(submission.id, { savingOverride: false, error: error.message });
      return;
    }
    setSubmissions((prev) => prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row)));
    updateDraft(submission.id, { savingOverride: false, savedMessage: "Override saved ✅", error: "" });
  }

  async function startTeacherRecording(submissionId: string) {
    const current = activeSubmissionIdRef.current;
    if (current && current !== submissionId) {
      updateDraft(current, { isRecordingTeacher: false, recordingError: "Stopped because another recording started." });
      stopRecorderAndTracks();
    }
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      updateDraft(submissionId, { isRecordingTeacher: false, recordingError: "This browser does not support in-app audio recording." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = getMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      activeSubmissionIdRef.current = submissionId;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const targetId = activeSubmissionIdRef.current || submissionId;
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        if (!chunksRef.current.length) {
          updateDraft(targetId, { teacherBlob: null, teacherPreviewUrl: "", isRecordingTeacher: false, recordingError: "Recording failed. Please try again." });
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          activeSubmissionIdRef.current = null;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        if (!blob.size) {
          updateDraft(targetId, { teacherBlob: null, teacherPreviewUrl: "", isRecordingTeacher: false, recordingError: "This device produced an empty recording. Please try again." });
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          activeSubmissionIdRef.current = null;
          return;
        }
        setDrafts((prev) => {
          const existing = prev[targetId];
          if (!existing) return prev;
          if (existing.teacherPreviewUrl) URL.revokeObjectURL(existing.teacherPreviewUrl);
          return {
            ...prev,
            [targetId]: {
              ...existing,
              teacherBlob: blob,
              teacherPreviewUrl: URL.createObjectURL(blob),
              isRecordingTeacher: false,
              recordingError: "",
              savedMessage: "Teacher audio recorded. Save it when ready.",
              error: "",
            },
          };
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        activeSubmissionIdRef.current = null;
      };
      updateDraft(submissionId, { isRecordingTeacher: true, recordingError: "", savedMessage: "", error: "" });
      recorder.start();
    } catch (error: any) {
      updateDraft(submissionId, { isRecordingTeacher: false, recordingError: error?.message || "Microphone access failed." });
    }
  }

  function stopTeacherRecording(submissionId: string) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || activeSubmissionIdRef.current !== submissionId) return;
    if (recorder.state === "inactive") return;
    recorder.stop();
  }

  function clearTeacherRecording(submissionId: string) {
    setDrafts((prev) => {
      const existing = prev[submissionId];
      if (!existing) return prev;
      if (existing.teacherPreviewUrl) URL.revokeObjectURL(existing.teacherPreviewUrl);
      return {
        ...prev,
        [submissionId]: {
          ...existing,
          teacherBlob: null,
          teacherPreviewUrl: "",
          recordingError: "",
          savedMessage: "Teacher audio cleared.",
          error: "",
        },
      };
    });
  }

  async function handleSaveTeacherAudio(submission: SubmissionRow) {
    const draft = drafts[submission.id];
    if (!draft?.teacherBlob) {
      updateDraft(submission.id, { error: "Record teacher audio first.", savedMessage: "" });
      return;
    }
    updateDraft(submission.id, { savingAudio: true, savedMessage: "", error: "" });
    try {
      const mimeType = draft.teacherBlob.type || "audio/webm";
      const ext = getFileExtension(mimeType);
      const filePath = `${submission.id}/teacher-feedback-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("teacher-audio-oai").upload(filePath, draft.teacherBlob, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("teacher-audio-oai").getPublicUrl(filePath);
      const { data, error } = await supabase
        .from("student_submissions")
        .update({
          feedback_audio_path: filePath,
          feedback_audio_url: publicUrl,
          feedback_url: publicUrl,
          feedback_status: "saved",
          feedback_created_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .select(SUBMISSION_SELECT)
        .single();
      if (error) throw error;
      setSubmissions((prev) => prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row)));
      updateDraft(submission.id, { savingAudio: false, savedMessage: "Teacher audio saved ✅", error: "" });
    } catch (error: any) {
      updateDraft(submission.id, { savingAudio: false, error: error?.message || "Teacher audio upload failed." });
    }
  }

  async function handleDeleteSubmission(submission: SubmissionRow) {
    if (deletingSubmissionById[submission.id]) return;
    const label = submission.student_code || submission.student_name || submission.id;
    const confirmed = window.confirm(`Delete submission for "${label}"? This cannot be undone.`);
    if (!confirmed) return;

    setSubmissionsError("");
    setSubmissionsSuccess("");
    setDeletingSubmissionById((prev) => ({ ...prev, [submission.id]: true }));

    try {
      if (submission.audio_path) {
        const { error: studentAudioError } = await supabase.storage.from("student-audio-oai").remove([submission.audio_path]);
        if (studentAudioError) throw studentAudioError;
      }
      if (submission.feedback_audio_path) {
        const { error: teacherAudioError } = await supabase.storage.from("teacher-audio-oai").remove([submission.feedback_audio_path]);
        if (teacherAudioError) throw teacherAudioError;
      }

      const { error } = await supabase.from("student_submissions").delete().eq("id", submission.id);
      if (error) throw error;

      setSubmissions((prev) => prev.filter((row) => row.id !== submission.id));
      setDrafts((prev) => {
        const existing = prev[submission.id];
        if (!existing) return prev;
        if (existing.teacherPreviewUrl) URL.revokeObjectURL(existing.teacherPreviewUrl);
        const next = { ...prev };
        delete next[submission.id];
        return next;
      });
      setExpandedSubmissionIds((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, submission.id)) return prev;
        const next = { ...prev };
        delete next[submission.id];
        return next;
      });
      setSubmissionsSuccess("Submission deleted.");
    } catch (error: any) {
      setSubmissionsError(error?.message || "Could not delete submission.");
    } finally {
      setDeletingSubmissionById((prev) => ({ ...prev, [submission.id]: false }));
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 1180px) {
          .teacher-dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={styles.container}>
        {!selectedClassName ? (
          <TeacherClassesOverview
            classSummaries={classSummaries}
            newClassName={newClassName}
            onNewClassNameChange={setNewClassName}
            onUseNewClass={handleUseNewClass}
            onRefreshClasses={() => void fetchStudents()}
            onSelectClass={setSelectedClass}
            rosterError={rosterError}
          />
        ) : null}

        {selectedClassName ? (
          <TeacherClassDetail
            selectedClassName={selectedClassName}
            selectedClassStudents={selectedClassStudents}
            needsReviewCount={classNeedsReviewCount}
            assignedPromptCount={sortedPrompts.filter((prompt) => (prompt.class_name?.trim() || "") === selectedClassName).length}
            rosterPanelProps={{
              selectedClassName,
              selectedClassVideoEnabled,
              isSavingClassVideoSetting,
              isDeletingClass,
              onBack: () => setSelectedClass(null),
              onToggleProjectVideo: () => void handleToggleProjectVideoForSelectedClass(),
              onDeleteClass: () => void handleDeleteSelectedClass(),
              newStudentName,
              newStudentCode,
              setNewStudentName,
              setNewStudentCode,
              onAddStudent: () => void handleAddStudent(),
              onRefreshStudents: () => void fetchStudents(),
              isSavingStudent,
              rosterSuccess,
              rosterError,
              selectedClassStudents,
              filteredStudents,
              selectedStudentCode: selectedStudentFilter?.code ?? "",
              onSelectStudent: (student: StudentRow) =>
                setSelectedStudentFilter({ code: student.student_code.trim(), name: student.student_name.trim() }),
              updateStudentDraft,
              onSaveStudent: (student: StudentRow) => void handleSaveStudent(student),
              onDeleteStudent: (id: string) => void handleDeleteStudent(id),
              newStudentNameInputRef,
            }}
            promptPanelProps={{
              selectedClassName,
              newPrompt,
              newSuggestedTime,
              newPromptClassName,
              setNewPrompt,
              setNewSuggestedTime,
              setNewPromptClassName,
              classNameOptions,
              onSavePrompt: () => void handleSavePrompt(),
              isSavingPrompt,
              promptSuccess,
              promptError,
              promptListFilter,
              setPromptListFilter,
              filteredPrompts,
              promptAssignmentDrafts,
              setPromptAssignmentDrafts,
              onSavePromptAssignment: (id: string) => void handleSavePromptAssignment(id),
              onTogglePromptVisibility: (prompt: PromptRow) => void handleTogglePromptVisibility(prompt),
              onDeletePrompt: (prompt: PromptRow) => void handleDeletePrompt(prompt),
              savingPromptAssignmentById,
              savingPromptVisibilityById,
              deletingPromptById,
              onClearVisiblePromptsForSelectedClass: () => void handleClearVisiblePromptsForSelectedClass(),
            }}
            submissionsPanelProps={{
              selectedClassName,
              reviewFilter,
              setReviewFilter,
              onRefreshSubmissions: () => void fetchSubmissions(),
              isLoadingSubmissions,
              submissionPromptFilter,
              setSubmissionPromptFilter,
              submissionPromptOptions,
              selectedStudentFilter,
              onClearStudentFilter: () => setSelectedStudentFilter(null),
              filteredSubmissions,
              drafts,
              toggleSubmissionDetails,
              expandedSubmissionIds,
              onSaveOverride: (submission: SubmissionRow) => void handleSaveOverride(submission),
              onStartTeacherRecording: (id: string) => void startTeacherRecording(id),
              onStopTeacherRecording: (id: string) => stopTeacherRecording(id),
              onSaveTeacherAudio: (submission: SubmissionRow) => void handleSaveTeacherAudio(submission),
              onClearTeacherRecording: (id: string) => clearTeacherRecording(id),
              onDeleteSubmission: (submission: SubmissionRow) => void handleDeleteSubmission(submission),
              deletingSubmissionById,
              updateDraft,
              analyticsPromptFilter,
              setAnalyticsPromptFilter,
              analyticsPromptOptions,
              submissionAnalytics,
              filteredProjectVideoSubmissions,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
