import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Mic,
  Square,
  Trash2,
  Download,
  User,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  MessageSquare,
  ListMusic,
  PencilLine,
  Check,
} from "lucide-react";

type Submission = {
  id: string;
  student_name: string;
  prompt_text: string;
  audio_path: string;
  audio_url: string;
  status: string;
  created_at: string;
  feedback_audio_path?: string | null;
  feedback_audio_url?: string | null;
  feedback_status?: string | null;
  feedback_created_at?: string | null;
};

type PromptRow = {
  id: string;
  prompt_title?: string | null;
  prompt_text: string;
  example_text?: string | null;
  is_active: boolean;
  prompt_color?: string | null;
  button_color?: string | null;
  card_background?: string | null;
  show_example: boolean;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderBasicRichText(text?: string | null) {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br />");
}

function safeColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}

function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`font-bold ${className}`}>{children}</h2>;
}

function AppButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className = "",
  type = "button",
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "destructive";
  className?: string;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  let styles =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

  if (variant === "default") {
    styles += " bg-slate-900 text-white hover:bg-slate-800";
  } else if (variant === "outline") {
    styles += " border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  } else if (variant === "secondary") {
    styles += " bg-slate-100 text-slate-900 hover:bg-slate-200";
  } else if (variant === "destructive") {
    styles += " bg-red-600 text-white hover:bg-red-700";
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${props.className || ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[100px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${props.className || ""}`}
    />
  );
}

function AlertBox({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "error";
}) {
  let styles = "rounded-2xl border p-4 text-sm";
  if (tone === "success") styles += " border-green-200 bg-green-50 text-green-900";
  if (tone === "error") styles += " border-red-200 bg-red-50 text-red-900";
  if (tone === "default") styles += " border-slate-200 bg-slate-50 text-slate-800";
  return <div className={styles}>{children}</div>;
}

export default function ESLAudioPromptApp() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "Student-audio";

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, [SUPABASE_URL, SUPABASE_ANON_KEY]);

  const [activeView, setActiveView] = useState<"student" | "teacher">("student");

  const [activePrompt, setActivePrompt] = useState<PromptRow | null>(null);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [promptSuccess, setPromptSuccess] = useState("");

  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [newExampleText, setNewExampleText] = useState("");
  const [newPromptColor, setNewPromptColor] = useState("#0f172a");
  const [newButtonColor, setNewButtonColor] = useState("#0f172a");
  const [newCardBackground, setNewCardBackground] = useState("#ffffff");
  const [newShowExample, setNewShowExample] = useState(true);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [permissionState, setPermissionState] = useState("idle");
  const [isStudentRecording, setIsStudentRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [statusText, setStatusText] = useState("Ready to record.");
  const [seconds, setSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [teacherAudioURL, setTeacherAudioURL] = useState("");
  const [teacherAudioBlob, setTeacherAudioBlob] = useState<Blob | null>(null);
  const [teacherStatusText, setTeacherStatusText] = useState("Ready to record feedback.");
  const [teacherSeconds, setTeacherSeconds] = useState(0);
  const [teacherPermissionState, setTeacherPermissionState] = useState("idle");
  const [isTeacherRecording, setIsTeacherRecording] = useState(false);
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);
  const [teacherSuccess, setTeacherSuccess] = useState("");

  const studentRecorderRef = useRef<MediaRecorder | null>(null);
  const studentStreamRef = useRef<MediaStream | null>(null);
  const studentChunksRef = useRef<Blob[]>([]);
  const studentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const teacherRecorderRef = useRef<MediaRecorder | null>(null);
  const teacherStreamRef = useRef<MediaStream | null>(null);
  const teacherChunksRef = useRef<Blob[]>([]);
  const teacherTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (studentTimerRef.current) clearInterval(studentTimerRef.current);
      if (teacherTimerRef.current) clearInterval(teacherTimerRef.current);

      if (audioURL) URL.revokeObjectURL(audioURL);
      if (teacherAudioURL) URL.revokeObjectURL(teacherAudioURL);

      if (studentStreamRef.current) {
        studentStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (teacherStreamRef.current) {
        teacherStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioURL, teacherAudioURL]);

  const stopStudentTimer = () => {
    if (studentTimerRef.current) {
      clearInterval(studentTimerRef.current);
      studentTimerRef.current = null;
    }
  };

  const stopTeacherTimer = () => {
    if (teacherTimerRef.current) {
      clearInterval(teacherTimerRef.current);
      teacherTimerRef.current = null;
    }
  };

  const clearStudentRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL("");
    setAudioBlob(null);
    setSubmitted(false);
    setSubmitError("");
    setStatusText("Ready to record.");
    setSeconds(0);
  };

  const clearTeacherRecording = () => {
    if (teacherAudioURL) URL.revokeObjectURL(teacherAudioURL);
    setTeacherAudioURL("");
    setTeacherAudioBlob(null);
    setTeacherError("");
    setTeacherSuccess("");
    setTeacherStatusText("Ready to record feedback.");
    setTeacherSeconds(0);
  };

  const requestStudentMic = async () => {
    try {
      setPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      studentStreamRef.current = stream;
      setPermissionState("granted");
      return stream;
    } catch (error) {
      console.error(error);
      setPermissionState("denied");
      setStatusText("Microphone access was blocked.");
      return null;
    }
  };

  const requestTeacherMic = async () => {
    try {
      setTeacherPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      teacherStreamRef.current = stream;
      setTeacherPermissionState("granted");
      return stream;
    } catch (error) {
      console.error(error);
      setTeacherPermissionState("denied");
      setTeacherStatusText("Microphone access was blocked.");
      return null;
    }
  };

  const startStudentRecording = async () => {
    setSubmitted(false);
    setSubmitError("");
    if (audioURL) clearStudentRecording();

    let stream = studentStreamRef.current;
    if (!stream || stream.getTracks().every((track) => track.readyState === "ended")) {
      stream = await requestStudentMic();
    }
    if (!stream) return;

    studentChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    studentRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        studentChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(studentChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioURL(url);
      setStatusText("Recording saved in this browser. Ready to upload.");
    };

    recorder.start();
    setIsStudentRecording(true);
    setStatusText("Recording...");
    setSeconds(0);
    studentTimerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopStudentRecording = () => {
    if (studentRecorderRef.current && isStudentRecording) {
      studentRecorderRef.current.stop();
      setIsStudentRecording(false);
      stopStudentTimer();
    }
  };

  const startTeacherRecording = async () => {
    setTeacherError("");
    setTeacherSuccess("");
    if (teacherAudioURL) clearTeacherRecording();

    let stream = teacherStreamRef.current;
    if (!stream || stream.getTracks().every((track) => track.readyState === "ended")) {
      stream = await requestTeacherMic();
    }
    if (!stream) return;

    teacherChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    teacherRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        teacherChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(teacherChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      setTeacherAudioBlob(blob);
      setTeacherAudioURL(url);
      setTeacherStatusText("Feedback recording saved. Ready to upload.");
    };

    recorder.start();
    setIsTeacherRecording(true);
    setTeacherStatusText("Recording feedback...");
    setTeacherSeconds(0);
    teacherTimerRef.current = setInterval(() => {
      setTeacherSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTeacherRecording = () => {
    if (teacherRecorderRef.current && isTeacherRecording) {
      teacherRecorderRef.current.stop();
      setIsTeacherRecording(false);
      stopTeacherTimer();
    }
  };

  const sanitizeFilePart = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "student";

  const fetchActivePrompt = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActivePrompt((data as PromptRow | null) || null);
    } catch (error) {
      console.error(error);
      setPromptError(error instanceof Error ? error.message : "Could not load active prompt.");
    }
  };

  const fetchPrompts = async () => {
    if (!supabase) return;

    setLoadingPrompts(true);
    setPromptError("");

    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrompts((data || []) as PromptRow[]);
    } catch (error) {
      console.error(error);
      setPromptError(error instanceof Error ? error.message : "Could not load prompts.");
    } finally {
      setLoadingPrompts(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!supabase) {
      setTeacherError("Supabase is not configured.");
      return;
    }

    setLoadingSubmissions(true);
    setTeacherError("");

    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as Submission[]);
      if (!selectedSubmissionId && data && data.length > 0) {
        setSelectedSubmissionId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not load submissions.";
      setTeacherError(message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    void fetchActivePrompt();
  }, []);

  useEffect(() => {
    if (activeView === "student") {
      void fetchActivePrompt();
    }
    if (activeView === "teacher") {
      void fetchSubmissions();
      void fetchPrompts();
      void fetchActivePrompt();
    }
  }, [activeView]);

  const createPrompt = async () => {
    if (!supabase) {
      setPromptError("Supabase is not configured.");
      return;
    }

    if (!newPromptText.trim()) {
      setPromptError("Prompt text is required.");
      return;
    }

    setIsSavingPrompt(true);
    setPromptError("");
    setPromptSuccess("");

    try {
      const { error } = await supabase.from("prompts").insert({
        prompt_title: newPromptTitle.trim() || null,
        prompt_text: newPromptText.trim(),
        example_text: newExampleText.trim() || null,
        is_active: false,
        prompt_color: safeColor(newPromptColor, "#0f172a"),
        button_color: safeColor(newButtonColor, "#0f172a"),
        card_background: safeColor(newCardBackground, "#ffffff"),
        show_example: newShowExample,
      });

      if (error) throw error;

      setNewPromptTitle("");
      setNewPromptText("");
      setNewExampleText("");
      setNewPromptColor("#0f172a");
      setNewButtonColor("#0f172a");
      setNewCardBackground("#ffffff");
      setNewShowExample(true);

      setPromptSuccess("Prompt created successfully.");
      await fetchPrompts();
    } catch (error) {
      console.error(error);
      setPromptError(error instanceof Error ? error.message : "Could not create prompt.");
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const activatePrompt = async (promptId: string) => {
    if (!supabase) {
      setPromptError("Supabase is not configured.");
      return;
    }

    setPromptError("");
    setPromptSuccess("");

    try {
      const { error: clearError } = await supabase
        .from("prompts")
        .update({ is_active: false })
        .eq("is_active", true);

      if (clearError) throw clearError;

      const { error: setError } = await supabase
        .from("prompts")
        .update({ is_active: true })
        .eq("id", promptId);

      if (setError) throw setError;

      setPromptSuccess("Active prompt updated.");
      await fetchPrompts();
      await fetchActivePrompt();
    } catch (error) {
      console.error(error);
      setPromptError(error instanceof Error ? error.message : "Could not activate prompt.");
    }
  };

  const submitToSupabase = async () => {
    if (!studentName.trim() || !audioBlob) return;

    if (!supabase) {
      setSubmitError("Supabase is not configured.");
      return;
    }

    if (!activePrompt) {
      setSubmitError("No active prompt found.");
      return;
    }

    setIsSubmitting(true);
    setSubmitted(false);
    setSubmitError("");
    setStatusText("Uploading recording...");

    try {
      const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `${Date.now()}-${sanitizeFilePart(studentName)}.${extension}`;
      const filePath = `submissions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: audioBlob.type || `audio/${extension}`,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("student_submissions").insert({
        student_name: studentName.trim(),
        prompt_text: activePrompt.prompt_text,
        audio_path: filePath,
        audio_url: publicData.publicUrl,
        status: "submitted",
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      setStatusText("Submission saved successfully.");
      if (activeView === "teacher") {
        void fetchSubmissions();
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Upload failed.";
      setSubmitError(message);
      setStatusText("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSubmission = submissions.find((item) => item.id === selectedSubmissionId) || null;

  const uploadTeacherFeedback = async () => {
    if (!selectedSubmission || !teacherAudioBlob) return;
    if (!supabase) {
      setTeacherError("Supabase is not configured.");
      return;
    }

    setIsUploadingFeedback(true);
    setTeacherError("");
    setTeacherSuccess("");
    setTeacherStatusText("Uploading feedback...");

    try {
      const extension = teacherAudioBlob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `${Date.now()}-${sanitizeFilePart(
        selectedSubmission.student_name
      )}-feedback.${extension}`;
      const filePath = `feedback/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, teacherAudioBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: teacherAudioBlob.type || `audio/${extension}`,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("student_submissions")
        .update({
          feedback_audio_path: filePath,
          feedback_audio_url: publicData.publicUrl,
          feedback_status: "sent",
          feedback_created_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      setTeacherSuccess(`Feedback uploaded for ${selectedSubmission.student_name}.`);
      setTeacherStatusText("Feedback saved successfully.");
      clearTeacherRecording();
      await fetchSubmissions();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Feedback upload failed.";
      setTeacherError(message);
      setTeacherStatusText("Feedback upload failed.");
    } finally {
      setIsUploadingFeedback(false);
    }
  };

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const displayedTitle = activePrompt?.prompt_title?.trim() || "Student speaking task";
  const displayedPrompt = activePrompt?.prompt_text || "No active prompt yet.";
  const displayedExample = activePrompt?.example_text || "";
  const displayedPromptColor = safeColor(activePrompt?.prompt_color, "#0f172a");
  const displayedButtonColor = safeColor(activePrompt?.button_color, "#0f172a");
  const displayedCardBackground = safeColor(activePrompt?.card_background, "#ffffff");
  const displayedShowExample = activePrompt?.show_example ?? true;

  const studentPrimaryButtonStyle: CSSProperties = {
    backgroundColor: displayedButtonColor,
    color: "#ffffff",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ESL Audio App</h1>
            <p className="text-slate-600">
              Student recording, teacher feedback, and admin prompt management.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveView("student")}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeView === "student"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Mic className="mr-2 h-4 w-4" />
              Student View
            </button>

            <button
              type="button"
              onClick={() => {
                const password = window.prompt("Enter teacher password:");
                if (password === "admin123") {
                  setActiveView("teacher");
                } else if (password !== null) {
                  window.alert("Wrong password");
                }
              }}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeView === "teacher"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ListMusic className="mr-2 h-4 w-4" />
              Teacher Dashboard
            </button>
          </div>
        </div>

        {activeView === "student" ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="space-y-3">
                <div className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm">
                  {displayedTitle}
                </div>
                <CardTitle className="text-3xl leading-tight">Student Recording Screen</CardTitle>
                <p className="text-base text-slate-600">
                  This screen uses the active prompt from the teacher dashboard.
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: displayedCardBackground }}
                >
                  <div
                    className="text-xl font-semibold"
                    style={{ color: displayedPromptColor }}
                    dangerouslySetInnerHTML={{ __html: renderBasicRichText(displayedPrompt) }}
                  />
                  {displayedShowExample && displayedExample && (
                    <div
                      className="mt-2 text-sm text-slate-500"
                      dangerouslySetInnerHTML={{ __html: renderBasicRichText(displayedExample) }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="studentName" className="text-base font-medium">
                    Student name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <TextInput
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Type your name"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    {!isStudentRecording ? (
                      <AppButton onClick={startStudentRecording} style={studentPrimaryButtonStyle}>
                        <Mic className="mr-2 h-4 w-4" />
                        Start recording
                      </AppButton>
                    ) : (
                      <AppButton onClick={stopStudentRecording} variant="destructive">
                        <Square className="mr-2 h-4 w-4" />
                        Stop recording
                      </AppButton>
                    )}

                    <div className="rounded-xl border px-4 py-2 font-mono text-lg">
                      {formatTime(seconds)}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{statusText}</p>

                  {audioURL && (
                    <div className="mt-5 space-y-4">
                      <audio controls src={audioURL} className="w-full" />
                      <div className="flex flex-wrap gap-3">
                        <AppButton
                          onClick={() => {
                            if (!audioBlob) return;
                            const a = document.createElement("a");
                            a.href = audioURL;
                            const safeName = (studentName || "student").trim().replace(/\s+/g, "_");
                            a.download = `${safeName}_response.webm`;
                            a.click();
                          }}
                          variant="secondary"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download audio
                        </AppButton>
                        <AppButton onClick={clearStudentRecording} variant="outline">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear
                        </AppButton>
                      </div>
                    </div>
                  )}
                </div>

                <AppButton
                  onClick={submitToSupabase}
                  disabled={!studentName.trim() || !audioBlob || isSubmitting || !activePrompt}
                  className="h-11 w-full"
                  style={studentPrimaryButtonStyle}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Submit response"
                  )}
                </AppButton>

                {submitted && (
                  <AlertBox tone="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Submission successful for <strong>{studentName}</strong>.
                      </span>
                    </div>
                  </AlertBox>
                )}

                {submitError && <AlertBox tone="error">{submitError}</AlertBox>}

                {permissionState === "denied" && (
                  <AlertBox tone="error">
                    Microphone access is blocked. The browser has to allow microphone access for
                    recording to work.
                  </AlertBox>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Current prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">Title</p>
                  <p className="mt-2">{displayedTitle}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">Prompt</p>
                  <div
                    className="mt-2"
                    dangerouslySetInnerHTML={{ __html: renderBasicRichText(displayedPrompt) }}
                  />
                </div>
                {displayedShowExample && displayedExample && (
                  <div className="rounded-2xl border p-4">
                    <p className="font-semibold">Example</p>
                    <div
                      className="mt-2"
                      dangerouslySetInnerHTML={{ __html: renderBasicRichText(displayedExample) }}
                    />
                  </div>
                )}
                {promptError && <AlertBox tone="error">{promptError}</AlertBox>}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1fr_1fr]">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl">Prompt manager</CardTitle>
                <p className="text-sm text-slate-600">
                  Create prompts, basic styling, and choose which one students see.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prompt title</label>
                  <TextInput
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    placeholder="Example: Morning routine"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prompt text</label>
                  <TextArea
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    placeholder={`Example:\nDescribe your morning routine.\nYou can use **bold** text.`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Example text</label>
                  <TextArea
                    value={newExampleText}
                    onChange={(e) => setNewExampleText(e.target.value)}
                    placeholder={`Example:\nI wake up at 7.\nI drink **coffee**.\nYou can also use **bold** here.`}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt text color</label>
                    <TextInput
                      value={newPromptColor}
                      onChange={(e) => setNewPromptColor(e.target.value)}
                      placeholder="#0f172a"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recording button color</label>
                    <TextInput
                      value={newButtonColor}
                      onChange={(e) => setNewButtonColor(e.target.value)}
                      placeholder="#0f172a"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt card background</label>
                    <TextInput
                      value={newCardBackground}
                      onChange={(e) => setNewCardBackground(e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newShowExample}
                    onChange={(e) => setNewShowExample(e.target.checked)}
                  />
                  Show example to students
                </label>

                <div className="rounded-2xl border p-4">
                  <p className="mb-2 font-semibold">Preview</p>
                  <div
                    className="rounded-2xl border p-4"
                    style={{ backgroundColor: safeColor(newCardBackground, "#ffffff") }}
                  >
                    <p className="text-sm text-slate-500">
                      {newPromptTitle || "Prompt title preview"}
                    </p>
                    <div
                      className="mt-2 text-base font-semibold"
                      style={{ color: safeColor(newPromptColor, "#0f172a") }}
                      dangerouslySetInnerHTML={{
                        __html: renderBasicRichText(newPromptText || "Your prompt preview appears here."),
                      }}
                    />
                    {newShowExample && newExampleText && (
                      <div
                        className="mt-2 text-sm text-slate-600"
                        dangerouslySetInnerHTML={{ __html: renderBasicRichText(newExampleText) }}
                      />
                    )}
                  </div>
                </div>

                <AppButton
                  onClick={createPrompt}
                  disabled={isSavingPrompt || !newPromptText.trim()}
                  className="w-full"
                  style={{
                    backgroundColor: safeColor(newButtonColor, "#0f172a"),
                    color: "#ffffff",
                  }}
                >
                  {isSavingPrompt ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving prompt...
                    </>
                  ) : (
                    <>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Create new prompt
                    </>
                  )}
                </AppButton>

                {promptSuccess && <AlertBox tone="success">{promptSuccess}</AlertBox>}
                {promptError && <AlertBox tone="error">{promptError}</AlertBox>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-2xl">Saved prompts</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose which prompt is active for students.
                  </p>
                </div>
                <AppButton onClick={() => void fetchPrompts()} variant="outline">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </AppButton>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPrompts ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Loading prompts...
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    No prompts yet.
                  </div>
                ) : (
                  prompts.map((promptItem) => (
                    <div key={promptItem.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {promptItem.prompt_title?.trim() || "Untitled prompt"}
                          </p>
                          <div
                            className="mt-2 text-sm"
                            dangerouslySetInnerHTML={{
                              __html: renderBasicRichText(promptItem.prompt_text),
                            }}
                          />
                          {promptItem.show_example && promptItem.example_text && (
                            <div
                              className="mt-2 text-sm text-slate-600"
                              dangerouslySetInnerHTML={{
                                __html: renderBasicRichText(promptItem.example_text),
                              }}
                            />
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            Created: {formatDate(promptItem.created_at)}
                          </p>
                        </div>
                        {promptItem.is_active ? (
                          <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                            Active
                          </span>
                        ) : (
                          <AppButton
                            onClick={() => void activatePrompt(promptItem.id)}
                            variant="outline"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Make active
                          </AppButton>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-2xl">Student submissions</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    Select a student and record your feedback.
                  </p>
                </div>
                <AppButton onClick={() => void fetchSubmissions()} variant="outline">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </AppButton>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSubmissions ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    No submissions yet.
                  </div>
                ) : (
                  submissions.map((item) => {
                    const selected = item.id === selectedSubmissionId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedSubmissionId(item.id);
                          clearTeacherRecording();
                          setTeacherSuccess("");
                          setTeacherError("");
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{item.student_name}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          <span className="rounded-full border px-2 py-1 text-xs">
                            {item.feedback_audio_url ? "Feedback sent" : "Needs feedback"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{item.prompt_text}</p>
                      </button>
                    );
                  })
                )}

                {teacherError && <AlertBox tone="error">{teacherError}</AlertBox>}

                {selectedSubmission && (
                  <div className="mt-4 space-y-6 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm text-slate-500">Student</p>
                      <p className="text-xl font-semibold">{selectedSubmission.student_name}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Submitted: {formatDate(selectedSubmission.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 font-semibold">Student audio</p>
                      <audio controls src={selectedSubmission.audio_url} className="w-full" />
                    </div>

                    {selectedSubmission.feedback_audio_url && (
                      <div>
                        <p className="mb-2 font-semibold">Current feedback audio</p>
                        <audio
                          controls
                          src={selectedSubmission.feedback_audio_url}
                          className="w-full"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Last feedback: {formatDate(selectedSubmission.feedback_created_at)}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl border p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <p className="font-semibold">Record teacher feedback</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {!isTeacherRecording ? (
                          <AppButton onClick={startTeacherRecording}>
                            <Mic className="mr-2 h-4 w-4" />
                            Start feedback recording
                          </AppButton>
                        ) : (
                          <AppButton onClick={stopTeacherRecording} variant="destructive">
                            <Square className="mr-2 h-4 w-4" />
                            Stop recording
                          </AppButton>
                        )}
                        <div className="rounded-xl border px-4 py-2 font-mono text-lg">
                          {formatTime(teacherSeconds)}
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">{teacherStatusText}</p>

                      {teacherAudioURL && (
                        <div className="mt-5 space-y-4">
                          <audio controls src={teacherAudioURL} className="w-full" />
                          <div className="flex flex-wrap gap-3">
                            <AppButton onClick={clearTeacherRecording} variant="outline">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Clear feedback recording
                            </AppButton>
                          </div>
                        </div>
                      )}
                    </div>

                    <AppButton
                      onClick={uploadTeacherFeedback}
                      disabled={!teacherAudioBlob || !selectedSubmission || isUploadingFeedback}
                      className="h-11 w-full"
                    >
                      {isUploadingFeedback ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading feedback...
                        </>
                      ) : (
                        "Save feedback audio"
                      )}
                    </AppButton>

                    {teacherSuccess && (
                      <AlertBox tone="success">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{teacherSuccess}</span>
                        </div>
                      </AlertBox>
                    )}

                    {teacherPermissionState === "denied" && (
                      <AlertBox tone="error">
                        Microphone access is blocked. The browser has to allow microphone access for
                        recording feedback.
                      </AlertBox>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
