import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Square, Trash2, Download, User, CheckCircle2, Loader2 } from "lucide-react";

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

  const [studentName, setStudentName] = useState("");
  const [permissionState, setPermissionState] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [statusText, setStatusText] = useState("Ready to record.");
  const [seconds, setSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioURL]);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const requestMic = async () => {
    try {
      setPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState("granted");
      return stream;
    } catch (error) {
      console.error(error);
      setPermissionState("denied");
      setStatusText("Microphone access was blocked.");
      return null;
    }
  };

  const startRecording = async () => {
    setSubmitted(false);
    setSubmitError("");

    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL("");
      setAudioBlob(null);
    }

    let stream = streamRef.current;
    if (!stream) {
      stream = await requestMic();
    }
    if (!stream) return;

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioURL(url);
      setStatusText("Recording saved in this browser. Ready to upload.");
    };

    recorder.start();
    setIsRecording(true);
    setStatusText("Recording...");
    startTimer();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const clearRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL("");
    setAudioBlob(null);
    setSubmitted(false);
    setSubmitError("");
    setStatusText("Ready to record.");
    setSeconds(0);
  };

  const sanitizeFilePart = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "student";

  const submitToSupabase = async () => {
    if (!studentName.trim() || !audioBlob) return;

    if (!supabase) {
      setSubmitError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before deploying."
      );
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

      const { data: publicData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

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
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Upload failed.";
      setSubmitError(message);
      setStatusText("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadRecording = () => {
    if (!audioBlob) return;
    const a = document.createElement("a");
    a.href = audioURL;
    const safeName = (studentName || "student").trim().replace(/\s+/g, "_");
    a.download = `${safeName}_texas_response.webm`;
    a.click();
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
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm">
              ESL speaking rehearsal app
            </div>
            <CardTitle className="text-3xl leading-tight">Student Recording Screen</CardTitle>
            <p className="text-base text-slate-600">
              This version is wired for a real backend path: it records in the browser,
              uploads audio to Supabase Storage, and saves a submission row in the database.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-xl font-semibold">{prompt}</p>
              <p className="mt-2 text-sm text-slate-500">{example}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentName" className="text-base">
                Student name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Type your name"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="rounded-2xl border p-5">
              <div className="flex flex-wrap items-center gap-3">
                {!isRecording ? (
                  <Button onClick={startRecording} className="rounded-xl">
                    <Mic className="mr-2 h-4 w-4" />
                    Start recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="rounded-xl">
                    <Square className="mr-2 h-4 w-4" />
                    Stop recording
                  </Button>
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
                    <Button onClick={downloadRecording} variant="secondary" className="rounded-xl">
                      <Download className="mr-2 h-4 w-4" />
                      Download audio
                    </Button>
                    <Button onClick={clearRecording} variant="outline" className="rounded-xl">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={submitToSupabase}
              disabled={!studentName.trim() || !audioBlob || isSubmitting}
              className="h-11 rounded-xl px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit response"
              )}
            </Button>

            {submitted && (
              <Alert className="rounded-2xl border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Submission successful for <strong>{studentName}</strong>. The audio file was
                  uploaded and the record was saved to Supabase.
                </AlertDescription>
              </Alert>
            )}

            {submitError && (
              <Alert className="rounded-2xl border-red-200">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {permissionState === "denied" && (
              <Alert className="rounded-2xl border-red-200">
                <AlertDescription>
                  Microphone access is blocked. The browser has to allow microphone access for
                  recording to work.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Required setup before deployment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">1. Environment variables</p>
              <p className="mt-1">
                Set <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and optionally{" "}
                <code>NEXT_PUBLIC_SUPABASE_BUCKET</code>.
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-semibold">2. Storage bucket</p>
              <p className="mt-1">
                Create a public bucket named <code>student-audio</code> or change the bucket name
                in the env var.
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-semibold">3. Database table</p>
              <p className="mt-1">
                Create a table called <code>student_submissions</code> with columns for{" "}
                <code>student_name</code>, <code>prompt_text</code>, <code>audio_path</code>,{" "}
                <code>audio_url</code>, <code>status</code>, and <code>created_at</code>.
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-semibold">4. Public HTTPS deployment</p>
              <p className="mt-1">
                Deploy to Vercel or another HTTPS host. Browser mic access will fail on non-secure
                sites.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
