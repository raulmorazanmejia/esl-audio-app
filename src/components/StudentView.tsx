import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import ReliableAudioPlayer from "./ReliableAudioPlayer";
import { DEFAULT_DEMO_CONFIG, DEMO_CONFIG_SETTING_KEY, DemoConfig, FeedbackProfile, parseDemoConfigValue } from "../lib/demoConfig";

type PromptRow = {
  id: string;
  prompt_text: string | null;
  assignment_type: "audio_response" | "video_response" | "text_response" | "external_link" | "guided_speaking" | "multiple_choice" | null;
  external_url: string | null;
  class_name: string | null;
  suggested_time: string | null;
  prompt_image_path: string | null;
  prompt_image_url: string | null;
  example_text: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  prompt_assignments?: {
    class_name: string;
    is_visible: boolean;
  }[];
};

type SubmissionRow = {
  id: string;
  prompt_id: string | null;
  response_mode: "audio" | "video" | "text" | "multiple_choice" | "guided_speaking" | null;
  text_response: string | null;
  completion_marked_at: string | null;
  student_name: string | null;
  prompt_text: string | null;
  audio_path: string | null;
  audio_url: string | null;
  video_path: string | null;
  video_url: string | null;
  status: string | null;
  created_at: string | null;
  feedback_audio_path: string | null;
  feedback_audio_url: string | null;
  feedback_status: string | null;
  feedback_created_at: string | null;
  student_email: string | null;
  student_auth_id: string | null;
  feedback_url: string | null;
  transcript: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  ai_strengths?: string[] | null;
  ai_improvements?: string[] | null;
  ai_picture_accuracy?: { correct?: string[]; missing?: string[]; incorrect?: string[] } | string | null;
  ai_grammar_feedback?: string[] | null;
  ai_score_reason?: string | null;
  ai_model_answer?: string | null;
  teacher_score: number | null;
  teacher_comment: string | null;
  student_code: string | null;
};

type StudentRosterRow = {
  id: string;
  class_name: string | null;
  student_name: string;
  student_code: string;
};

type AnalyzeResponse = {
  transcript?: string | null;
  score?: number | null;
  comment?: string | null;
  strengths?: string[];
  improvements?: string[];
  pictureAccuracy?: { correct?: string[]; missing?: string[]; incorrect?: string[] };
  grammarFeedback?: string[];
  scoreReason?: string;
  modelAnswer?: string;
  flagged?: boolean;
  error?: string;
};

const MAX_AUDIO_RECORDING_SECONDS = 5 * 60;
const DEMO_MAX_AUDIO_RECORDING_SECONDS = 90;
const DEMO_MAX_ATTEMPTS_PER_DAY = 3;
const DEMO_MAX_TRANSCRIPT_CHARS = 700;
const DEMO_SERVER_HARD_FLOOR_MS = 3_000;
const DEMO_USAGE_STORAGE_KEY = "esl_demo_usage_v1";
const DEMO_AI_UNAVAILABLE_MESSAGE = "Demo feedback is unavailable right now. Please try again later.";
const DEMO_LIMIT_REACHED_MESSAGE = "Demo limit reached for today. Please try again later.";
const DEMO_NON_AI_MESSAGE = "Demo feedback is currently in non-AI mode. Enable AI demo feedback to see transcript and scoring.";
const DEMO_AI_ANALYZING_MESSAGE = "Analyzing your response…";
const DEMO_MODE_QUERY_VALUE = "demo";
const DEMO_CLASS_NAME = "demo-class";
const DEMO_STUDENT_CODE = "DEMO";

function getIsDemoModeFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === DEMO_MODE_QUERY_VALUE;
}

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getRequiredDemoCooldownMs(attemptsToday: number) {
  if (attemptsToday <= 0) return 0;
  if (attemptsToday === 1) return 5_000;
  if (attemptsToday === 2) return 15_000;
  return Number.MAX_SAFE_INTEGER;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read recording data."));
    reader.readAsDataURL(blob);
  });
}

const PROMPT_SELECT = "id, prompt_text, assignment_type, external_url, class_name, suggested_time, prompt_image_path, prompt_image_url, example_text, is_active, created_at, prompt_assignments!inner(class_name, is_visible)";
const SUBMISSION_SELECT =
  "id, prompt_id, response_mode, text_response, completion_marked_at, student_name, prompt_text, audio_path, audio_url, video_path, video_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, ai_strengths, ai_improvements, ai_picture_accuracy, ai_grammar_feedback, ai_score_reason, ai_model_answer, teacher_score, teacher_comment, student_code";

const DEFAULT_WELCOME_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0e7ff" />
      <stop offset="55%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#dbeafe" />
    </linearGradient>
    <linearGradient id="shape" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.12" />
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#bg)" />
  <circle cx="210" cy="140" r="180" fill="url(#shape)" />
  <circle cx="1070" cy="560" r="230" fill="url(#shape)" />
  <rect x="160" y="180" width="880" height="340" rx="40" fill="#ffffff" fill-opacity="0.85" />
  <text x="600" y="300" text-anchor="middle" fill="#0f172a" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="52" font-weight="700">Welcome to ESL Activity Hub</text>
  <text x="600" y="365" text-anchor="middle" fill="#475569" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="32">Enter your class code to begin.</text>
  <text x="600" y="430" text-anchor="middle" fill="#64748b" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="24">Your teacher will guide you from there.</text>
</svg>
`);

const ENV_STUDENT_WELCOME_IMAGE_URL = (import.meta.env.VITE_STUDENT_WELCOME_IMAGE_URL?.trim() || "") as string;
const STUDENT_WELCOME_IMAGE_SETTING_KEY = "student_welcome_image_url";
const STUDENT_FEEDBACK_PROFILE_SETTING_KEY = "student_feedback_profile";
const DEMO_IMAGE_CARD =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="demoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ecfeff" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#eef2ff" />
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#demoBg)" />
  <rect x="120" y="100" width="960" height="500" rx="34" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" />
  <circle cx="300" cy="260" r="90" fill="#a5b4fc" />
  <rect x="430" y="210" width="520" height="54" rx="20" fill="#e2e8f0" />
  <rect x="430" y="294" width="420" height="38" rx="16" fill="#e2e8f0" />
  <rect x="210" y="420" width="780" height="120" rx="28" fill="#eef2ff" />
  <text x="600" y="494" text-anchor="middle" fill="#334155" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="40" font-weight="700">Describe this picture</text>
</svg>
`);

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
    padding: "24px",
    boxSizing: "border-box" as const,
  },
  shell: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.1)",
    padding: "24px",
  },
  heroMediaFrame: {
    position: "relative" as const,
    borderRadius: "24px",
    overflow: "hidden" as const,
    border: "1px solid #e2e8f0",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
    marginBottom: "14px",
  },
  heroImage: {
    width: "100%",
    maxHeight: "250px",
    objectFit: "cover" as const,
    display: "block",
    filter: "brightness(0.9) contrast(1.04) saturate(1.02)",
  },
  heroImageOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0) 8%, rgba(15, 23, 42, 0.3) 100%)",
  },
  heroTitle: {
    textAlign: "center" as const,
    fontSize: "clamp(28px, 6vw, 36px)",
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 6px",
    lineHeight: 1.15,
  },
  heroSubtitle: {
    textAlign: "center" as const,
    fontSize: "16px",
    color: "#64748b",
    margin: "0 0 14px",
  },
  field: {
    width: "100%",
    minHeight: "68px",
    borderRadius: "18px",
    border: "1px solid #cfd8e3",
    background: "#ffffff",
    padding: "0 16px",
    boxSizing: "border-box" as const,
    fontSize: "clamp(18px, 4.8vw, 24px)",
    color: "#0f172a",
    outline: "none",
    textAlign: "center" as const,
    letterSpacing: "0.01em",
    fontWeight: 700,
    textTransform: "none" as const,
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  },
  actionButton: {
    width: "100%",
    minHeight: "70px",
    borderRadius: "20px",
    border: "1px solid #4f46e5",
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(79, 70, 229, 0.24)",
    letterSpacing: "0.01em",
    transition: "transform 120ms ease, box-shadow 120ms ease",
  },
  suggestedTimeBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "12px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.2,
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.08)",
  },
  sectionTitle: {
    textAlign: "center" as const,
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "0.04em",
    color: "#0f172a",
    margin: "22px 0 14px",
  },
  promptCard: {
    width: "100%",
    borderRadius: "24px",
    border: "1px solid #dbe3f0",
    background: "#f1f5f9",
    padding: "24px 20px",
    boxSizing: "border-box" as const,
    textAlign: "center" as const,
    fontSize: "26px",
    lineHeight: 1.45,
    fontStyle: "italic" as const,
    color: "#334155",
  },
  promptImage: {
    width: "100%",
    maxHeight: "340px",
    borderRadius: "20px",
    border: "1px solid #dbe3f0",
    objectFit: "cover" as const,
    marginBottom: "14px",
  },
  taskList: {
    marginTop: "20px",
    display: "grid",
    gap: "10px",
  },
  taskButton: {
    width: "100%",
    borderRadius: "18px",
    border: "1px solid #dbe3f0",
    background: "#ffffff",
    padding: "14px",
    textAlign: "left" as const,
    cursor: "pointer",
    display: "grid",
    gap: "6px",
  },
  taskTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
  },
  taskMeta: {
    fontSize: "13px",
    color: "#64748b",
  },
  taskStatus: {
    display: "inline-flex",
    width: "fit-content",
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 800,
  },
  taskTypeBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
  },
  backButton: {
    minHeight: "38px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
    padding: "0 12px",
    cursor: "pointer",
  },
  taskThumb: {
    width: "64px",
    height: "64px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    objectFit: "cover" as const,
  },
  micButton: {
    width: "165px",
    height: "165px",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
    color: "#ffffff",
    fontSize: "62px",
    cursor: "pointer",
    boxShadow: "0 18px 36px rgba(99, 102, 241, 0.24)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "22px auto 18px",
    flexDirection: "column" as const,
    gap: "6px",
    lineHeight: 1.1,
    padding: "12px",
    textAlign: "center" as const,
  },
  micEmoji: {
    fontSize: "48px",
  },
  micButtonLabel: {
    fontSize: "20px",
    fontWeight: 800,
  },
  recordingAlert: {
    width: "100%",
    margin: "-8px 0 14px",
    borderRadius: "18px",
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "14px 16px",
    boxSizing: "border-box" as const,
    boxShadow: "0 8px 16px rgba(79, 70, 229, 0.08)",
  },
  recordingAlertHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 900,
    fontSize: "26px",
  },
  pulseDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#6366f1",
    display: "inline-block",
  },
  recordingHelper: {
    marginTop: "6px",
    textAlign: "center" as const,
    fontSize: "17px",
    fontWeight: 700,
  },
  submitButton: {
    width: "100%",
    minHeight: "82px",
    borderRadius: "22px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "26px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.18)",
  },
  primaryButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "none",
    background: "#312e81",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
  },
  secondaryButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
  },
  textArea: {
    width: "100%",
    minHeight: "140px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "12px 14px",
    boxSizing: "border-box" as const,
    fontSize: "16px",
    color: "#334155",
    resize: "vertical" as const,
  },
  message: {
    textAlign: "center" as const,
    fontSize: "18px",
    marginTop: "18px",
  },
  helperText: {
    textAlign: "center" as const,
    fontSize: "15px",
    color: "#64748b",
    marginTop: "8px",
  },
  installHelpRow: {
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  installHelpText: {
    fontSize: "14px",
    color: "#5b21b6",
    textAlign: "center" as const,
    lineHeight: 1.4,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 600,
  },
  activityProgressWrap: {
    marginTop: "10px",
    marginBottom: "12px",
  },
  activityProgressLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#4f46e5",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
  },
  activityProgressTrack: {
    width: "100%",
    height: "6px",
    borderRadius: "999px",
    background: "#e0e7ff",
    overflow: "hidden" as const,
  },
  activityProgressFill: {
    width: "100%",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)",
  },
  installHelpLink: {
    border: "1px solid #d8b4fe",
    borderRadius: "999px",
    background: "#faf5ff",
    color: "#6d28d9",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    padding: "5px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  iosInstallPanel: {
    marginTop: "10px",
    border: "1px solid #d8b4fe",
    borderRadius: "14px",
    background: "#faf5ff",
    padding: "10px 12px",
    color: "#581c87",
    fontSize: "13px",
    lineHeight: 1.5,
    maxWidth: "420px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  iosInstallPanelTitle: {
    fontSize: "13px",
    fontWeight: 800,
    marginBottom: "4px",
  },
  card: {
    marginTop: "28px",
    borderRadius: "24px",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    padding: "22px",
  },
  feedbackCard: {
    marginTop: "28px",
    borderRadius: "24px",
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%)",
    padding: "20px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
    display: "grid",
    gap: "14px",
  },
  feedbackHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap" as const,
  },
  feedbackTitle: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a",
  },
  scoreBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 800,
    padding: "6px 12px",
  },
  feedbackPanel: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "12px 14px",
    display: "grid",
    gap: "8px",
  },
  feedbackPanelLabel: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontWeight: 800,
    color: "#64748b",
  },
  feedbackPanelText: {
    fontSize: "16px",
    lineHeight: 1.5,
    color: "#1e293b",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
  feedbackHighlight: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    borderRadius: "14px",
    padding: "12px",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#94a3b8",
    marginBottom: "14px",
  },
  infoText: {
    fontSize: "18px",
    color: "#334155",
    lineHeight: 1.45,
    marginBottom: "12px",
  },
  strong: {
    fontWeight: 800,
    color: "#0f172a",
  },
  videoPreview: {
    width: "100%",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#000000",
    marginTop: "12px",
  },
  portraitVideoPreview: {
    width: "100%",
    maxWidth: "340px",
    aspectRatio: "3 / 4",
    margin: "0 auto",
    borderRadius: "22px",
    border: "1px solid #cbd5e1",
    background: "#000000",
    overflow: "hidden" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.22)",
  },
} as const;

function chooseSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mpeg",
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return "";
}

function fileExtensionFromMime(type: string) {
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

function chooseSupportedVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function currentTeacherAudio(submission?: SubmissionRow | null) {
  if (!submission) return "";
  return submission.feedback_audio_url || submission.feedback_url || "";
}

function getAssignmentType(prompt?: PromptRow | null) {
  if (!prompt) return "audio_response" as const;
  if (prompt.assignment_type) return prompt.assignment_type;
  return "audio_response" as const;
}

function assignmentTypeLabel(type: PromptRow["assignment_type"]) {
  if (type === "video_response") return "Video response";
  if (type === "text_response") return "Text response";
  if (type === "multiple_choice") return "Quiz";
  if (type === "external_link") return "External link";
  return "Speaking / audio";
}

function normalizePictureAccuracy(
  value: SubmissionRow["ai_picture_accuracy"] | AnalyzeResponse["pictureAccuracy"] | null | undefined
): { correct: string[]; missing: string[]; incorrect: string[] } | null {
  const raw = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;

  if (!raw || typeof raw !== "object") return null;
  const readList = (input: any) =>
    Array.isArray(input)
      ? input.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)
      : [];
  const normalized = {
    correct: readList((raw as any).correct),
    missing: readList((raw as any).missing),
    incorrect: readList((raw as any).incorrect),
  };
  if (!normalized.correct.length && !normalized.missing.length && !normalized.incorrect.length) return null;
  return normalized;
}

type StudentViewProps = {
  onEntryStateChange?: (isEntryState: boolean) => void;
};

export default function StudentView({ onEntryStateChange }: StudentViewProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<BlobPart[]>([]);
  const livePreviewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [studentCode, setStudentCode] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(getIsDemoModeFromUrl());
  const [rosterStudent, setRosterStudent] = useState<StudentRosterRow | null>(null);
  const [assignedPrompts, setAssignedPrompts] = useState<PromptRow[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [submissionForActivePrompt, setSubmissionForActivePrompt] = useState<SubmissionRow | null>(null);
  const [completedPromptKeys, setCompletedPromptKeys] = useState<string[]>([]);
  const [submissionStatusIndex, setSubmissionStatusIndex] = useState<Record<string, { hasSubmission: boolean; hasFeedback: boolean }>>({});

  const [isFinding, setIsFinding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [videoStatusMessage, setVideoStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoErrorMessage, setVideoErrorMessage] = useState("");
  const [isAnalyzingDemoFeedback, setIsAnalyzingDemoFeedback] = useState(false);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingMimeType, setRecordingMimeType] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState(0);
  const [pulseVisible, setPulseVisible] = useState(true);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [videoMimeType, setVideoMimeType] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [studentWelcomeImageUrl, setStudentWelcomeImageUrl] = useState<string | null>(null);
  const [installPromptReady, setInstallPromptReady] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [showIosInstallPanel, setShowIosInstallPanel] = useState(false);
  const [isCodeFieldFocused, setIsCodeFieldFocused] = useState(false);
  const [demoSubmissionIndex, setDemoSubmissionIndex] = useState<Record<string, SubmissionRow>>({});
  const [demoConfig, setDemoConfig] = useState<DemoConfig>(DEFAULT_DEMO_CONFIG);
  const [isLoadingDemoConfig, setIsLoadingDemoConfig] = useState(false);
  const [studentFeedbackProfile, setStudentFeedbackProfile] = useState<FeedbackProfile>("student_friendly");
  const [demoAttemptsToday, setDemoAttemptsToday] = useState(0);
  const [lastDemoSubmitAt, setLastDemoSubmitAt] = useState(0);
  const deferredInstallPromptRef = useRef<any>(null);
  const recordingSecondsRef = useRef(0);
  const autoStoppedAtLimitRef = useRef(false);
  const isIosDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);
  const isAppInstalled = isStandaloneMode;

  const activePrompt = useMemo(() => {
    if (!selectedPromptId) return null;
    return assignedPrompts.find((prompt) => prompt.id === selectedPromptId) || null;
  }, [assignedPrompts, selectedPromptId]);
  const teacherAudioUrl = useMemo(() => currentTeacherAudio(submissionForActivePrompt), [submissionForActivePrompt]);
  const hasSubmittedActivePrompt = Boolean(submissionForActivePrompt);
  const activeAssignmentType = getAssignmentType(activePrompt);
  const maxAudioRecordingSeconds = isDemoMode ? DEMO_MAX_AUDIO_RECORDING_SECONDS : MAX_AUDIO_RECORDING_SECONDS;
  const isVideoAssignment = activeAssignmentType === "video_response";
  const isExternalAssignment = activeAssignmentType === "external_link";
  const isTextAssignment = activeAssignmentType === "text_response";
  const welcomeHeroImageUrl = useMemo(() => {
    return studentWelcomeImageUrl?.trim() || ENV_STUDENT_WELCOME_IMAGE_URL || DEFAULT_WELCOME_IMAGE;
  }, [studentWelcomeImageUrl]);
  const demoPrompts = useMemo(() => {
    return [...demoConfig.activities]
      .filter((activity) => activity.visible)
      .sort((a, b) => a.order - b.order)
      .map((activity) => ({
        id: activity.id,
        prompt_text: activity.title,
        assignment_type: activity.type,
        external_url: activity.externalUrl || null,
        class_name: DEMO_CLASS_NAME,
        suggested_time: activity.suggestedTime || null,
        prompt_image_path: null,
        prompt_image_url: activity.imageUrl?.trim() || (activity.id.includes("picture") ? DEMO_IMAGE_CARD : null),
        example_text: activity.prompt || activity.title,
        is_active: true,
      } satisfies PromptRow));
  }, [demoConfig.activities]);
  const activeFeedbackProfile: FeedbackProfile = isDemoMode ? demoConfig.feedbackProfile : studentFeedbackProfile;
  const feedbackSectionLabels = useMemo(() => {
    if (activeFeedbackProfile === "academic_demo") {
      return {
        strengths: "What you did well",
        picture: "Accuracy",
        grammar: "Language feedback",
        improvements: "What to improve",
        model: "Suggested model response",
      };
    }
    return {
      strengths: "What you did well",
      picture: "Picture accuracy",
      grammar: "Grammar to fix",
      improvements: activeFeedbackProfile === "student_friendly" ? "Try this next" : "What to improve",
      model: "Better example",
    };
  }, [activeFeedbackProfile]);
  const demoUnavailable = isDemoMode && !demoConfig.demoEnabled;
  const demoHeroImageUrl = demoConfig.heroImageUrl?.trim() || welcomeHeroImageUrl;

  const setModeInUrl = useCallback((mode: "student" | "demo") => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    const query = params.toString();
    window.history.pushState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const enterDemoMode = useCallback(() => {
    if (!demoConfig.demoEnabled) {
      setIsDemoMode(true);
      setModeInUrl("demo");
      setStudentCode("");
      setRosterStudent(null);
      setAssignedPrompts([]);
      setSelectedPromptId(null);
      setStatusMessage("");
      setVideoStatusMessage("");
      setErrorMessage("");
      setVideoErrorMessage("");
      return;
    }
    setIsDemoMode(true);
    setModeInUrl("demo");
    setStudentCode(DEMO_STUDENT_CODE);
    setRosterStudent({
      id: "demo-student",
      class_name: DEMO_CLASS_NAME,
      student_name: "Demo learner",
      student_code: DEMO_STUDENT_CODE,
    });
    setAssignedPrompts(demoPrompts);
    setSelectedPromptId(null);
    setCompletedPromptKeys([]);
    setSubmissionStatusIndex({});
    setSubmissionForActivePrompt(null);
    setDemoSubmissionIndex({});
    setStatusMessage("");
    setErrorMessage("");
    setVideoStatusMessage("");
    setVideoErrorMessage("");
    setTextResponse("");
  }, [demoConfig.demoEnabled, demoPrompts, setModeInUrl]);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setModeInUrl("student");
    setStudentCode("");
    setRosterStudent(null);
    setAssignedPrompts([]);
    setSelectedPromptId(null);
    setCompletedPromptKeys([]);
    setSubmissionStatusIndex({});
    setSubmissionForActivePrompt(null);
    setDemoSubmissionIndex({});
    setStatusMessage("");
    setErrorMessage("");
    setVideoStatusMessage("");
    setVideoErrorMessage("");
    setTextResponse("");
  }, [setModeInUrl]);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopVideoTracks = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    if (livePreviewVideoRef.current) {
      livePreviewVideoRef.current.srcObject = null;
    }
  }, []);

  const initializeVideoPreview = useCallback(async () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVideoErrorMessage("This browser does not support in-app video recording. Please use a newer browser.");
      return null;
    }

    try {
      if (videoStreamRef.current) {
        if (livePreviewVideoRef.current) {
          livePreviewVideoRef.current.srcObject = videoStreamRef.current;
          try {
            await livePreviewVideoRef.current.play();
          } catch {
            // Ignore autoplay errors until user interaction.
          }
        }
        return videoStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      videoStreamRef.current = stream;

      if (livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = stream;
        try {
          await livePreviewVideoRef.current.play();
        } catch {
          // Ignore autoplay errors until user interaction.
        }
      }

      setVideoErrorMessage("");
      return stream;
    } catch (error: any) {
      setVideoErrorMessage(error?.message || "Camera/microphone access failed.");
      stopVideoTracks();
      return null;
    }
  }, [stopVideoTracks]);

  useEffect(() => {
    if (!isDemoMode) return;
    if (!demoConfig.demoEnabled) {
      setRosterStudent(null);
      setAssignedPrompts([]);
      return;
    }
    setRosterStudent({
      id: "demo-student",
      class_name: DEMO_CLASS_NAME,
      student_name: "Demo learner",
      student_code: DEMO_STUDENT_CODE,
    });
    setStudentCode(DEMO_STUDENT_CODE);
    setAssignedPrompts(demoPrompts);
  }, [demoConfig.demoEnabled, demoPrompts, isDemoMode]);

  useEffect(() => {
    if (getIsDemoModeFromUrl()) {
      enterDemoMode();
    }
  }, [enterDemoMode]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEMO_USAGE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date?: string; attemptsToday?: number; lastAttemptTimestamp?: number; attempts?: number; lastSubmitAt?: number };
      const today = getTodayIsoDate();
      if (parsed.date !== today) return;
      setDemoAttemptsToday(typeof parsed.attemptsToday === "number" ? parsed.attemptsToday : typeof parsed.attempts === "number" ? parsed.attempts : 0);
      setLastDemoSubmitAt(typeof parsed.lastAttemptTimestamp === "number" ? parsed.lastAttemptTimestamp : typeof parsed.lastSubmitAt === "number" ? parsed.lastSubmitAt : 0);
    } catch {
      // ignore local storage parse errors
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadWelcomeImageSetting = async () => {
      const [welcomeSetting, demoSetting, studentFeedbackSetting] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", STUDENT_WELCOME_IMAGE_SETTING_KEY).maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", DEMO_CONFIG_SETTING_KEY).maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", STUDENT_FEEDBACK_PROFILE_SETTING_KEY).maybeSingle(),
      ]);
      if (!isMounted) return;
      const welcomeValue = (welcomeSetting.data as { value?: string | null } | null)?.value?.trim() ?? "";
      setStudentWelcomeImageUrl(welcomeValue || null);
      const demoValue = (demoSetting.data as { value?: string | null } | null)?.value ?? "";
      setDemoConfig(parseDemoConfigValue(demoValue));
      const profileRaw = (studentFeedbackSetting.data as { value?: string | null } | null)?.value?.trim();
      const nextProfile: FeedbackProfile =
        profileRaw === "student_friendly" || profileRaw === "balanced" || profileRaw === "strict" ? profileRaw : "student_friendly";
      setStudentFeedbackProfile(nextProfile);
      setIsLoadingDemoConfig(false);
    };
    setIsLoadingDemoConfig(true);
    void loadWelcomeImageSetting();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPromptRef.current = event as any;
      setInstallPromptReady(true);
    };

    const syncStandaloneMode = () => {
      const standaloneByNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const standaloneByDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
      setIsStandaloneMode(standaloneByNavigator || standaloneByDisplayMode);
    };

    const onAppInstalled = () => {
      setInstallPromptReady(false);
      setShowIosInstallPanel(false);
      syncStandaloneMode();
    };

    syncStandaloneMode();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    standaloneMedia.addEventListener("change", syncStandaloneMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneMedia.removeEventListener("change", syncStandaloneMode);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredInstallPromptRef.current) return;
    await deferredInstallPromptRef.current.prompt();
    deferredInstallPromptRef.current = null;
    setInstallPromptReady(false);
  }, []);

  const showInstallHelp = useCallback(async () => {
    if (isAppInstalled) return;
    if (isIosDevice) {
      setShowIosInstallPanel(true);
      return;
    }
    if (installPromptReady) {
      await triggerInstall();
      return;
    }
    const installMessage = "Open your browser menu and choose Install app or Add to Home Screen.";
    setStatusMessage(installMessage);
  }, [installPromptReady, isAppInstalled, isIosDevice, triggerInstall]);

  useEffect(() => {
    return () => {
      stopTracks();
      stopVideoTracks();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [stopTracks, stopVideoTracks, recordedAudioUrl, recordedVideoUrl]);

  useEffect(() => {
    if (!rosterStudent || !isVideoAssignment || recordedVideoUrl || hasSubmittedActivePrompt) {
      return;
    }
    void initializeVideoPreview();
  }, [rosterStudent, isVideoAssignment, recordedVideoUrl, hasSubmittedActivePrompt, initializeVideoPreview]);

  useEffect(() => {
    if (rosterStudent && isVideoAssignment && !hasSubmittedActivePrompt) return;
    stopVideoTracks();
    setIsRecordingVideo(false);
  }, [rosterStudent, isVideoAssignment, hasSubmittedActivePrompt, stopVideoTracks]);

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      setPulseVisible(true);
      return;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    const pulse = window.setInterval(() => {
      setPulseVisible((visible) => !visible);
    }, 550);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(pulse);
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || recordingSeconds < maxAudioRecordingSeconds) return;
    autoStoppedAtLimitRef.current = true;
    stopRecording();
  }, [isRecording, recordingSeconds, maxAudioRecordingSeconds]);

  async function fetchAssignedPrompts(classNameValue: string) {
    const className = classNameValue.trim();
    if (!className) {
      setAssignedPrompts([]);
      setSelectedPromptId(null);
      return [];
    }
    const { data, error } = await supabase
      .from("prompts")
      .select(PROMPT_SELECT)
      .eq("prompt_assignments.class_name", className)
      .eq("prompt_assignments.is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      setAssignedPrompts([]);
      setSelectedPromptId(null);
      return [];
    }

    const rows = ((data ?? []) as PromptRow[]).map((prompt) => ({
      ...prompt,
      assignment_type: getAssignmentType(prompt),
    }));

    setAssignedPrompts(rows);
    setSelectedPromptId(null);
    return rows;
  }

  async function fetchCompletedPromptKeys(codeValue: string) {
    const code = codeValue.trim();
    if (!code) {
      setCompletedPromptKeys([]);
      return;
    }
    const { data, error } = await supabase
      .from("student_submissions")
      .select("prompt_id, prompt_text")
      .eq("student_code", code);

    if (error) {
      setCompletedPromptKeys([]);
      return;
    }

    const completed = Array.from(
      new Set((data ?? []).flatMap((row: { prompt_id: string | null; prompt_text: string | null }) => {
        const keys: string[] = [];
        const promptId = row.prompt_id?.trim() || "";
        const promptText = row.prompt_text?.trim() || "";
        if (promptId) keys.push(promptId);
        if (promptText) keys.push(`text:${promptText}`);
        return keys;
      }))
    );
    setCompletedPromptKeys(completed);
  }

  async function fetchSubmissionStatuses(codeValue: string) {
    const code = codeValue.trim();
    if (!code) {
      setSubmissionStatusIndex({});
      return;
    }
    const { data, error } = await supabase
      .from("student_submissions")
      .select("prompt_id, prompt_text, feedback_audio_url, feedback_url, teacher_comment, teacher_score")
      .eq("student_code", code)
      .order("created_at", { ascending: false });
    if (error) {
      setSubmissionStatusIndex({});
      return;
    }
    const index: Record<string, { hasSubmission: boolean; hasFeedback: boolean }> = {};
    for (const row of (data ?? []) as Array<{
      prompt_id: string | null;
      prompt_text: string | null;
      feedback_audio_url: string | null;
      feedback_url: string | null;
      teacher_comment: string | null;
      teacher_score: number | null;
    }>) {
      const hasFeedback = Boolean(row.feedback_audio_url || row.feedback_url || row.teacher_comment || row.teacher_score !== null);
      const promptId = row.prompt_id?.trim();
      const promptText = row.prompt_text?.trim();
      if (promptId && !index[promptId]) index[promptId] = { hasSubmission: true, hasFeedback };
      if (promptText && !index[`text:${promptText}`]) index[`text:${promptText}`] = { hasSubmission: true, hasFeedback };
    }
    setSubmissionStatusIndex(index);
  }

  async function lookupStudent() {
    if (isDemoMode) return;
    const code = studentCode.trim();
    if (!code) {
      setErrorMessage("Enter your code first.");
      return;
    }

    setIsFinding(true);
    setErrorMessage("");
    setStatusMessage("");
    setVideoErrorMessage("");
    setVideoStatusMessage("");

    const { data: rosterData, error: rosterError } = await supabase
      .from("students")
      .select("id, class_name, student_name, student_code")
      .eq("student_code", code)
      .maybeSingle();

    setIsFinding(false);

    if (rosterError) {
      setErrorMessage(rosterError.message);
      return;
    }

    if (!rosterData) {
      setRosterStudent(null);
      setAssignedPrompts([]);
      setSelectedPromptId(null);
      setCompletedPromptKeys([]);
      setSubmissionStatusIndex({});
      setSubmissionForActivePrompt(null);
      setErrorMessage("Code not found. Please check your code or ask your teacher.");
      return;
    }

    const rosterRow = rosterData as StudentRosterRow;
    setRosterStudent(rosterRow);
    setStatusMessage(`Welcome, ${rosterRow.student_name}`);
    await fetchCompletedPromptKeys(code);
    await fetchSubmissionStatuses(code);
    await fetchAssignedPrompts(rosterRow.class_name?.trim() || "");
  }

  function saveDemoSubmission(submission: SubmissionRow) {
    const promptKey = submission.prompt_id || "";
    const promptTextKey = submission.prompt_text?.trim() ? `text:${submission.prompt_text.trim()}` : "";
    setDemoSubmissionIndex((current) => ({ ...current, [promptKey]: submission }));
    setSubmissionForActivePrompt(submission);
    setCompletedPromptKeys((current) => Array.from(new Set([...current, promptKey, ...(promptTextKey ? [promptTextKey] : [])])));
    setSubmissionStatusIndex((current) => ({
      ...current,
      ...(promptKey ? { [promptKey]: { hasSubmission: true, hasFeedback: false } } : {}),
      ...(promptTextKey ? { [promptTextKey]: { hasSubmission: true, hasFeedback: false } } : {}),
    }));
  }

  const findSubmissionForActivePrompt = useCallback(
    async (codeValue: string, promptIdValue: string, promptTextValue: string) => {
      if (isDemoMode) {
        const demoSubmission = demoSubmissionIndex[promptIdValue] || null;
        setSubmissionForActivePrompt(demoSubmission);
        return demoSubmission;
      }
      const code = codeValue.trim();
      const promptId = promptIdValue.trim();
      const promptText = promptTextValue.trim();

      if (!code || (!promptId && !promptText)) {
        setSubmissionForActivePrompt(null);
        return null;
      }

      const baseQuery = supabase
        .from("student_submissions")
        .select(SUBMISSION_SELECT)
        .eq("student_code", code)
        .order("created_at", { ascending: false })
        .limit(1);

      const query = promptId ? baseQuery.eq("prompt_id", promptId) : baseQuery.eq("prompt_text", promptText);
      const { data, error } = await query.maybeSingle();

      if (error) {
        return null;
      }

      const submission = (data as SubmissionRow | null) || null;
      setSubmissionForActivePrompt(submission);
      return submission;
    },
    [demoSubmissionIndex, isDemoMode]
  );

  useEffect(() => {
    const code = studentCode.trim();
    const promptId = activePrompt?.id?.trim() || "";
    const promptText = activePrompt?.prompt_text?.trim() || "";

    if (!code || (!promptId && !promptText)) {
      setSubmissionForActivePrompt(null);
      return;
    }

    void findSubmissionForActivePrompt(code, promptId, promptText);
  }, [studentCode, activePrompt?.id, activePrompt?.prompt_text, findSubmissionForActivePrompt]);

  useEffect(() => {
    if (submissionForActivePrompt?.response_mode === "text" && submissionForActivePrompt.text_response) {
      setTextResponse(submissionForActivePrompt.text_response);
      return;
    }
    setTextResponse("");
  }, [submissionForActivePrompt?.id, submissionForActivePrompt?.response_mode, submissionForActivePrompt?.text_response]);

  useEffect(() => {
    setShowFullTranscript(false);
  }, [submissionForActivePrompt?.id]);

  async function startRecording() {
    setErrorMessage("");
    setStatusMessage("");
    if (isRecording) return;
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("This browser does not support in-app audio recording. Please use a newer browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = chooseSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordingMimeType(recorder.mimeType || mimeType || "");

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMessage("Recording failed on this device. Please try again.");
        setIsRecording(false);
        stopTracks();
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/mp4";
        const finalDurationSeconds = Math.min(recordingSecondsRef.current, maxAudioRecordingSeconds);
        setRecordedDurationSeconds(finalDurationSeconds);

        if (!chunksRef.current.length) {
          setRecordedBlob(null);
          if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
          setRecordedAudioUrl("");
          setErrorMessage("Recording failed. Please try again.");
          setStatusMessage("");
          stopTracks();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: finalType });
        if (!blob.size) {
          setRecordedBlob(null);
          if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
          setRecordedAudioUrl("");
          setErrorMessage("This device produced an empty recording. Please try again.");
          setStatusMessage("");
          stopTracks();
          return;
        }

        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        const localUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedAudioUrl(localUrl);
        if (autoStoppedAtLimitRef.current) {
          setStatusMessage(`Recording stopped at the ${isDemoMode ? "90-second" : "5-minute"} limit.`);
        } else {
          setStatusMessage("Ready to submit");
        }
        autoStoppedAtLimitRef.current = false;
        setErrorMessage("");
        stopTracks();
      };

      recorder.start();
      autoStoppedAtLimitRef.current = false;
      setRecordedDurationSeconds(0);
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
      setIsRecording(true);
      setStatusMessage("Recording...");
    } catch (error: any) {
      setErrorMessage(error?.message || "Microphone access failed.");
      setIsRecording(false);
      stopTracks();
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "inactive") return;
    recorder.stop();
    setIsRecording(false);
  }

  function persistDemoUsage(nextAttempts: number, nextLastSubmitAt: number) {
    setDemoAttemptsToday(nextAttempts);
    setLastDemoSubmitAt(nextLastSubmitAt);
    try {
      window.localStorage.setItem(
        DEMO_USAGE_STORAGE_KEY,
        JSON.stringify({ date: getTodayIsoDate(), attemptsToday: nextAttempts, lastAttemptTimestamp: nextLastSubmitAt }),
      );
    } catch {
      // ignore storage write errors
    }
  }

  function validateDemoAttemptOrShowError(): boolean {
    const now = Date.now();
    if (demoAttemptsToday >= DEMO_MAX_ATTEMPTS_PER_DAY) {
      setErrorMessage("Demo limit reached for today. Please try again later.");
      return false;
    }
    if (lastDemoSubmitAt && now - lastDemoSubmitAt < DEMO_SERVER_HARD_FLOOR_MS) {
      setErrorMessage(`Please wait ${Math.ceil((DEMO_SERVER_HARD_FLOOR_MS - (now - lastDemoSubmitAt)) / 1000)} seconds before trying again.`);
      return false;
    }
    const requiredCooldownMs = getRequiredDemoCooldownMs(demoAttemptsToday);
    if (requiredCooldownMs > 0 && now - lastDemoSubmitAt < requiredCooldownMs) {
      const remainingMs = requiredCooldownMs - (now - lastDemoSubmitAt);
      setErrorMessage(`Please wait ${Math.ceil(remainingMs / 1000)} seconds before trying again.`);
      return false;
    }
    return true;
  }

  async function analyzeAudio(audioUrl: string, promptText: string, promptImageUrl?: string | null, transcriptText?: string): Promise<AnalyzeResponse> {
    const assignmentType = activePrompt?.assignment_type || null;
    const promptImagePath = activePrompt?.prompt_image_path || null;
    const resolvedImageUrl = promptImageUrl || activePrompt?.prompt_image_url || null;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl,
          audio_url: audioUrl,
          prompt: promptText,
          prompt_text: promptText,
          promptText,
          promptImageUrl: resolvedImageUrl,
          prompt_image_url: resolvedImageUrl,
          imageUrl: resolvedImageUrl,
          prompt_image_path: promptImagePath,
          transcriptText: transcriptText || null,
          assignmentType,
          assignment_type: assignmentType,
          activityType: assignmentType,
          activity_type: assignmentType,
          isDemoMode,
          demo: isDemoMode,
          audioDurationSeconds: recordedDurationSeconds,
          feedbackProfile: activeFeedbackProfile,
          feedback_profile: activeFeedbackProfile,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        const normalizedError = String(body.error || body.message || "").toLowerCase();
        if (response.status === 429 || normalizedError.includes("demo limit reached")) {
          return { error: DEMO_LIMIT_REACHED_MESSAGE };
        }
        return { error: body.message || body.error || "AI analysis failed." };
      }

      return (await response.json()) as AnalyzeResponse;
    } catch {
      return { error: "AI analysis failed." };
    }
  }

  async function submitRecording() {
    const code = studentCode.trim();
    const name = rosterStudent?.student_name?.trim() || "";
    const promptText = activePrompt?.prompt_text?.trim() || "";

    if (!code) {
      setErrorMessage("Enter your code first.");
      return;
    }

    if (!rosterStudent || !name) {
      setErrorMessage("Code not found. Please check your code or ask your teacher.");
      return;
    }

    if (!promptText) {
      setErrorMessage("No active assignment found.");
      return;
    }

    if (!recordedBlob) {
      setErrorMessage("Record your answer first.");
      return;
    }

    if (!recordedBlob.size) {
      setErrorMessage("The recording is empty. Please record again.");
      return;
    }

    if (recordedDurationSeconds > maxAudioRecordingSeconds) {
      setErrorMessage(isDemoMode ? "Demo recordings must be 90 seconds or shorter. Please record again." : "Recordings must be 5 minutes or shorter. Please record again.");
      return;
    }

    const existingSubmission = await findSubmissionForActivePrompt(code, activePrompt?.id ?? "", promptText);
    if (existingSubmission) {
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
      setStatusMessage("");
      setErrorMessage("You already submitted this assignment. You can view your feedback below.");
      return;
    }

    if (isDemoMode) {
      if (!validateDemoAttemptOrShowError()) return;
      if (recordedDurationSeconds > DEMO_MAX_AUDIO_RECORDING_SECONDS) {
        setErrorMessage("Demo recordings are limited to 90 seconds.");
        return;
      }
      setIsAnalyzingDemoFeedback(demoConfig.aiFeedbackEnabled);
      setErrorMessage("");
      setStatusMessage(demoConfig.aiFeedbackEnabled ? DEMO_AI_ANALYZING_MESSAGE : "");
      const now = new Date().toISOString();
      let demoScore: number | null = null;
      let demoComment = DEMO_NON_AI_MESSAGE;
      let demoTranscript: string | null = null;
      let demoStrengths: string[] | null = null;
      let demoImprovements: string[] | null = null;
      let demoPictureAccuracy: { correct?: string[]; missing?: string[]; incorrect?: string[] } | null = null;
      let demoGrammarFeedback: string[] | null = null;
      let demoScoreReason: string | null = null;
      let demoModelAnswer: string | null = null;
      if (demoConfig.aiFeedbackEnabled) {
        try {
          const dataUrl = await blobToDataUrl(recordedBlob);
          const ai = await analyzeAudio(dataUrl, promptText, activePrompt?.prompt_image_url ?? null);
          if (ai.error) {
            setErrorMessage(ai.error === DEMO_LIMIT_REACHED_MESSAGE ? DEMO_LIMIT_REACHED_MESSAGE : DEMO_AI_UNAVAILABLE_MESSAGE);
            setStatusMessage("");
            return;
          }
          demoScore = ai.score ?? null;
          demoComment = ai.comment || DEMO_AI_UNAVAILABLE_MESSAGE;
          demoTranscript = ai.transcript || null;
          demoStrengths = ai.strengths ?? null;
          demoImprovements = ai.improvements ?? null;
          demoPictureAccuracy = ai.pictureAccuracy ?? null;
          demoGrammarFeedback = ai.grammarFeedback ?? null;
          demoScoreReason = ai.scoreReason ?? null;
          demoModelAnswer = ai.modelAnswer ?? null;
        } catch (error: any) {
          setErrorMessage(DEMO_AI_UNAVAILABLE_MESSAGE);
          setStatusMessage("");
          return;
        } finally {
          setIsAnalyzingDemoFeedback(false);
        }
      } else {
        setIsAnalyzingDemoFeedback(false);
      }
      const demoSubmission: SubmissionRow = {
        id: `demo-audio-${Date.now()}`,
        prompt_id: activePrompt?.id ?? null,
        response_mode: "audio",
        text_response: null,
        completion_marked_at: null,
        student_name: name || "Demo learner",
        prompt_text: promptText,
        audio_path: null,
        audio_url: recordedAudioUrl || null,
        video_path: null,
        video_url: null,
        status: "demo_complete",
        created_at: now,
        feedback_audio_path: null,
        feedback_audio_url: null,
        feedback_status: null,
        feedback_created_at: null,
        student_email: null,
        student_auth_id: null,
        feedback_url: null,
        transcript: demoTranscript,
        ai_score: demoScore,
        ai_comment: demoComment,
        ai_strengths: demoStrengths,
        ai_improvements: demoImprovements,
        ai_picture_accuracy: demoPictureAccuracy,
        ai_grammar_feedback: demoGrammarFeedback,
        ai_score_reason: demoScoreReason,
        ai_model_answer: demoModelAnswer,
        teacher_score: null,
        teacher_comment: null,
        student_code: DEMO_STUDENT_CODE,
      };
      saveDemoSubmission(demoSubmission);
      persistDemoUsage(demoAttemptsToday + 1, Date.now());
      setStatusMessage("");
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Uploading...");

    try {
      const mimeType = recordingMimeType || recordedBlob.type || "audio/mp4";
      const ext = fileExtensionFromMime(mimeType);
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filePath = `submissions/${Date.now()}-${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-audio-oai")
        .upload(filePath, recordedBlob, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("student-audio-oai").getPublicUrl(filePath);

      setStatusMessage("Analyzing...");
      const ai = await analyzeAudio(publicUrl, promptText, activePrompt?.prompt_image_url ?? null);

      const payload = {
        student_name: name,
        student_code: code,
        prompt_id: activePrompt?.id ?? null,
        response_mode: "audio",
        prompt_text: promptText,
        audio_path: filePath,
        audio_url: publicUrl,
        status: ai.flagged ? "needs_review" : "submitted",
        transcript: ai.transcript ?? null,
        ai_score: ai.score ?? null,
        ai_comment: ai.comment ?? null,
        ai_strengths: ai.strengths ?? null,
        ai_improvements: ai.improvements ?? null,
        ai_picture_accuracy: ai.pictureAccuracy ?? null,
        ai_grammar_feedback: ai.grammarFeedback ?? null,
        ai_score_reason: ai.scoreReason ?? null,
        ai_model_answer: ai.modelAnswer ?? null,
      };

      const { data, error } = await supabase
        .from("student_submissions")
        .insert(payload)
        .select(SUBMISSION_SELECT)
        .single();

      if (error) throw error;

      const nextSubmission: SubmissionRow = data as SubmissionRow;
      setSubmissionForActivePrompt(nextSubmission);
      await fetchCompletedPromptKeys(code);
      await fetchSubmissionStatuses(code);
      setStatusMessage("Done ✅");
      setRecordedBlob(null);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl("");
    } catch (error: any) {
      setErrorMessage(error?.message || "Something broke ❌");
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startVideoRecording() {
    setVideoErrorMessage("");
    setVideoStatusMessage("");
    if (isRecordingVideo) return;

    try {
      const stream = (await initializeVideoPreview()) || videoStreamRef.current;
      if (!stream) return;

      const mimeType = chooseSupportedVideoMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      videoRecorderRef.current = recorder;
      videoChunksRef.current = [];
      setVideoMimeType(recorder.mimeType || mimeType || "");

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVideoErrorMessage("Video recording failed on this device. Please try again.");
        setIsRecordingVideo(false);
        stopVideoTracks();
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "video/webm";
        if (!videoChunksRef.current.length) {
          setRecordedVideoBlob(null);
          if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
          setRecordedVideoUrl("");
          setVideoErrorMessage("Recording failed. Please try again.");
          setVideoStatusMessage("");
          stopVideoTracks();
          return;
        }

        const blob = new Blob(videoChunksRef.current, { type: finalType });
        if (!blob.size) {
          setRecordedVideoBlob(null);
          if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
          setRecordedVideoUrl("");
          setVideoErrorMessage("This device produced an empty video. Please try again.");
          setVideoStatusMessage("");
          stopVideoTracks();
          return;
        }

        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
        const localUrl = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(localUrl);
        setVideoStatusMessage("Video ready ✅");
        setVideoErrorMessage("");
        stopVideoTracks();
      };

      recorder.start();
      setRecordedVideoBlob(null);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl("");
      setIsRecordingVideo(true);
      setVideoStatusMessage("Recording video...");
    } catch (error: any) {
      setVideoErrorMessage(error?.message || "Camera/microphone access failed.");
      setIsRecordingVideo(false);
      stopVideoTracks();
    }
  }

  function stopVideoRecording() {
    const recorder = videoRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setIsRecordingVideo(false);
  }

  function clearUnsubmittedVideo() {
    stopVideoTracks();
    videoRecorderRef.current = null;
    videoChunksRef.current = [];
    setRecordedVideoBlob(null);
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl("");
    setVideoMimeType("");
    setVideoStatusMessage("Video cleared. You can start a new recording.");
    setVideoErrorMessage("");
  }

  async function submitVideoResponse() {
    if (isDemoMode) {
      if (!validateDemoAttemptOrShowError()) return;
      if (!activePrompt?.id) {
        setVideoErrorMessage("Select an assignment first.");
        return;
      }
      const now = new Date().toISOString();
      const demoSubmission: SubmissionRow = {
        id: `demo-video-${Date.now()}`,
        prompt_id: activePrompt.id,
        response_mode: "video",
        text_response: null,
        completion_marked_at: null,
        student_name: rosterStudent?.student_name || "Demo learner",
        prompt_text: activePrompt.prompt_text || null,
        audio_path: null,
        audio_url: null,
        video_path: null,
        video_url: recordedVideoUrl || null,
        status: "demo_complete",
        created_at: now,
        feedback_audio_path: null,
        feedback_audio_url: null,
        feedback_status: null,
        feedback_created_at: null,
        student_email: null,
        student_auth_id: null,
        feedback_url: null,
        transcript: null,
        ai_score: null,
        ai_comment: null,
        teacher_score: null,
        teacher_comment: null,
        student_code: DEMO_STUDENT_CODE,
      };
      saveDemoSubmission(demoSubmission);
      persistDemoUsage(demoAttemptsToday + 1, Date.now());
      setVideoStatusMessage("Nice — your demo response is ready.");
      return;
    }
    const code = studentCode.trim();
    const name = rosterStudent?.student_name?.trim() || "";
    const promptText = activePrompt?.prompt_text?.trim() || "";
    if (!code || !name) {
      setVideoErrorMessage("Enter a valid code first.");
      return;
    }
    if (!activePrompt?.id || !promptText) {
      setVideoErrorMessage("Select an assignment first.");
      return;
    }
    if (!recordedVideoBlob || !recordedVideoBlob.size) {
      setVideoErrorMessage("Record your video response first.");
      return;
    }

    if (hasSubmittedActivePrompt) {
      setVideoErrorMessage("You already submitted this assignment.");
      return;
    }

    setIsSubmitting(true);
    setVideoErrorMessage("");
    setVideoStatusMessage("Uploading video...");

    try {
      const mimeType = videoMimeType || recordedVideoBlob.type || "video/webm";
      const ext = fileExtensionFromMime(mimeType);
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filePath = `submissions/video/${Date.now()}-${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("student-response-videos").upload(filePath, recordedVideoBlob, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("student-response-videos").getPublicUrl(filePath);

      const { data, error } = await supabase.from("student_submissions").insert({
        student_name: name,
        student_code: code,
        prompt_id: activePrompt.id,
        response_mode: "video",
        prompt_text: promptText,
        video_path: filePath,
        video_url: publicUrl,
        status: "submitted",
      }).select(SUBMISSION_SELECT).single();
      if (error) throw error;

      setSubmissionForActivePrompt((data as SubmissionRow) || null);
      await fetchCompletedPromptKeys(code);
      await fetchSubmissionStatuses(code);
      clearUnsubmittedVideo();
      setVideoStatusMessage("Video submitted ✅");
    } catch (error: any) {
      setVideoErrorMessage(error?.message || "Video upload failed.");
      setVideoStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitTextResponse() {
    const code = studentCode.trim();
    const name = rosterStudent?.student_name?.trim() || "";
    const promptText = activePrompt?.prompt_text?.trim() || "";
    const writtenResponse = textResponse.trim();
    if (!code || !name) {
      setErrorMessage("Enter a valid code first.");
      return;
    }
    if (!activePrompt?.id || !promptText) {
      setErrorMessage("Select an assignment first.");
      return;
    }
    if (!writtenResponse) {
      setErrorMessage("Write your response before submitting.");
      return;
    }
    if (hasSubmittedActivePrompt) {
      setErrorMessage("You already submitted this assignment.");
      return;
    }

    if (isDemoMode) {
      if (!validateDemoAttemptOrShowError()) return;
      if (writtenResponse.length > DEMO_MAX_TRANSCRIPT_CHARS) {
        setErrorMessage("Demo text is too long. Please keep it shorter.");
        return;
      }
      setIsAnalyzingDemoFeedback(demoConfig.aiFeedbackEnabled);
      setErrorMessage("");
      setStatusMessage(demoConfig.aiFeedbackEnabled ? DEMO_AI_ANALYZING_MESSAGE : "");
      const now = new Date().toISOString();
      let demoScore: number | null = null;
      let demoComment = DEMO_NON_AI_MESSAGE;
      let demoStrengths: string[] | null = null;
      let demoImprovements: string[] | null = null;
      let demoPictureAccuracy: { correct?: string[]; missing?: string[]; incorrect?: string[] } | null = null;
      let demoGrammarFeedback: string[] | null = null;
      let demoScoreReason: string | null = null;
      let demoModelAnswer: string | null = null;
      if (demoConfig.aiFeedbackEnabled) {
        const ai = await analyzeAudio("", promptText, activePrompt?.prompt_image_url ?? null, writtenResponse);
        if (ai.error) {
          setErrorMessage(ai.error === DEMO_LIMIT_REACHED_MESSAGE ? DEMO_LIMIT_REACHED_MESSAGE : DEMO_AI_UNAVAILABLE_MESSAGE);
          setStatusMessage("");
          setIsAnalyzingDemoFeedback(false);
          return;
        }
        demoScore = ai.score ?? null;
        demoComment = ai.comment || DEMO_AI_UNAVAILABLE_MESSAGE;
        demoStrengths = ai.strengths ?? null;
        demoImprovements = ai.improvements ?? null;
        demoPictureAccuracy = ai.pictureAccuracy ?? null;
        demoGrammarFeedback = ai.grammarFeedback ?? null;
        demoScoreReason = ai.scoreReason ?? null;
        demoModelAnswer = ai.modelAnswer ?? null;
      }
      const demoSubmission: SubmissionRow = {
        id: `demo-text-${Date.now()}`,
        prompt_id: activePrompt.id,
        response_mode: "text",
        text_response: writtenResponse,
        completion_marked_at: null,
        student_name: name || "Demo learner",
        prompt_text: promptText,
        audio_path: null,
        audio_url: null,
        video_path: null,
        video_url: null,
        status: "demo_complete",
        created_at: now,
        feedback_audio_path: null,
        feedback_audio_url: null,
        feedback_status: null,
        feedback_created_at: null,
        student_email: null,
        student_auth_id: null,
        feedback_url: null,
        transcript: writtenResponse,
        ai_score: demoScore,
        ai_comment: demoComment,
        ai_strengths: demoStrengths,
        ai_improvements: demoImprovements,
        ai_picture_accuracy: demoPictureAccuracy,
        ai_grammar_feedback: demoGrammarFeedback,
        ai_score_reason: demoScoreReason,
        ai_model_answer: demoModelAnswer,
        teacher_score: null,
        teacher_comment: null,
        student_code: DEMO_STUDENT_CODE,
      };
      saveDemoSubmission(demoSubmission);
      persistDemoUsage(demoAttemptsToday + 1, Date.now());
      setStatusMessage("");
      setIsAnalyzingDemoFeedback(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Submitting...");
    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .insert({
          student_name: name,
          student_code: code,
          prompt_id: activePrompt.id,
          response_mode: "text",
          prompt_text: promptText,
          text_response: writtenResponse,
          transcript: writtenResponse,
          status: "submitted",
        })
        .select(SUBMISSION_SELECT)
        .single();
      if (error) throw error;
      setSubmissionForActivePrompt((data as SubmissionRow) || null);
      await fetchCompletedPromptKeys(code);
      await fetchSubmissionStatuses(code);
      setStatusMessage("Text response submitted ✅");
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not submit text response.");
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markExternalActivityCompleted() {
    if (isDemoMode) {
      if (!validateDemoAttemptOrShowError()) return;
      const now = new Date().toISOString();
      const demoSubmission: SubmissionRow = {
        id: `demo-external-${Date.now()}`,
        prompt_id: activePrompt?.id ?? null,
        response_mode: "text",
        text_response: null,
        completion_marked_at: now,
        student_name: rosterStudent?.student_name || "Demo learner",
        prompt_text: activePrompt?.prompt_text || null,
        audio_path: null,
        audio_url: null,
        video_path: null,
        video_url: null,
        status: "demo_complete",
        created_at: now,
        feedback_audio_path: null,
        feedback_audio_url: null,
        feedback_status: null,
        feedback_created_at: null,
        student_email: null,
        student_auth_id: null,
        feedback_url: null,
        transcript: null,
        ai_score: null,
        ai_comment: null,
        teacher_score: null,
        teacher_comment: null,
        student_code: DEMO_STUDENT_CODE,
      };
      saveDemoSubmission(demoSubmission);
      persistDemoUsage(demoAttemptsToday + 1, Date.now());
      setStatusMessage("Nice — your demo result is ready.");
      return;
    }
    const code = studentCode.trim();
    const name = rosterStudent?.student_name?.trim() || "";
    const promptText = activePrompt?.prompt_text?.trim() || "";
    if (!code || !name) {
      setErrorMessage("Enter a valid code first.");
      return;
    }
    if (!activePrompt?.id || !promptText) {
      setErrorMessage("Select an assignment first.");
      return;
    }
    if (hasSubmittedActivePrompt) {
      setStatusMessage("Already marked as completed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Marking completed...");
    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .insert({
          student_name: name,
          student_code: code,
          prompt_id: activePrompt.id,
          response_mode: "text",
          prompt_text: promptText,
          status: "completed",
          completion_marked_at: new Date().toISOString(),
        })
        .select(SUBMISSION_SELECT)
        .single();
      if (error) throw error;
      setSubmissionForActivePrompt((data as SubmissionRow) || null);
      await fetchCompletedPromptKeys(code);
      await fetchSubmissionStatuses(code);
      setStatusMessage("Marked completed ✅");
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not mark completion.");
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  const micLabel = isRecording ? "Stop" : "Start recording";
  const primaryFeedbackScore = submissionForActivePrompt?.teacher_score ?? submissionForActivePrompt?.ai_score;
  const primaryFeedbackComment = submissionForActivePrompt?.teacher_comment || submissionForActivePrompt?.ai_comment;
  const aiStrengths = submissionForActivePrompt?.ai_strengths?.filter(Boolean) || [];
  const aiImprovements = submissionForActivePrompt?.ai_improvements?.filter(Boolean) || [];
  const aiPictureAccuracy = normalizePictureAccuracy(submissionForActivePrompt?.ai_picture_accuracy);
  const aiGrammarFeedback = submissionForActivePrompt?.ai_grammar_feedback?.filter(Boolean) || [];
  const aiScoreReason = submissionForActivePrompt?.ai_score_reason?.trim() || "";
  const aiModelAnswer = submissionForActivePrompt?.ai_model_answer?.trim() || "";
  const latestTranscript = submissionForActivePrompt?.text_response || submissionForActivePrompt?.transcript || "";
  const showAiDemoFeedback = isDemoMode && (submissionForActivePrompt?.ai_score !== null || Boolean(submissionForActivePrompt?.transcript) || Boolean(submissionForActivePrompt?.ai_comment && submissionForActivePrompt.ai_comment !== DEMO_NON_AI_MESSAGE));
  const shouldClampTranscript = latestTranscript.length > 280;
  const visibleTranscript = showFullTranscript || !shouldClampTranscript ? latestTranscript : `${latestTranscript.slice(0, 280)}...`;
  const hasVisiblePrompts = assignedPrompts.length > 0;
  const isStudentEntryState = !rosterStudent && !isDemoMode;

  useEffect(() => {
    onEntryStateChange?.(isStudentEntryState);
  }, [isStudentEntryState, onEntryStateChange]);

  function discardUnsubmittedRecording() {
    setRecordedBlob(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl("");
    setRecordingMimeType("");
    setRecordedDurationSeconds(0);
    setStatusMessage("");
    setErrorMessage("");
  }

  async function recordAgain() {
    discardUnsubmittedRecording();
    await startRecording();
  }

  return (
    <div style={styles.page} className="student-entry-page">
      <div style={{ ...styles.shell, maxWidth: isDemoMode ? "640px" : styles.shell.maxWidth }} className="student-fade-in student-entry-shell">
        {isDemoMode ? (
          <div style={{ marginBottom: "10px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Demo showcase
          </div>
        ) : null}
        {isStudentEntryState ? (
          <>
            <div style={styles.heroMediaFrame} className="student-entry-hero">
              <img src={welcomeHeroImageUrl} alt="Welcome to ESL activity hub" style={styles.heroImage} />
              <div style={styles.heroImageOverlay} />
            </div>
            <div style={styles.heroTitle} className="student-entry-title">Join your activity</div>
            <div style={styles.heroSubtitle} className="student-entry-subtitle">Enter your class code to see your assignments.</div>
            <input
              value={studentCode}
              onChange={(e) => {
                setStudentCode(e.target.value.toUpperCase());
                setRosterStudent(null);
                setAssignedPrompts([]);
                setSelectedPromptId(null);
                setCompletedPromptKeys([]);
                setSubmissionStatusIndex({});
                setSubmissionForActivePrompt(null);
                setVideoStatusMessage("");
                setVideoErrorMessage("");
              }}
              onFocus={() => setIsCodeFieldFocused(true)}
              onBlur={() => setIsCodeFieldFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void lookupStudent();
              }}
              placeholder="Enter your code (e.g. R10)"
              style={{
                ...styles.field,
                borderColor: isCodeFieldFocused ? "#4f46e5" : styles.field.border,
                boxShadow: isCodeFieldFocused ? "0 0 0 4px rgba(79, 70, 229, 0.16)" : "none",
              }}
              autoCapitalize="characters"
              className="student-entry-input"
            />

            <button type="button" onClick={() => void lookupStudent()} style={{ ...styles.actionButton, marginTop: "14px" }} className="student-primary-btn student-entry-continue">
              {isFinding ? "Checking..." : "Continue"}
            </button>
            {demoConfig.demoEnabled ? (
              <button
                type="button"
                onClick={enterDemoMode}
                style={{ ...styles.secondaryButton, width: "100%", minHeight: "44px", marginTop: "10px", fontWeight: 700 }}
              >
                Try a sample activity
              </button>
            ) : null}
            {!isAppInstalled ? (
              <>
                <div style={styles.installHelpRow}>
                  <div style={styles.installHelpText}>
                    <span aria-hidden="true">✨</span>
                    <span>Want faster access? Add ESL Hub to your phone.</span>
                  </div>
                  <button type="button" onClick={() => void showInstallHelp()} style={styles.installHelpLink}>
                    <span aria-hidden="true">{isIosDevice ? "⬆️" : "📲"}</span>
                    <span>Get the app</span>
                  </button>
                </div>
                {isIosDevice && showIosInstallPanel ? (
                  <div style={styles.iosInstallPanel}>
                    <div style={styles.iosInstallPanelTitle}>Install on iPhone</div>
                    <div>1. Tap the Share button (square with arrow).</div>
                    <div>2. Scroll down.</div>
                    <div>3. Tap &quot;Add to Home Screen&quot;.</div>
                  </div>
                ) : null}
              </>
            ) : null}
            {errorMessage ? <div style={{ ...styles.message, color: "#dc2626", fontWeight: 700 }}>{errorMessage}</div> : null}
          </>
        ) : null}

        {!rosterStudent && isDemoMode ? (
          <>
            {demoUnavailable ? (
              <div style={{ ...styles.card, maxWidth: 640, margin: "0 auto", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, textAlign: "center" }}>
                <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 8, fontSize: 32 }}>Demo temporarily unavailable</div>
                <div style={{ ...styles.helperText, marginTop: 0, marginBottom: 16 }}>Please check back later.</div>
                <button type="button" onClick={exitDemoMode} style={{ ...styles.secondaryButton, minHeight: 44 }}>
                  Go to student login
                </button>
              </div>
            ) : (
              <>
                <div style={styles.heroMediaFrame}>
                  <img src={demoHeroImageUrl} alt="Demo preview" style={styles.heroImage} />
                  <div style={styles.heroImageOverlay} />
                </div>
                <div style={styles.heroTitle}>{demoConfig.welcomeTitle}</div>
                <div style={styles.heroSubtitle}>{demoConfig.welcomeSubtitle}</div>
                <button type="button" onClick={enterDemoMode} disabled={isLoadingDemoConfig} style={{ ...styles.actionButton, marginTop: 8 }}>
                  {isLoadingDemoConfig ? "Loading..." : "View demo activities"}
                </button>
              </>
            )}
          </>
        ) : null}

        {rosterStudent && !selectedPromptId ? (
          <div style={{ ...styles.message, color: "#0f766e", fontWeight: 800 }}>
            {isDemoMode ? "Demo mode · Public preview experience" : `Welcome, ${rosterStudent.student_name}.`}
          </div>
        ) : null}

        {rosterStudent && !selectedPromptId ? <div style={{ ...styles.sectionTitle, marginTop: "12px", fontSize: "30px", letterSpacing: "0.01em" }}>{isDemoMode ? "Try ESL Hub" : "Choose an assignment"}</div> : null}
        {rosterStudent && !selectedPromptId && isDemoMode ? <div style={{ ...styles.helperText, marginTop: 0, marginBottom: 8, textAlign: "center" }}>Complete a sample activity and see how it works.</div> : null}

        {rosterStudent && !selectedPromptId ? (
          hasVisiblePrompts ? (
            <div style={{ ...styles.taskList, maxWidth: 640, margin: "0 auto", gap: 16 }}>
              {assignedPrompts.map((prompt) => {
                const promptText = prompt.prompt_text?.trim() || "";
                const assignmentType = getAssignmentType(prompt);
                const statusInfo = submissionStatusIndex[prompt.id] || (promptText ? submissionStatusIndex[`text:${promptText}`] : undefined);
                const cardStatus = statusInfo?.hasFeedback ? "Feedback ready" : statusInfo?.hasSubmission ? "Submitted" : "Not submitted";
                return (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => setSelectedPromptId(prompt.id)}
                    className="student-assignment-card"
                    style={{
                      ...styles.taskButton,
                      borderColor: isDemoMode ? "#cbd5e1" : "#dbe3f0",
                      boxShadow: isDemoMode ? "0 10px 24px rgba(15, 23, 42, 0.08)" : "0 8px 18px rgba(15, 23, 42, 0.06)",
                      background: isDemoMode ? "#ffffff" : "#ffffff",
                      borderRadius: isDemoMode ? 16 : styles.taskButton.borderRadius,
                      padding: isDemoMode ? "20px" : styles.taskButton.padding,
                    }}
                  >
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {prompt.prompt_image_url ? <img src={prompt.prompt_image_url} alt="Task thumbnail" style={styles.taskThumb} /> : null}
                      <div style={{ display: "grid", gap: "4px", flex: 1 }}>
                        <div style={styles.taskTitle}>{prompt.prompt_text || "Untitled assignment"}</div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <div style={styles.taskTypeBadge}>{assignmentTypeLabel(assignmentType)}</div>
                          <div style={styles.taskStatus}>{cardStatus}</div>
                        </div>
                        {prompt.suggested_time ? <div style={styles.taskMeta}>Suggested time: {prompt.suggested_time}</div> : null}
                        {isDemoMode ? <div style={styles.taskMeta}>{prompt.example_text || "Sample instructions"}</div> : null}
                      </div>
                      {isDemoMode ? <div style={{ ...styles.primaryButton, minHeight: 40, padding: "0 14px", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Start activity</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={styles.helperText}>{isDemoMode ? "No demo activities are available right now." : "No visible assignments are assigned to your class right now."}</div>
          )
        ) : null}

        {rosterStudent && selectedPromptId ? (
          <>
        <div style={{ marginTop: "8px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setSelectedPromptId(null)} style={styles.backButton}>
              ← Back
            </button>
            {isDemoMode ? (
              <button type="button" onClick={exitDemoMode} style={styles.backButton}>
                Exit demo
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ ...styles.sectionTitle, fontSize: "28px", marginTop: "10px", letterSpacing: "0.01em" }}>{activePrompt?.prompt_text || "Activity"}</div>
        <div style={styles.activityProgressWrap}>
          <div style={styles.activityProgressLabel}>Task 1 of 1</div>
          <div style={styles.activityProgressTrack}>
            <div style={styles.activityProgressFill} />
          </div>
        </div>

        {activePrompt?.prompt_image_url ? <img src={activePrompt.prompt_image_url} alt="Assignment image" style={styles.promptImage} /> : null}
        <div style={styles.promptCard}>
          {activePrompt?.example_text || activePrompt?.prompt_text || "Select an assignment above"}
        </div>
        {activePrompt?.suggested_time ? (
          <div style={{ textAlign: "center" }}>
            <div style={styles.suggestedTimeBadge}>Suggested time: {activePrompt.suggested_time}</div>
          </div>
        ) : null}

        {isExternalAssignment ? (
          <div style={{ ...styles.card, border: "1px solid #93c5fd", background: "#eff6ff" }}>
            <div style={{ ...styles.infoText, marginBottom: "10px" }}>This activity opens in a separate tab (Google Forms or another external tool).</div>
            <div style={{ display: "grid", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  const url = activePrompt?.external_url?.trim();
                  if (!url) {
                    setErrorMessage("This external assignment is missing a URL. Please ask your teacher.");
                    return;
                  }
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                disabled={!activePrompt?.external_url}
                style={{ ...styles.primaryButton, minHeight: "56px", width: "100%" }}
                className="student-primary-btn"
              >
                Open activity
              </button>
              <button
                type="button"
                onClick={() => void markExternalActivityCompleted()}
                disabled={isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt}
                style={{ ...styles.secondaryButton, minHeight: "50px", width: "100%" }}
              >
                {hasSubmittedActivePrompt ? "Completed" : isSubmitting ? "Saving..." : "Mark as completed"}
              </button>
            </div>
          </div>
        ) : isTextAssignment ? (
          <div style={{ ...styles.card, border: "1px solid #dbeafe", background: "#f8fafc" }}>
            <div style={{ ...styles.cardTitle, color: "#1d4ed8", marginBottom: "8px" }}>Your text response</div>
            <textarea
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              placeholder="Write your response here..."
              disabled={isSubmitting || isAnalyzingDemoFeedback || hasSubmittedActivePrompt || !rosterStudent || !activePrompt}
              style={styles.textArea}
            />
            <button
              type="button"
              onClick={() => void submitTextResponse()}
              disabled={!textResponse.trim() || isSubmitting || isAnalyzingDemoFeedback || hasSubmittedActivePrompt || !rosterStudent || !activePrompt}
              style={{ ...styles.primaryButton, minHeight: "50px", marginTop: "12px", width: "100%" }}
              className="student-primary-btn"
            >
              {isSubmitting || isAnalyzingDemoFeedback ? "Submitting..." : "Submit response"}
            </button>
          </div>
        ) : isVideoAssignment ? (
          <div style={{ ...styles.card, border: "1px solid #c7d2fe", background: "#eef2ff" }}>
            <div style={{ ...styles.cardTitle, color: "#4338ca", marginBottom: "8px" }}>
              {recordedVideoUrl ? "Recorded preview" : "Camera preview"}
            </div>
            <div style={styles.portraitVideoPreview}>
              {recordedVideoUrl ? (
                <video src={recordedVideoUrl} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", backgroundColor: "#000" }} />
              ) : (
                <video ref={livePreviewVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", backgroundColor: "#000" }} />
              )}
            </div>
            <div style={{ display: "grid", gap: "10px", marginTop: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <button type="button" onClick={() => void startVideoRecording()} disabled={isRecordingVideo || isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt} style={{ ...styles.primaryButton, minHeight: "50px" }} className="student-primary-btn">
                Start recording
              </button>
              <button type="button" onClick={stopVideoRecording} disabled={!isRecordingVideo || isSubmitting} style={{ ...styles.submitButton, minHeight: "50px", background: "#dc2626", boxShadow: "none" }}>
                Stop recording
              </button>
              <button type="button" onClick={clearUnsubmittedVideo} disabled={isRecordingVideo || isSubmitting} style={{ ...styles.secondaryButton, minHeight: "50px" }}>
                Re-record / Clear
              </button>
              <button type="button" onClick={() => void submitVideoResponse()} disabled={!recordedVideoUrl || isRecordingVideo || isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt} style={{ ...styles.primaryButton, minHeight: "50px" }} className="student-primary-btn">
                {isSubmitting ? "Submitting..." : "Submit video"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={isRecording ? stopRecording : () => void startRecording()}
            disabled={isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt}
            style={{
              ...styles.micButton,
              opacity: isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt ? 0.55 : 1,
              cursor: isSubmitting || hasSubmittedActivePrompt || !rosterStudent || !activePrompt ? "not-allowed" : "pointer",
              boxShadow: isRecording
                ? `0 0 0 10px rgba(99, 102, 241, ${pulseVisible ? 0.22 : 0.08}), 0 0 0 18px rgba(59, 130, 246, ${pulseVisible ? 0.12 : 0.05}), 0 18px 36px rgba(99, 102, 241, 0.24)`
                : styles.micButton.boxShadow,
              transition: "box-shadow 300ms ease, transform 120ms ease",
            }}
          >
            <span style={styles.micEmoji}>{isRecording ? "⏹" : "🎤"}</span>
            <span style={styles.micButtonLabel}>{micLabel}</span>
          </button>
        )}

        {isRecording ? (
          <div style={styles.recordingAlert}>
            <div style={styles.recordingAlertHeader}>
              <span style={{ ...styles.pulseDot, opacity: pulseVisible ? 1 : 0.3 }} />
              <span style={{ color: maxAudioRecordingSeconds - recordingSeconds <= 30 ? "#b45309" : "inherit" }}>
                Recording... {formatRecordingTime(recordingSeconds)} / {formatRecordingTime(maxAudioRecordingSeconds)}
              </span>
            </div>
            <div style={styles.recordingHelper}>Tap the button again to stop</div>
          </div>
        ) : null}

        {!isVideoAssignment && !isExternalAssignment && !isTextAssignment && recordedAudioUrl ? (
          <div style={{ ...styles.card, border: "2px solid #a5b4fc", background: "#eef2ff" }}>
            <div style={{ ...styles.cardTitle, color: "#3730a3", marginBottom: "10px" }}>Preview your recording</div>
            <ReliableAudioPlayer src={recordedAudioUrl} style={{ width: "100%" }} />
            <div style={{ ...styles.helperText, color: "#4338ca", marginTop: "12px" }}>Sounds good? Submit when ready.</div>
            <button
              type="button"
              onClick={() => void recordAgain()}
              disabled={isRecording || isSubmitting || hasSubmittedActivePrompt || !activePrompt}
              style={{
                ...styles.submitButton,
                minHeight: "62px",
                fontSize: "20px",
                marginTop: "14px",
                background: "#e2e8f0",
                color: "#0f172a",
                boxShadow: "none",
                border: "1px solid #cbd5e1",
                opacity: isRecording || isSubmitting || hasSubmittedActivePrompt || !activePrompt ? 0.6 : 1,
                cursor: isRecording || isSubmitting || hasSubmittedActivePrompt || !activePrompt ? "not-allowed" : "pointer",
              }}
            >
              Record again
            </button>
          </div>
        ) : null}

        {isDemoMode && isAnalyzingDemoFeedback ? (
          <div style={{ ...styles.recordingAlert, borderColor: "#7c3aed", background: "#f5f3ff", color: "#4c1d95" }}>
            <div style={{ ...styles.recordingAlertHeader, fontSize: "20px" }}>
              <span style={{ ...styles.pulseDot, opacity: pulseVisible ? 1 : 0.45, background: "#8b5cf6" }} />
              <span>{DEMO_AI_ANALYZING_MESSAGE}</span>
            </div>
            <div style={{ ...styles.recordingHelper, fontSize: "15px", fontWeight: 600, color: "#6d28d9" }}>
              Please wait while we generate instant AI feedback.
            </div>
          </div>
        ) : null}

        {hasSubmittedActivePrompt && !isAnalyzingDemoFeedback ? (
          <div style={{ ...styles.recordingAlert, borderColor: "#4f46e5", background: "#eef2ff", color: "#312e81" }}>
            <div style={{ ...styles.recordingAlertHeader, fontSize: "22px" }}>
              <span aria-hidden="true">✓</span>
              <span>{isDemoMode ? (showAiDemoFeedback ? "Nice — here’s your AI feedback." : "Nice — here’s your demo result.") : "Submission received"}</span>
            </div>
            <div style={{ ...styles.recordingHelper, fontSize: "15px", fontWeight: 600, color: "#4338ca" }}>
              {isDemoMode
                ? showAiDemoFeedback
                  ? "This is instant AI feedback on your speaking."
                  : "AI demo feedback is currently off for this demo."
                : "You can review your feedback below."}
            </div>
            {isDemoMode ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPromptId(null)}
                  style={{ ...styles.secondaryButton, minHeight: "44px" }}
                >
                  Back to demo activities
                </button>
                <button
                  type="button"
                  onClick={exitDemoMode}
                  style={{ ...styles.secondaryButton, minHeight: "44px" }}
                >
                  Go to student login
                </button>
              </div>
            ) : null}
            {isDemoMode ? (
              <div style={{ ...styles.recordingHelper, marginTop: 8, color: "#4338ca", fontSize: "14px", fontWeight: 600 }}>
                Try another sample activity when you’re ready.
              </div>
            ) : null}
          </div>
        ) : null}

        {!hasSubmittedActivePrompt && !isRecording && !isVideoAssignment && !isExternalAssignment && !isTextAssignment && recordedBlob ? (
          <div style={{ ...styles.recordingAlert, marginTop: "8px" }}>
            <div style={{ ...styles.recordingAlertHeader, fontSize: "20px" }}>Ready to submit</div>
            <div style={{ ...styles.recordingHelper, fontSize: "15px", fontWeight: 600, color: "#4f46e5" }}>Listen if you want, then submit.</div>
          </div>
        ) : null}

        {!isVideoAssignment && !isExternalAssignment && !isTextAssignment && recordedBlob ? <button
          type="button"
          onClick={() => void submitRecording()}
          disabled={!recordedBlob || isRecording || isSubmitting || isAnalyzingDemoFeedback || hasSubmittedActivePrompt || !rosterStudent || !activePrompt}
          style={{
            ...styles.submitButton,
            opacity: !recordedBlob || isRecording || isSubmitting || isAnalyzingDemoFeedback || hasSubmittedActivePrompt || !rosterStudent || !activePrompt ? 0.6 : 1,
            cursor: !recordedBlob || isRecording || isSubmitting || isAnalyzingDemoFeedback || hasSubmittedActivePrompt || !rosterStudent || !activePrompt ? "not-allowed" : "pointer",
            marginTop: "22px",
          }}
          className="student-primary-btn"
        >
          {isSubmitting || isAnalyzingDemoFeedback ? "Submitting..." : "Submit"}
        </button> : null}
        {!rosterStudent && !isDemoMode ? <div style={styles.helperText}>Enter your assigned code to start.</div> : null}
        {rosterStudent && !activePrompt ? <div style={styles.helperText}>Select an assignment above to get started.</div> : null}
        {!recordedBlob && !hasSubmittedActivePrompt && rosterStudent && activePrompt && !isVideoAssignment && !isExternalAssignment && !isTextAssignment ? <div style={styles.helperText}>Record your answer first.</div> : null}

        {statusMessage ? (
          <div style={{ ...styles.message, color: "#64748b" }}>{statusMessage}</div>
        ) : null}

        {errorMessage ? (
          <div style={{ ...styles.message, color: "#dc2626", fontWeight: 700 }}>{errorMessage}</div>
        ) : null}

        {videoStatusMessage ? <div style={{ ...styles.message, color: "#4338ca", marginTop: "10px" }}>{videoStatusMessage}</div> : null}
        {videoErrorMessage ? <div style={{ ...styles.message, color: "#dc2626", fontWeight: 700 }}>{videoErrorMessage}</div> : null}

        <div style={styles.feedbackCard}>
          {submissionForActivePrompt ? (
            <>
              <div style={styles.feedbackHeader}>
                <div style={styles.feedbackTitle}>{showAiDemoFeedback ? "AI demo feedback" : isDemoMode ? "Your demo result" : "Your feedback"}</div>
                {primaryFeedbackScore !== null && primaryFeedbackScore !== undefined ? (
                  <div style={styles.scoreBadge}>Score: {primaryFeedbackScore} / 5</div>
                ) : null}
              </div>
              {aiScoreReason ? (
                <div style={styles.feedbackPanel}>
                  <div style={styles.feedbackPanelLabel}>Score reason</div>
                  <div style={styles.feedbackPanelText}>{aiScoreReason}</div>
                </div>
              ) : null}
              {isExternalAssignment ? (
                <div style={styles.feedbackPanel}>
                  <div style={styles.feedbackPanelLabel}>Completion</div>
                  <div style={styles.feedbackPanelText}>
                    {submissionForActivePrompt.completion_marked_at
                      ? `Marked complete on ${formatDate(submissionForActivePrompt.completion_marked_at)}`
                      : "Completed"}
                  </div>
                </div>
              ) : (
                <div style={styles.feedbackPanel}>
                  <div style={styles.feedbackPanelLabel}>Transcript</div>
                  <div style={styles.feedbackPanelText}>{visibleTranscript || "—"}</div>
                  {shouldClampTranscript ? (
                    <button
                      type="button"
                      onClick={() => setShowFullTranscript((current) => !current)}
                      style={{ ...styles.secondaryButton, minHeight: "40px", width: "fit-content", fontSize: "14px" }}
                    >
                      {showFullTranscript ? "Show less" : "Show more"}
                    </button>
                  ) : null}
                </div>
              )}

              <div style={styles.feedbackPanel}>
                <div style={styles.feedbackPanelLabel}>{showAiDemoFeedback ? "AI demo feedback" : isDemoMode ? "Demo feedback" : "Feedback"}</div>
                <div style={styles.feedbackHighlight}>
                  <div style={styles.feedbackPanelText}>
                    {primaryFeedbackComment || "No written feedback yet."}
                  </div>
                </div>
                {aiStrengths.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.feedbackPanelLabel}>{feedbackSectionLabels.strengths}</div>
                    <ul style={{ margin: "8px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                      {aiStrengths.map((item, index) => (
                        <li key={`strength-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiPictureAccuracy ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.feedbackPanelLabel}>{feedbackSectionLabels.picture}</div>
                    {aiPictureAccuracy?.correct?.length ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...styles.feedbackPanelLabel, textTransform: "none", letterSpacing: "normal" }}>Correct</div>
                        <ul style={{ margin: "6px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                          {aiPictureAccuracy.correct.map((item, index) => (
                            <li key={`picture-correct-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {aiPictureAccuracy?.missing?.length ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...styles.feedbackPanelLabel, textTransform: "none", letterSpacing: "normal" }}>Missing</div>
                        <ul style={{ margin: "6px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                          {aiPictureAccuracy.missing.map((item, index) => (
                            <li key={`picture-missing-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ ...styles.feedbackPanelLabel, textTransform: "none", letterSpacing: "normal" }}>Incorrect</div>
                      {aiPictureAccuracy?.incorrect?.length ? (
                        <ul style={{ margin: "6px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                          {aiPictureAccuracy.incorrect.map((item, index) => (
                            <li key={`picture-incorrect-${index}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={styles.feedbackPanelText}>None</div>
                      )}
                    </div>
                  </div>
                ) : null}
                {aiGrammarFeedback.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.feedbackPanelLabel}>{feedbackSectionLabels.grammar}</div>
                    <ul style={{ margin: "8px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                      {aiGrammarFeedback.map((item, index) => (
                        <li key={`grammar-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiImprovements.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.feedbackPanelLabel}>{feedbackSectionLabels.improvements}</div>
                    <ul style={{ margin: "8px 0 0 18px", color: "#0f172a", lineHeight: 1.5 }}>
                      {aiImprovements.map((item, index) => (
                        <li key={`improve-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiModelAnswer ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.feedbackPanelLabel}>{feedbackSectionLabels.model}</div>
                    <div style={styles.feedbackPanelText}>{aiModelAnswer}</div>
                  </div>
                ) : null}
                {showAiDemoFeedback ? <div style={{ ...styles.feedbackPanelLabel, textTransform: "none", letterSpacing: "normal", color: "#2563eb" }}>Powered by ESL Hub AI feedback</div> : null}
              </div>

              <div style={styles.feedbackPanel}>
                <div style={styles.feedbackPanelLabel}>Teacher audio feedback</div>
                {teacherAudioUrl ? (
                  <ReliableAudioPlayer src={teacherAudioUrl} style={{ width: "100%" }} />
                ) : (
                  <div style={{ ...styles.feedbackPanelText, color: "#64748b" }}>No teacher audio feedback yet</div>
                )}
              </div>

              {submissionForActivePrompt.created_at ? (
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                  {formatDate(submissionForActivePrompt.created_at)}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={styles.feedbackHeader}>
                <div style={styles.feedbackTitle}>Your feedback</div>
              </div>
              <div style={{ ...styles.feedbackPanelText, color: "#64748b" }}>
                No submission yet. Record your answer to get feedback.
              </div>
            </>
          )}
        </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
