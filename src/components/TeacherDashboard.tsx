import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import TeacherClassesOverview from "./teacher/TeacherClassesOverview";
import TeacherClassDetail from "./teacher/TeacherClassDetail";
import TeacherPromptPanel from "./teacher/TeacherPromptPanel";
import TeacherAssignmentLibrary from "./teacher/TeacherAssignmentLibrary";
import TeacherSubmissionsPanel from "./teacher/TeacherSubmissionsPanel";
import { AssignmentActivityType, DraftState, DraftsById, PromptAssignmentRow, PromptRow, StudentRow, SubmissionRow } from "./TeacherDashboardTypes";
import { DEFAULT_DEMO_CONFIG, DEMO_CONFIG_SETTING_KEY, DemoConfig, parseDemoConfigValue } from "../lib/demoConfig";

const SUBMISSION_SELECT =
  "id, prompt_id, response_mode, text_response, completion_marked_at, student_name, prompt_text, audio_path, audio_url, video_path, video_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, teacher_score, teacher_comment, student_code, prompt:prompts(assignment_type)";
const PROMPT_SELECT = "id, prompt_text, assignment_type, external_url, class_name, suggested_time, prompt_image_path, prompt_image_url, example_text, is_active, created_at, prompt_assignments(id, prompt_id, class_name, is_visible, created_at)";

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
  settingsPanel: {
    background: "#ffffff",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    padding: "16px",
    marginBottom: "14px",
  },
  settingsLabel: {
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#64748b",
    marginBottom: "6px",
  },
  settingsTitle: {
    margin: "0 0 6px",
    fontSize: "20px",
    fontWeight: 900,
    color: "#0f172a",
  },
  settingsDescription: {
    margin: "0 0 10px",
    fontSize: "13px",
    color: "#64748b",
  },
  settingsPreview: {
    width: "100%",
    maxHeight: "180px",
    objectFit: "cover" as const,
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    marginBottom: "10px",
  },
  settingsActionRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    alignItems: "center",
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

function deriveAssignmentType(prompt: Pick<PromptRow, "assignment_type">): AssignmentActivityType {
  if (prompt.assignment_type) return prompt.assignment_type;
  return "audio_response";
}

const PROMPT_IMAGES_BUCKET = "prompt-images";
const APP_ASSETS_BUCKET = "app-assets";
const STUDENT_WELCOME_IMAGE_SETTING_KEY = "student_welcome_image_url";
const MAX_WELCOME_IMAGE_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_WELCOME_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getFileExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

function extractStoragePathFromPublicUrl(publicUrl: string, bucket: string): string {
  const marker = `/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return "";
  return publicUrl.slice(markerIndex + marker.length).split("?")[0];
}

async function saveAppSettingViaApi(key: string, value: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Teacher session expired. Please sign in again.");
  }

  const response = await fetch("/api/app-settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    let message = "Could not save settings.";
    try {
      const payload = (await response.json()) as { error?: string; message?: string; missingEnvVar?: string };
      if (payload?.error) {
        message = payload.error;
        if (payload.missingEnvVar) {
          message = `${payload.error} (${payload.missingEnvVar})`;
        }
      } else if (payload?.message) {
        message = payload.message;
      } else if (payload && typeof payload === "object") {
        message = JSON.stringify(payload);
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }
}

function demoActivityTypeLabel(type: DemoConfig["activities"][number]["type"], hasImage: boolean) {
  if (type === "external_link") return "External link";
  if (type === "video_response") return "Video response";
  if (type === "text_response") return "Text response";
  if (type === "audio_response" && hasImage) return "Describe a picture";
  return "Speaking / Audio response";
}

export default function TeacherDashboard() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSubmissionIdRef = useRef<string | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const newStudentNameInputRef = useRef<HTMLInputElement | null>(null);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newSuggestedTime, setNewSuggestedTime] = useState("");
  const [newAssignmentType, setNewAssignmentType] = useState<AssignmentActivityType>("audio_response");
  const [newInstructions, setNewInstructions] = useState("");
  const [newExternalUrl, setNewExternalUrl] = useState("");
  const [newPromptImageFile, setNewPromptImageFile] = useState<File | null>(null);
  const [newPromptImagePreviewUrl, setNewPromptImagePreviewUrl] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [promptSuccess, setPromptSuccess] = useState("");
  const [savingPromptVisibilityById, setSavingPromptVisibilityById] = useState<Record<string, boolean>>({});
  const [removingPromptFromClassById, setRemovingPromptFromClassById] = useState<Record<string, boolean>>({});
  const [deletingPromptById, setDeletingPromptById] = useState<Record<string, boolean>>({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [teacherScreen, setTeacherScreen] = useState<"dashboard" | "activities" | "classes" | "submissions" | "settings" | "demo">("dashboard");
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterSuccess, setRosterSuccess] = useState("");
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [studentWelcomeImageUrl, setStudentWelcomeImageUrl] = useState<string | null>(null);
  const [studentWelcomeImageFile, setStudentWelcomeImageFile] = useState<File | null>(null);
  const [studentWelcomeImagePreviewUrl, setStudentWelcomeImagePreviewUrl] = useState("");
  const [isLoadingStudentWelcomeImage, setIsLoadingStudentWelcomeImage] = useState(false);
  const [isSavingStudentWelcomeImage, setIsSavingStudentWelcomeImage] = useState(false);
  const [studentWelcomeImageError, setStudentWelcomeImageError] = useState("");
  const [studentWelcomeImageSuccess, setStudentWelcomeImageSuccess] = useState("");
  const [demoConfig, setDemoConfig] = useState<DemoConfig>(DEFAULT_DEMO_CONFIG);
  const [isLoadingDemoConfig, setIsLoadingDemoConfig] = useState(false);
  const [isSavingDemoConfig, setIsSavingDemoConfig] = useState(false);
  const [demoConfigError, setDemoConfigError] = useState("");
  const [demoConfigSuccess, setDemoConfigSuccess] = useState("");
  const [hasCopiedDemoLink, setHasCopiedDemoLink] = useState(false);
  const [activeDemoEditId, setActiveDemoEditId] = useState<string | null>(null);
  const [demoActivityImageById, setDemoActivityImageById] = useState<Record<string, File | null>>({});

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

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [prompts]);

  const promptAssignmentsByPromptId = useMemo(() => {
    const map = new Map<string, PromptAssignmentRow[]>();
    prompts.forEach((prompt) => {
      map.set(prompt.id, prompt.prompt_assignments ?? []);
    });
    return map;
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
  const studentWelcomeImageDisplayUrl = studentWelcomeImagePreviewUrl || studentWelcomeImageUrl || "";

  useEffect(() => {
    let isMounted = true;

    const fetchStudentWelcomeImage = async () => {
      setIsLoadingStudentWelcomeImage(true);
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", STUDENT_WELCOME_IMAGE_SETTING_KEY).maybeSingle();
      if (!isMounted) return;
      if (error) {
        setStudentWelcomeImageError(error.message || "Could not load student welcome image setting.");
        setIsLoadingStudentWelcomeImage(false);
        return;
      }
      const value = (data as { value?: string | null } | null)?.value?.trim() ?? "";
      setStudentWelcomeImageUrl(value || null);
      setIsLoadingStudentWelcomeImage(false);
    };

    void fetchStudentWelcomeImage();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchDemoConfig = async () => {
      setIsLoadingDemoConfig(true);
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", DEMO_CONFIG_SETTING_KEY).maybeSingle();
      if (!isMounted) return;
      if (error) {
        setDemoConfigError(error.message || "Could not load demo settings.");
        setIsLoadingDemoConfig(false);
        return;
      }
      const value = (data as { value?: string | null } | null)?.value ?? "";
      setDemoConfig(parseDemoConfigValue(value));
      setIsLoadingDemoConfig(false);
    };
    void fetchDemoConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (studentWelcomeImagePreviewUrl) URL.revokeObjectURL(studentWelcomeImagePreviewUrl);
    };
  }, [studentWelcomeImagePreviewUrl]);

  const persistDemoConfig = useCallback(async (nextConfig: DemoConfig, successMessage: string) => {
    setIsSavingDemoConfig(true);
    setDemoConfigError("");
    setDemoConfigSuccess("");
    try {
      await saveAppSettingViaApi(DEMO_CONFIG_SETTING_KEY, nextConfig);
      setDemoConfig(nextConfig);
      setDemoConfigSuccess(successMessage);
      return true;
    } catch (error: any) {
      setDemoConfigError(error?.message || "Could not save demo configuration.");
      return false;
    } finally {
      setIsSavingDemoConfig(false);
    }
  }, []);

  const submissionPromptOptions = useMemo(() => {
    const promptSet = new Set<string>();

    prompts.forEach((prompt) => {
      const promptText = prompt.prompt_text?.trim() ?? "";
      if (!promptText) return;
      const promptClasses = (prompt.prompt_assignments ?? []).map((row) => row.class_name.trim());
      if (!selectedClassName || promptClasses.includes(selectedClassName)) {
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
    setSubmissionPromptFilter("__all_prompts__");
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

  const classScopedPrompts = useMemo(() => {
    return sortedPrompts.filter((prompt) => (prompt.prompt_assignments ?? []).some((row) => row.class_name.trim() === selectedClassName));
  }, [sortedPrompts, selectedClassName]);

  const unassignedPrompts = useMemo(() => {
    return sortedPrompts.filter((prompt) => !(prompt.prompt_assignments?.length));
  }, [sortedPrompts]);

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
      (prompt.prompt_assignments ?? []).forEach((assignment) => {
        const className = assignment.class_name?.trim() ?? "";
        if (!className) return;
        promptCounts.set(className, (promptCounts.get(className) ?? 0) + 1);
      });
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
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [students, prompts, submissions, getSubmissionClassName]);

  const submissionsNeedingReview = useMemo(() => {
    return submissions.filter((submission) => {
      const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;
      return !submission.teacher_comment && !savedTeacherAudioUrl;
    }).length;
  }, [submissions]);

  const studentEntryUrl = useMemo(() => {
    if (typeof window === "undefined") return "/?mode=student";
    return `${window.location.origin}/?mode=student`;
  }, []);

  const analyticsPromptOptions = useMemo(() => {
    if (!selectedClassName) return [];
    const promptSet = new Set<string>();

    prompts.forEach((prompt) => {
      const promptText = prompt.prompt_text?.trim() ?? "";
      const promptClasses = (prompt.prompt_assignments ?? []).map((row) => row.class_name.trim());
      if (!promptText) return;
      if (promptClasses.includes(selectedClassName)) {
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
      .select(PROMPT_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      setPromptError(error.message);
      return;
    }
    const rows = ((data ?? []) as PromptRow[]).map((prompt) => {
      const normalizedPrompt: PromptRow = {
        ...prompt,
        assignment_type: deriveAssignmentType(prompt),
      };
      if (normalizedPrompt.prompt_assignments?.length) return normalizedPrompt;
      const fallbackClass = normalizedPrompt.class_name?.trim();
      if (!fallbackClass) return { ...normalizedPrompt, prompt_assignments: [] };
      return {
        ...normalizedPrompt,
        prompt_assignments: [{
          id: `legacy-${normalizedPrompt.id}-${fallbackClass}`,
          prompt_id: normalizedPrompt.id,
          class_name: fallbackClass,
          is_visible: Boolean(normalizedPrompt.is_active),
          created_at: normalizedPrompt.created_at ?? null,
        }],
      };
    });
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
      return false;
    }
    const rows = (data ?? []) as SubmissionRow[];
    setSubmissions(rows);
    hydrateDrafts(rows);
    setIsLoadingSubmissions(false);
    return true;
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
      return false;
    }
    setStudents((data ?? []) as StudentRow[]);
    return true;
  }, []);

  useEffect(() => {
    void fetchPrompts();
    void fetchStudents();
    void fetchSubmissions();
  }, [fetchPrompts, fetchStudents, fetchSubmissions]);

  async function handleSavePrompt() {
    if (isSavingPrompt) return;
    const text = newPrompt.trim();
    const instructions = newInstructions.trim();
    const externalUrl = newExternalUrl.trim();
    if (!text) return;
    if (newAssignmentType === "external_link" && !externalUrl) {
      setPromptError("External URL is required for external activity assignments.");
      return;
    }
    setIsSavingPrompt(true);
    setPromptError("");
    setPromptSuccess("");
    let promptImagePath: string | null = null;
    let promptImageUrl: string | null = null;

    if (newPromptImageFile && newAssignmentType !== "external_link") {
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

    const { data: insertedPrompt, error } = await supabase
      .from("prompts")
      .insert({
        prompt_text: text,
        assignment_type: newAssignmentType,
        external_url: newAssignmentType === "external_link" ? externalUrl : null,
        class_name: null,
        suggested_time: newSuggestedTime.trim() || null,
        prompt_image_path: promptImagePath,
        prompt_image_url: promptImageUrl,
        example_text: instructions || null,
        is_active: false,
      })
      .select("id")
      .single();
    if (error || !insertedPrompt?.id) {
      setPromptError(error?.message || "Could not save assignment.");
      if (promptImagePath) {
        await supabase.storage.from(PROMPT_IMAGES_BUCKET).remove([promptImagePath]);
      }
      setIsSavingPrompt(false);
      return;
    }
    setNewPrompt("");
    setNewSuggestedTime("");
    setNewAssignmentType("audio_response");
    setNewInstructions("");
    setNewExternalUrl("");
    setNewPromptImageFile(null);
    if (newPromptImagePreviewUrl) {
      URL.revokeObjectURL(newPromptImagePreviewUrl);
      setNewPromptImagePreviewUrl("");
    }
    setPromptSuccess(`Assignment saved: “${text}”`);
    setIsSavingPrompt(false);
    await fetchPrompts();
  }

  async function handleTogglePromptVisibility(prompt: PromptRow, className: string) {
    const normalizedClassName = className.trim();
    if (!normalizedClassName) return;
    const assignment = (prompt.prompt_assignments ?? []).find((row) => row.class_name.trim() === normalizedClassName);
    if (!assignment) {
      setPromptError(`This prompt is not assigned to ${normalizedClassName}.`);
      return;
    }
    setPromptError("");
    setPromptSuccess("");
    const savingKey = `${prompt.id}:${normalizedClassName}`;
    setSavingPromptVisibilityById((prev) => ({ ...prev, [savingKey]: true }));
    const nextVisible = !Boolean(assignment.is_visible);
    const { error } = await supabase
      .from("prompt_assignments")
      .update({ is_visible: nextVisible })
      .eq("prompt_id", prompt.id)
      .eq("class_name", normalizedClassName);
    if (error) {
      setPromptError(error.message);
      setSavingPromptVisibilityById((prev) => ({ ...prev, [savingKey]: false }));
      return;
    }
    setPromptSuccess(`Prompt is now ${nextVisible ? "visible" : "hidden"} for students in ${normalizedClassName}.`);
    setSavingPromptVisibilityById((prev) => ({ ...prev, [savingKey]: false }));
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
    const { error } = await supabase.from("prompt_assignments").update({ is_visible: false }).eq("class_name", className);
    if (error) {
      setPromptError(error.message);
      return;
    }
    setPromptSuccess(`No prompts are currently visible for ${className}.`);
    await fetchPrompts();
  }

  async function handleTogglePromptAssignment(prompt: PromptRow, className: string, shouldAssign: boolean) {
    const trimmedClassName = className.trim();
    if (!trimmedClassName) return;
    const currentAssignments = promptAssignmentsByPromptId.get(prompt.id) ?? [];
    const hasAssignment = currentAssignments.some((row) => row.class_name.trim() === trimmedClassName);
    if (shouldAssign === hasAssignment) return;

    setPromptError("");
    setPromptSuccess("");
    const query = shouldAssign
      ? supabase.from("prompt_assignments").upsert({
        prompt_id: prompt.id,
        class_name: trimmedClassName,
        is_visible: true,
      }, { onConflict: "prompt_id,class_name" })
      : supabase.from("prompt_assignments").delete().eq("prompt_id", prompt.id).eq("class_name", trimmedClassName);
    const { error } = await query;
    if (error) {
      setPromptError(error.message);
      return;
    }
    if (!shouldAssign) {
      setPrompts((prev) => prev.map((row) => {
        if (row.id !== prompt.id) return row;
        return {
          ...row,
          prompt_assignments: (row.prompt_assignments ?? []).filter((assignment) => assignment.class_name.trim() !== trimmedClassName),
        };
      }));
    }
    setPromptSuccess(
      shouldAssign
        ? `Assigned "${prompt.prompt_text ?? "Prompt"}" to ${trimmedClassName}. It is now visible to students by default.`
        : `Removed "${prompt.prompt_text ?? "Prompt"}" from ${trimmedClassName}.`,
    );
    await fetchPrompts();
  }

  async function handleRemovePromptFromClass(prompt: PromptRow, className: string) {
    const normalizedClassName = className.trim();
    if (!normalizedClassName) {
      setPromptError("Select a class before removing an assignment.");
      return;
    }
    const assignment = (prompt.prompt_assignments ?? []).find((row) => row.class_name.trim() === normalizedClassName);
    if (!assignment) {
      setPromptError(`"${prompt.prompt_text ?? "Prompt"}" is not currently assigned to ${normalizedClassName}.`);
      return;
    }

    const removeKey = `${prompt.id}:${normalizedClassName}`;
    setPromptError("");
    setPromptSuccess("");
    setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: true }));

    const { error } = await supabase
      .from("prompt_assignments")
      .delete()
      .eq("prompt_id", prompt.id)
      .eq("class_name", assignment.class_name);

    if (error) {
      setPromptError(error.message || `Could not remove assignment from ${normalizedClassName}.`);
      setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: false }));
      return;
    }

    const { data: remainingAssignments, error: verifyError } = await supabase
      .from("prompt_assignments")
      .select("id")
      .eq("prompt_id", prompt.id)
      .eq("class_name", assignment.class_name);

    if (verifyError) {
      setPromptError(verifyError.message || `Could not verify removal from ${normalizedClassName}.`);
      setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: false }));
      return;
    }
    if ((remainingAssignments ?? []).length > 0) {
      setPromptError(`Could not remove "${prompt.prompt_text ?? "Prompt"}" from ${normalizedClassName}. Please try again.`);
      setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: false }));
      return;
    }

    const hadLegacyClassMatch = (prompt.class_name?.trim() ?? "") === normalizedClassName;
    if (hadLegacyClassMatch) {
      const { error: clearLegacyClassError } = await supabase
        .from("prompts")
        .update({ class_name: null })
        .eq("id", prompt.id)
        .eq("class_name", assignment.class_name);
      if (clearLegacyClassError) {
        setPromptError(clearLegacyClassError.message || `Removed assignment row, but could not clear legacy class mapping for ${normalizedClassName}.`);
        setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: false }));
        return;
      }
    }

    setPrompts((prev) => prev.map((row) => {
      if (row.id !== prompt.id) return row;
      return {
        ...row,
        class_name: (row.class_name?.trim() ?? "") === normalizedClassName ? null : row.class_name,
        prompt_assignments: (row.prompt_assignments ?? []).filter((existingAssignment) => (
          existingAssignment.class_name.trim() !== normalizedClassName
        )),
      };
    }));
    setPromptSuccess(`Removed "${prompt.prompt_text ?? "Prompt"}" from ${normalizedClassName}.`);
    setRemovingPromptFromClassById((prev) => ({ ...prev, [removeKey]: false }));
    await fetchPrompts();
  }

  function handleNewPromptImageChange(file: File | null) {
    if (newPromptImagePreviewUrl) {
      URL.revokeObjectURL(newPromptImagePreviewUrl);
      setNewPromptImagePreviewUrl("");
    }
    setNewPromptImageFile(file);
    if (!file) return;
    setNewPromptImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleClearNewPromptImage() {
    if (newPromptImagePreviewUrl) {
      URL.revokeObjectURL(newPromptImagePreviewUrl);
      setNewPromptImagePreviewUrl("");
    }
    setNewPromptImageFile(null);
  }

  function handleAssignmentTypeChange(value: AssignmentActivityType) {
    setNewAssignmentType(value);
    if (value === "external_link") {
      handleClearNewPromptImage();
      setNewSuggestedTime("");
    }
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
      setPromptSuccess("Prompt deleted.");
    } catch (error: any) {
      setPromptError(error?.message || "Could not delete prompt.");
    } finally {
      setDeletingPromptById((prev) => ({ ...prev, [prompt.id]: false }));
    }
  }

  async function handleRefreshStudents() {
    setRosterError("");
    setRosterSuccess("");
    const ok = await fetchStudents();
    if (ok) setRosterSuccess("Roster refreshed.");
  }

  async function handleRefreshSubmissions() {
    setSubmissionsSuccess("");
    const ok = await fetchSubmissions();
    if (ok) setSubmissionsSuccess("Submissions refreshed.");
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
      const { error: assignmentError } = await supabase.from("prompt_assignments").delete().eq("class_name", className);
      if (assignmentError) throw assignmentError;

      const { error: promptError } = await supabase.from("prompts").update({ class_name: null }).eq("class_name", className);
      if (promptError) throw promptError;

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

  async function handleSaveStudent(student: StudentRow) {
    const className = (student.class_name ?? "").trim();
    const studentName = student.student_name.trim();
    const studentCode = student.student_code.trim().toUpperCase();

    if (!className || !studentName || !studentCode) {
      setRosterError("Class/group, student name, and student code are required.");
      return;
    }

    setRosterError("");
    setRosterSuccess("");
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
    setRosterSuccess(`Saved ${studentName} (${studentCode}).`);
  }

  async function handleDeleteStudent(studentId: string) {
    const student = students.find((row) => row.id === studentId);
    setRosterError("");
    setRosterSuccess("");
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) {
      setRosterError(error.message);
      return;
    }
    setStudents((prev) => prev.filter((row) => row.id !== studentId));
    const removedLabel = student?.student_name?.trim() || student?.student_code?.trim() || "Student";
    setRosterSuccess(`Deleted ${removedLabel}.`);
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

  function handleStudentWelcomeImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setStudentWelcomeImageError("");
    setStudentWelcomeImageSuccess("");
    if (!file) {
      setStudentWelcomeImageFile(null);
      setStudentWelcomeImagePreviewUrl("");
      return;
    }
    if (!ACCEPTED_WELCOME_IMAGE_TYPES.has(file.type)) {
      setStudentWelcomeImageFile(null);
      setStudentWelcomeImagePreviewUrl("");
      setStudentWelcomeImageError("Use JPG, PNG, WEBP, or GIF.");
      return;
    }
    if (file.size > MAX_WELCOME_IMAGE_FILE_BYTES) {
      setStudentWelcomeImageFile(null);
      setStudentWelcomeImagePreviewUrl("");
      setStudentWelcomeImageError("Image must be 2MB or smaller.");
      return;
    }
    setStudentWelcomeImageFile(file);
    setStudentWelcomeImagePreviewUrl(URL.createObjectURL(file));
  }

  async function handleSaveStudentWelcomeImage() {
    if (!studentWelcomeImageFile) {
      setStudentWelcomeImageError("Choose an image first.");
      return;
    }
    setIsSavingStudentWelcomeImage(true);
    setStudentWelcomeImageError("");
    setStudentWelcomeImageSuccess("");

    const extension = getFileExtensionFromMimeType(studentWelcomeImageFile.type || "");
    const filePath = `student-welcome/hero-${Date.now()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage.from(APP_ASSETS_BUCKET).upload(filePath, studentWelcomeImageFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: studentWelcomeImageFile.type || undefined,
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(APP_ASSETS_BUCKET).getPublicUrl(filePath);

      await saveAppSettingViaApi(STUDENT_WELCOME_IMAGE_SETTING_KEY, publicUrl);

      const previousPath = studentWelcomeImageUrl ? extractStoragePathFromPublicUrl(studentWelcomeImageUrl, APP_ASSETS_BUCKET) : "";
      if (previousPath && previousPath !== filePath) {
        await supabase.storage.from(APP_ASSETS_BUCKET).remove([previousPath]);
      }

      if (studentWelcomeImagePreviewUrl) URL.revokeObjectURL(studentWelcomeImagePreviewUrl);
      setStudentWelcomeImageUrl(publicUrl);
      setStudentWelcomeImageFile(null);
      setStudentWelcomeImagePreviewUrl("");
      setStudentWelcomeImageSuccess("Student welcome image saved.");
    } catch (error: any) {
      setStudentWelcomeImageError(error?.message || "Could not save student welcome image.");
    } finally {
      setIsSavingStudentWelcomeImage(false);
    }
  }

  async function handleResetStudentWelcomeImage() {
    setIsSavingStudentWelcomeImage(true);
    setStudentWelcomeImageError("");
    setStudentWelcomeImageSuccess("");
    try {
      await saveAppSettingViaApi(STUDENT_WELCOME_IMAGE_SETTING_KEY, null);
      const previousPath = studentWelcomeImageUrl ? extractStoragePathFromPublicUrl(studentWelcomeImageUrl, APP_ASSETS_BUCKET) : "";
      if (previousPath) {
        await supabase.storage.from(APP_ASSETS_BUCKET).remove([previousPath]);
      }
      if (studentWelcomeImagePreviewUrl) URL.revokeObjectURL(studentWelcomeImagePreviewUrl);
      setStudentWelcomeImageUrl(null);
      setStudentWelcomeImageFile(null);
      setStudentWelcomeImagePreviewUrl("");
      setStudentWelcomeImageSuccess("Student welcome image reset to default.");
    } catch (error: any) {
      setStudentWelcomeImageError(error?.message || "Could not reset student welcome image.");
    } finally {
      setIsSavingStudentWelcomeImage(false);
    }
  }

  async function handleCopyDemoLink() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(`${window.location.origin}/?mode=demo`);
    setHasCopiedDemoLink(true);
    window.setTimeout(() => setHasCopiedDemoLink(false), 1800);
  }

  async function handleToggleDemoEnabled() {
    await persistDemoConfig({ ...demoConfig, demoEnabled: !demoConfig.demoEnabled }, `Public demo ${demoConfig.demoEnabled ? "disabled" : "enabled"}.`);
  }

  async function handleDemoConfigFieldChange(field: "welcomeTitle" | "welcomeSubtitle" | "heroImageUrl", value: string) {
    await persistDemoConfig({ ...demoConfig, [field]: value }, "Demo branding saved.");
  }

  async function handleDemoActivityChange(activityId: string, patch: Partial<DemoConfig["activities"][number]>) {
    const nextActivities = demoConfig.activities.map((activity) => (activity.id === activityId ? { ...activity, ...patch } : activity));
    await persistDemoConfig({ ...demoConfig, activities: nextActivities }, "Demo activity updated.");
  }

  async function handleMoveDemoActivity(activityId: string, direction: "up" | "down") {
    const sorted = [...demoConfig.activities].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((activity) => activity.id === activityId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sorted.length) return;
    const swapped = [...sorted];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    const ordered = swapped.map((activity, idx) => ({ ...activity, order: idx + 1 }));
    await persistDemoConfig({ ...demoConfig, activities: ordered }, "Demo activity order saved.");
  }

  async function handleResetDemoDefaults() {
    await persistDemoConfig(DEFAULT_DEMO_CONFIG, "Demo settings reset to defaults.");
  }

  function handleDemoActivityImageFileChange(activityId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setDemoActivityImageById((prev) => ({ ...prev, [activityId]: null }));
      return;
    }
    if (!ACCEPTED_WELCOME_IMAGE_TYPES.has(file.type)) {
      setDemoConfigError("Use JPG, PNG, WEBP, or GIF for demo images.");
      return;
    }
    if (file.size > MAX_WELCOME_IMAGE_FILE_BYTES) {
      setDemoConfigError("Demo image must be 2MB or smaller.");
      return;
    }
    setDemoConfigError("");
    setDemoActivityImageById((prev) => ({ ...prev, [activityId]: file }));
  }

  async function handleUploadDemoActivityImage(activityId: string) {
    const file = demoActivityImageById[activityId];
    if (!file) {
      setDemoConfigError("Choose an image first.");
      return;
    }
    const extension = getFileExtensionFromMimeType(file.type || "");
    const filePath = `demo-activities/${activityId}-${Date.now()}.${extension}`;

    setIsSavingDemoConfig(true);
    setDemoConfigError("");
    setDemoConfigSuccess("");
    try {
      const { error: uploadError } = await supabase.storage.from(APP_ASSETS_BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from(APP_ASSETS_BUCKET).getPublicUrl(filePath);
      const prevImage = demoConfig.activities.find((activity) => activity.id === activityId)?.imageUrl || "";
      const nextActivities = demoConfig.activities.map((activity) => (activity.id === activityId ? { ...activity, imageUrl: publicUrl } : activity));
      const saved = await persistDemoConfig({ ...demoConfig, activities: nextActivities }, "Demo activity updated.");
      if (!saved) {
        setDemoConfigError("Image uploaded, but settings could not be saved.");
        return;
      }
      const previousPath = prevImage ? extractStoragePathFromPublicUrl(prevImage, APP_ASSETS_BUCKET) : "";
      if (previousPath && previousPath !== filePath) {
        await supabase.storage.from(APP_ASSETS_BUCKET).remove([previousPath]);
      }
      setDemoActivityImageById((prev) => ({ ...prev, [activityId]: null }));
    } catch (error: any) {
      setDemoConfigError(error?.message || "Could not upload demo activity image.");
    } finally {
      setIsSavingDemoConfig(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          <aside style={{ background: "linear-gradient(175deg, #0f172a, #1e293b)", color: "#fff", borderRadius: 22, padding: 16, border: "1px solid #1e293b", boxShadow: "0 20px 32px rgba(2,6,23,0.32)", position: "sticky", top: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 18 }}>ESL Hub</div>
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "activities", label: "Activities" },
              { key: "classes", label: "Classes" },
              { key: "submissions", label: "Submissions" },
              { key: "demo", label: "Demo" },
              { key: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTeacherScreen(item.key as "dashboard" | "activities" | "classes" | "submissions" | "settings" | "demo")}
                style={{
                  width: "100%",
                  textAlign: "left",
                  minHeight: 42,
                  borderRadius: 12,
                  marginBottom: 8,
                  border: "1px solid transparent",
                  padding: "0 12px",
                  fontWeight: 800,
                  background: teacherScreen === item.key ? "#4f46e5" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <main>
            {teacherScreen === "dashboard" ? (
              <section style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)", padding: 22 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Welcome back</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Here&apos;s a quick overview of your current classes and activity workflow.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Classes</div>
                    <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{classSummaries.length}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Activities</div>
                    <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{sortedPrompts.length}</div>
                  </div>
                  <div style={{ border: "1px solid #fecaca", borderRadius: 14, background: "#fef2f2", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Needs review</div>
                    <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: "#7f1d1d" }}>{submissionsNeedingReview}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Total submissions</div>
                    <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{submissions.length}</div>
                  </div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Quick actions</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button type="button" onClick={() => setTeacherScreen("activities")} style={{ minHeight: 38, borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, padding: "0 12px" }}>Create activity</button>
                    <button type="button" onClick={() => setTeacherScreen("activities")} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 12px" }}>Browse assignment library</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                          void navigator.clipboard.writeText(studentEntryUrl);
                        }
                      }}
                      style={{ minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, padding: "0 12px" }}
                    >
                      Copy student link
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Use this link for student login or QR generation: {studentEntryUrl}</div>
                </div>
              </section>
            ) : null}

            {teacherScreen === "classes" && !selectedClassName ? (
          <TeacherClassesOverview
            classSummaries={classSummaries}
            studentEntryUrl={studentEntryUrl}
            newClassName={newClassName}
            onNewClassNameChange={setNewClassName}
            onUseNewClass={handleUseNewClass}
            onRefreshClasses={() => void fetchStudents()}
            onSelectClass={(className: string) => setSelectedClass(className)}
            rosterError={rosterError}
            onOpenAssignmentLibrary={() => setTeacherScreen("activities")}
          />
            ) : null}

            {teacherScreen === "classes" && selectedClassName ? (
          <TeacherClassDetail
            selectedClassName={selectedClassName}
            selectedClassStudents={selectedClassStudents}
            needsReviewCount={classNeedsReviewCount}
            assignedPromptCount={sortedPrompts.filter((prompt) => (prompt.prompt_assignments ?? []).some((row) => row.class_name.trim() === selectedClassName)).length}
            rosterPanelProps={{
              selectedClassName,
              isDeletingClass,
              onBack: () => setSelectedClass(null),
              onDeleteClass: () => void handleDeleteSelectedClass(),
              newStudentName,
              newStudentCode,
              setNewStudentName,
              setNewStudentCode,
              onAddStudent: () => void handleAddStudent(),
              onRefreshStudents: () => void handleRefreshStudents(),
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
              mode: "class",
              selectedClassName,
              newPrompt,
              newSuggestedTime,
              newAssignmentType,
              newInstructions,
              newExternalUrl,
              setNewPrompt,
              setNewSuggestedTime,
              setNewAssignmentType: handleAssignmentTypeChange,
              setNewInstructions,
              setNewExternalUrl,
              newPromptImagePreviewUrl,
              onPromptImageChange: handleNewPromptImageChange,
              onClearPromptImage: handleClearNewPromptImage,
              createClassName: "",
              setCreateClassName: () => undefined,
              classNameOptions,
              onSavePrompt: () => void handleSavePrompt(),
              isSavingPrompt,
              promptSuccess,
              promptError,
              filteredPrompts: classScopedPrompts,
              onTogglePromptAssignment: (prompt: PromptRow, className: string, shouldAssign: boolean) => void handleTogglePromptAssignment(prompt, className, shouldAssign),
              onTogglePromptVisibility: (prompt: PromptRow, className: string) => void handleTogglePromptVisibility(prompt, className),
              onRemovePromptFromClass: (prompt: PromptRow, className: string) => void handleRemovePromptFromClass(prompt, className),
              onDeletePrompt: (prompt: PromptRow) => void handleDeletePrompt(prompt),
              savingPromptVisibilityById,
              removingPromptFromClassById,
              deletingPromptById,
              onClearVisiblePromptsForSelectedClass: () => void handleClearVisiblePromptsForSelectedClass(),
              emptyStateText: `No assignments are currently assigned to ${selectedClassName}. Browse the Assignment Library to assign one.`,
              showCreateForm: false,
              showBulkHideButton: false,
              onHeaderAction: () => setTeacherScreen("activities"),
              headerActionLabel: "Browse Assignment Library",
            }}
            submissionsPanelProps={{
              selectedClassName,
              reviewFilter,
              setReviewFilter,
              onRefreshSubmissions: () => void handleRefreshSubmissions(),
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
              submissionsSuccess,
              submissionsError,
            }}
          />
            ) : null}

            {teacherScreen === "activities" ? (
              <TeacherAssignmentLibrary
                totalPromptCount={sortedPrompts.length}
                classNameOptions={classNameOptions}
                unassignedPromptCount={unassignedPrompts.length}
                prompts={sortedPrompts}
                newPrompt={newPrompt}
                newSuggestedTime={newSuggestedTime}
                newAssignmentType={newAssignmentType}
                newInstructions={newInstructions}
                newExternalUrl={newExternalUrl}
                newPromptImagePreviewUrl={newPromptImagePreviewUrl}
                setNewPrompt={setNewPrompt}
                setNewSuggestedTime={setNewSuggestedTime}
                setNewAssignmentType={handleAssignmentTypeChange}
                setNewInstructions={setNewInstructions}
                setNewExternalUrl={setNewExternalUrl}
                onPromptImageChange={handleNewPromptImageChange}
                onClearPromptImage={handleClearNewPromptImage}
                onSavePrompt={() => void handleSavePrompt()}
                isSavingPrompt={isSavingPrompt}
                promptSuccess={promptSuccess}
                promptError={promptError}
                onTogglePromptAssignment={(prompt: PromptRow, className: string, shouldAssign: boolean) => void handleTogglePromptAssignment(prompt, className, shouldAssign)}
                onTogglePromptVisibility={(prompt: PromptRow, className: string) => void handleTogglePromptVisibility(prompt, className)}
                onRemovePromptFromClass={(prompt: PromptRow, className: string) => void handleRemovePromptFromClass(prompt, className)}
                onDeletePrompt={(prompt: PromptRow) => void handleDeletePrompt(prompt)}
                savingPromptVisibilityById={savingPromptVisibilityById}
                removingPromptFromClassById={removingPromptFromClassById}
                deletingPromptById={deletingPromptById}
                onGoToClasses={() => setTeacherScreen("classes")}
              />
            ) : null}

            {teacherScreen === "submissions" ? (
              <section style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: 16 }}>
                <TeacherSubmissionsPanel
                  selectedClassName={selectedClassName || ""}
                  reviewFilter={reviewFilter}
                  setReviewFilter={setReviewFilter}
                  onRefreshSubmissions={() => void handleRefreshSubmissions()}
                  isLoadingSubmissions={isLoadingSubmissions}
                  submissionPromptFilter={submissionPromptFilter}
                  setSubmissionPromptFilter={setSubmissionPromptFilter}
                  submissionPromptOptions={submissionPromptOptions}
                  selectedStudentFilter={selectedStudentFilter}
                  onClearStudentFilter={() => setSelectedStudentFilter(null)}
                  filteredSubmissions={filteredSubmissions}
                  drafts={drafts}
                  toggleSubmissionDetails={toggleSubmissionDetails}
                  expandedSubmissionIds={expandedSubmissionIds}
                  onSaveOverride={(submission: SubmissionRow) => void handleSaveOverride(submission)}
                  onStartTeacherRecording={(id: string) => void startTeacherRecording(id)}
                  onStopTeacherRecording={(id: string) => stopTeacherRecording(id)}
                  onSaveTeacherAudio={(submission: SubmissionRow) => void handleSaveTeacherAudio(submission)}
                  onClearTeacherRecording={(id: string) => clearTeacherRecording(id)}
                  onDeleteSubmission={(submission: SubmissionRow) => void handleDeleteSubmission(submission)}
                  deletingSubmissionById={deletingSubmissionById}
                  updateDraft={updateDraft}
                  analyticsPromptFilter={analyticsPromptFilter}
                  setAnalyticsPromptFilter={setAnalyticsPromptFilter}
                  analyticsPromptOptions={analyticsPromptOptions}
                  submissionAnalytics={submissionAnalytics}
                  submissionsSuccess={submissionsSuccess}
                  submissionsError={submissionsError}
                />
              </section>
            ) : null}

            {teacherScreen === "demo" ? (
              <section style={{ display: "grid", gap: 16 }}>
                <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)", padding: 20 }}>
                  <div style={styles.settingsLabel}>Demo status</div>
                  <h2 style={{ ...styles.settingsTitle, marginBottom: 6 }}>Public demo control center</h2>
                  <p style={{ ...styles.settingsDescription, marginBottom: 12 }}>Manage public access, AI demo feedback, and your shareable demo link from one place.</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 14, padding: "10px 12px", background: "#f8fafc" }}>
                      <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>Public demo availability</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, color: demoConfig.demoEnabled ? "#065f46" : "#b45309", fontWeight: 700 }}>
                          {demoConfig.demoEnabled ? "Live" : "Paused"}
                        </div>
                        <button type="button" onClick={() => void handleToggleDemoEnabled()} disabled={isSavingDemoConfig || isLoadingDemoConfig} style={clampButton(isSavingDemoConfig || isLoadingDemoConfig, styles.secondaryButton)}>
                          {demoConfig.demoEnabled ? "Pause demo" : "Enable demo"}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 14, padding: "10px 12px", background: "#f8fafc" }}>
                      <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>AI demo feedback</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, color: demoConfig.aiFeedbackEnabled ? "#065f46" : "#b45309", fontWeight: 700 }}>
                          {demoConfig.aiFeedbackEnabled ? "Enabled (daily limits active)" : "Disabled"}
                        </div>
                        <button
                          type="button"
                          onClick={() => void persistDemoConfig({ ...demoConfig, aiFeedbackEnabled: !demoConfig.aiFeedbackEnabled }, `Demo AI feedback ${demoConfig.aiFeedbackEnabled ? "disabled" : "enabled"}.`)}
                          disabled={isSavingDemoConfig || isLoadingDemoConfig}
                          style={clampButton(isSavingDemoConfig || isLoadingDemoConfig, styles.secondaryButton)}
                        >
                          {demoConfig.aiFeedbackEnabled ? "Turn AI off" : "Turn AI on"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, border: "1px dashed #cbd5e1", borderRadius: 14, background: "#ffffff", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 }}>Public demo link</div>
                    <div style={{ fontSize: 13, color: "#475569", marginBottom: 8, wordBreak: "break-all" }}>{window.location.origin}/?mode=demo</div>
                    <button type="button" onClick={() => void handleCopyDemoLink()} style={styles.secondaryButton}>
                      {hasCopiedDemoLink ? "Copied" : "Copy demo link"}
                    </button>
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)", padding: 20 }}>
                  <div style={styles.settingsLabel}>Demo branding</div>
                  <h2 style={{ ...styles.settingsTitle, marginBottom: 6 }}>Landing message</h2>
                  <p style={{ ...styles.settingsDescription, marginBottom: 10 }}>Edit the copy and hero image URL students see before they launch the demo.</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input value={demoConfig.welcomeTitle} onChange={(e) => void handleDemoConfigFieldChange("welcomeTitle", e.target.value)} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="Welcome title" />
                    <input value={demoConfig.welcomeSubtitle} onChange={(e) => void handleDemoConfigFieldChange("welcomeSubtitle", e.target.value)} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="Welcome subtitle" />
                    <input value={demoConfig.heroImageUrl || ""} onChange={(e) => void handleDemoConfigFieldChange("heroImageUrl", e.target.value)} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="Optional hero image URL" />
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)", padding: 20 }}>
                  <div style={styles.settingsLabel}>Activity configuration</div>
                  <h2 style={{ ...styles.settingsTitle, marginBottom: 6 }}>Demo activity cards</h2>
                  <p style={{ ...styles.settingsDescription, marginBottom: 12 }}>Adjust visibility, order, prompts, and images so the demo mirrors your product quality.</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[...demoConfig.activities].sort((a, b) => a.order - b.order).map((activity) => (
                      <div key={activity.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#f8fafc" }}>
                        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: 5 }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 16 }}>{activity.title}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                              <span style={{ ...styles.promptBadge, background: "#fff" }}>{demoActivityTypeLabel(activity.type, Boolean(activity.imageUrl))}</span>
                              <span style={{ color: "#64748b" }}>{activity.suggestedTime || "No suggested time"}</span>
                            </div>
                            <div style={{ color: "#475569", fontSize: 13 }}>{activity.prompt.slice(0, 140) || "No prompt yet."}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: activity.visible ? "#065f46" : "#b45309" }}>{activity.visible ? "Visible" : "Hidden"}</div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          <button type="button" onClick={() => setActiveDemoEditId((prev) => (prev === activity.id ? null : activity.id))} disabled={isSavingDemoConfig} style={clampButton(isSavingDemoConfig, styles.promptAssignmentButton)}>
                            {activeDemoEditId === activity.id ? "Close" : "Edit"}
                          </button>
                          <button type="button" onClick={() => void handleDemoActivityChange(activity.id, { visible: !activity.visible })} disabled={isSavingDemoConfig} style={clampButton(isSavingDemoConfig, styles.promptAssignmentButton)}>
                            {activity.visible ? "Hide" : "Show"}
                          </button>
                          <button type="button" onClick={() => void handleMoveDemoActivity(activity.id, "up")} disabled={isSavingDemoConfig} style={clampButton(isSavingDemoConfig, styles.promptAssignmentButton)}>Move up</button>
                          <button type="button" onClick={() => void handleMoveDemoActivity(activity.id, "down")} disabled={isSavingDemoConfig} style={clampButton(isSavingDemoConfig, styles.promptAssignmentButton)}>Move down</button>
                        </div>
                        {activeDemoEditId === activity.id ? (
                          <div style={{ marginTop: 10, borderTop: "1px solid #dbe3f0", paddingTop: 10, display: "grid", gap: 8 }}>
                            <input value={activity.title} onChange={(e) => void handleDemoActivityChange(activity.id, { title: e.target.value })} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="Card title" />
                            <input value={activity.suggestedTime} onChange={(e) => void handleDemoActivityChange(activity.id, { suggestedTime: e.target.value })} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="Suggested time (example: 1 minute)" />
                            <textarea value={activity.prompt} onChange={(e) => void handleDemoActivityChange(activity.id, { prompt: e.target.value })} disabled={isSavingDemoConfig} style={{ ...styles.rosterInput, minHeight: 90, padding: 10 }} placeholder="Prompt / instructions" />
                            {activity.type === "external_link" ? (
                              <input value={activity.externalUrl || ""} onChange={(e) => void handleDemoActivityChange(activity.id, { externalUrl: e.target.value })} disabled={isSavingDemoConfig} style={styles.rosterInput} placeholder="External URL" />
                            ) : null}
                            {activity.id.includes("picture") ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                {activity.imageUrl ? <img src={activity.imageUrl} alt="Demo activity" style={{ width: "100%", maxHeight: 170, objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1" }} /> : null}
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => handleDemoActivityImageFileChange(activity.id, e)} disabled={isSavingDemoConfig} />
                                <button type="button" onClick={() => void handleUploadDemoActivityImage(activity.id)} disabled={isSavingDemoConfig || !demoActivityImageById[activity.id]} style={clampButton(isSavingDemoConfig || !demoActivityImageById[activity.id], styles.secondaryButton)}>
                                  Upload picture
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #e2e8f0", boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)", padding: 18 }}>
                  <div style={styles.settingsLabel}>Reset defaults</div>
                  <p style={{ ...styles.settingsDescription, marginBottom: 8 }}>Restore demo copy, activities, and visibility settings to the ESL Hub defaults.</p>
                  <button type="button" onClick={() => void handleResetDemoDefaults()} disabled={isSavingDemoConfig} style={clampButton(isSavingDemoConfig, { ...styles.secondaryButton, borderColor: "#fecaca", color: "#b91c1c" })}>
                    Reset demo defaults
                  </button>
                  {isLoadingDemoConfig ? <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Loading demo config...</div> : null}
                  {demoConfigError ? <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>{demoConfigError}</div> : null}
                  {demoConfigSuccess ? <div style={{ marginTop: 8, fontSize: 13, color: "#065f46" }}>{demoConfigSuccess}</div> : null}
                </div>
              </section>
            ) : null}

            {teacherScreen === "settings" ? (
              <section style={styles.settingsPanel}>
                <div style={styles.settingsLabel}>App settings</div>
                <h2 style={styles.settingsTitle}>Student welcome image</h2>
                <p style={styles.settingsDescription}>This controls the hero image on the student code-entry screen.</p>
                {studentWelcomeImageDisplayUrl ? <img src={studentWelcomeImageDisplayUrl} alt="Student welcome preview" style={styles.settingsPreview} /> : null}
                <div style={styles.settingsActionRow}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleStudentWelcomeImageFileChange}
                    disabled={isSavingStudentWelcomeImage}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveStudentWelcomeImage()}
                    style={clampButton(isSavingStudentWelcomeImage || !studentWelcomeImageFile, styles.secondaryButton)}
                    disabled={isSavingStudentWelcomeImage || !studentWelcomeImageFile}
                  >
                    {isSavingStudentWelcomeImage ? "Saving..." : "Save image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResetStudentWelcomeImage()}
                    style={clampButton(isSavingStudentWelcomeImage, { ...styles.secondaryButton, borderColor: "#fecaca", color: "#b91c1c" })}
                    disabled={isSavingStudentWelcomeImage}
                  >
                    Reset to default
                  </button>
                </div>
                {isLoadingStudentWelcomeImage ? <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Loading current image...</div> : null}
                {studentWelcomeImageError ? <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>{studentWelcomeImageError}</div> : null}
                {studentWelcomeImageSuccess ? <div style={{ marginTop: 8, fontSize: 13, color: "#065f46" }}>{studentWelcomeImageSuccess}</div> : null}
                <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>Allowed: JPG, PNG, WEBP, GIF · Max file size: 2MB.</div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
