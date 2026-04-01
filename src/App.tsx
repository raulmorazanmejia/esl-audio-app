import { useEffect, useMemo, useRef, useState } from "react";
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

type RecorderMode = "student" | "teacher";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "destructive";
  className?: string;
  type?: "button" | "submit";
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
    <button type={type} onClick={onClick} disabled={disabled} className={`${styles} ${className}`}>
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
  const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "student-audio";

  const prompt = "Say two things you like about Texas.";
  const example = 'Example: "I like the food. I like the weather."';

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, [SUPABASE_URL, SUPABASE_ANON_KEY]);

  const [activeView, setActiveView] = useState<"student" | "teacher">("student");

  const [studentName, setStudentName] = useState("");
  const [permissionState, setPermissionState] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecorderMode>("student");
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
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);
  const [teacherSuccess, setTeacherSuccess] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (teacherAudioURL) URL.revokeObjectURL(teacherAudioURL);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioURL, teacherAudioURL]);

  const startTimer = (mode: RecorderMode) => {
    if (mode === "student") setSeconds(0);
    if (mode === "teacher") setTeacherSeconds(0);

    timerRef.current = setInterval(() => {
      if (mode === "student") {
        setSeconds((prev) => prev + 1);
      } else {
        setTeacherSeconds((prev) => prev + 1);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const requestMic = async (mode: RecorderMode) => {
    try {
      if (mode === "student") setPermissionState("requesting");
      if (mode === "teacher") setTeacherPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (mode === "student") setPermissionState("granted");
      if (mode === "teacher") setTeacherPermissionState("granted");
      return stream;
    } catch (error) {
      console.error(error);
      if (mode === "student") {
        setPermissionState("denied");
        setStatusText("Microphone access was blocked.");
      }
      if (mode === "teacher") {
        setTeacherPermissionState("denied");
        setTeacherStatusText("Microphone access was blocked.");
      }
      return null;
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

  const startRecording = async (mode: RecorderMode) => {
    if (mode === "student") {
      setSubmitted(false);
      setSubmitError("");
      if (audioURL) clearStudentRecording();
    } else {
      setTeacherError("");
      setTeacherSuccess("");
      if (teacherAudioURL) clearTeacherRecording();
    }

    let stream = streamRef.current;
    if (!stream) {
      stream = await requestMic(mode);
    }
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    setRecordingMode(mode);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);

      if (mode === "student") {
        setAudioBlob(blob);
        setAudioURL(url);
        setStatusText("Recording saved in this browser. Ready to upload.");
      } else {
        setTeacherAudioBlob(blob);
        setTeacherAudioURL(url);
        setTeacherStatusText("Feedback recording saved. Ready to upload.");
      }
    };

    recorder.start();
    setIsRecording(true);
    if (mode === "student") setStatusText("Recording...");
    if (mode === "teacher") setTeacherStatusText("Recording feedback...");
    startTimer(mode);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const sanitizeFilePart = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "student";

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
    if (activeView === "teacher") {
      void fetchSubmissions();
    }
  }, [activeView]);

  const submitToSupabase = async () => {
    if (!studentName.trim() || !audioBlob) return;

    if (!supabase) {
      setSubmitError("Supabase is not configured.");
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
        prompt_text: prompt,
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ESL Audio App</h1>
            <p className="text-slate-600">
              Student recording plus teacher dashboard and recorded feedback.
            </p>
          </div>
          <div className="flex gap-2">
            <AppButton
              variant={activeView === "student" ? "default" : "outline"}
              onClick={() => setActiveView("student")}
            >
              <Mic className="mr-2 h-4 w-4" />
              Student View
            </AppButton>
            <AppButton
              variant={activeView === "teacher" ? "default" : "outline"}
              onClick={() => setActiveView("teacher")}
            >
              <ListMusic className="mr-2 h-4 w-4" />
              Teacher Dashboard
            </AppButton>
          </div>
        </div>

        {activeView === "student" ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="space-y-3">
                <div className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm">
                  ESL speaking rehearsal app
                </div>
                <CardTitle className="text-3xl leading-tight">Student Recording Screen</CardTitle>
                <p className="text-base text-slate-600">
                  This version records in the browser, uploads audio to Supabase Storage, and saves
                  a submission row in the database.
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xl font-semibold">{prompt}</p>
                  <p className="mt-2 text-sm text-slate-500">{example}</p>
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
                    {!isRecording || recordingMode !== "student" ? (
                      <AppButton onClick={() => startRecording("student")}>
                        <Mic className="mr-2 h-4 w-4" />
                        Start recording
                      </AppButton>
                    ) : (
                      <AppButton onClick={stopRecording} variant="destructive">
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
                            a.download = `${safeName}_texas_response.webm`;
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
                  disabled={!studentName.trim() || !audioBlob || isSubmitting}
                  className="h-11 w-full"
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
                <CardTitle className="text-2xl">Deployment notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">Env vars</p>
                  <p className="mt-1">
                    Set <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>,
                    and <code>VITE_SUPABASE_BUCKET</code>.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">Bucket</p>
                  <p className="mt-1">
                    Public bucket named <code>{SUPABASE_BUCKET}</code>.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">Table</p>
                  <p className="mt-1">
                    Uses <code>student_submissions</code>.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold">HTTPS</p>
                  <p className="mt-1">
                    Browser mic access requires a secure site, which Vercel provides.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
                            <p className="text-xs text-slate-500">{formatDate(item.created_at)}</p>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Teacher feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedSubmission ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Choose a submission from the left.
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border p-4">
                      <p className="text-sm text-slate-500">Student</p>
                      <p className="text-xl font-semibold">{selectedSubmission.student_name}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Submitted: {formatDate(selectedSubmission.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="mb-2 font-semibold">Student audio</p>
                      <audio controls src={selectedSubmission.audio_url} className="w-full" />
                    </div>

                    {selectedSubmission.feedback_audio_url && (
                      <div className="rounded-2xl border p-4">
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
                        {!isRecording || recordingMode !== "teacher" ? (
                          <AppButton onClick={() => startRecording("teacher")}>
                            <Mic className="mr-2 h-4 w-4" />
                            Start feedback recording
                          </AppButton>
                        ) : (
                          <AppButton onClick={stopRecording} variant="destructive">
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
