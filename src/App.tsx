import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Mic, Square, Trash2, Download, User, CheckCircle2, Loader2 } from "lucide-react";

export default function App() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "student-audio";

  const prompt = "Say two things you like about Texas.";
  const example = 'Example: "I like the food. I like the weather."';

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }, [SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY]);

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
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, [audioURL]);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
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
    if (!stream) stream = await requestMic();
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
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
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "student";

  const submitToSupabase = async () => {
    if (!studentName.trim() || !audioBlob) return;
    if (!supabase) {
      setSubmitError("Supabase is not configured yet. Add the Vercel environment variables before deploying.");
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

      const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, audioBlob, {
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
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? error.message : "Upload failed.");
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

  const formatTime = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  return (
    <div className="app-shell">
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div className="badge">ESL speaking rehearsal app</div>
            <div className="title">Student Recording Screen</div>
            <p className="muted">This version records in the browser, uploads audio to Supabase Storage, and saves a submission row in the database.</p>
          </div>
          <div className="card-content stack">
            <div className="prompt-box">
              <p className="prompt">{prompt}</p>
              <p className="small">{example}</p>
            </div>

            <div>
              <label htmlFor="studentName" className="label">Student name</label>
              <div className="input-wrap">
                <User size={16} className="icon-left" />
                <input
                  id="studentName"
                  className="input"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Type your name"
                />
              </div>
            </div>

            <div className="section-box stack">
              <div className="row">
                {!isRecording ? (
                  <button className="btn" onClick={startRecording}>
                    <Mic size={16} /> Start recording
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopRecording}>
                    <Square size={16} /> Stop recording
                  </button>
                )}
                <div className="timer">{formatTime(seconds)}</div>
              </div>

              <div className="small">{statusText}</div>

              {audioURL && (
                <div className="stack">
                  <audio controls src={audioURL} className="audio" />
                  <div className="row">
                    <button className="btn btn-secondary" onClick={downloadRecording}>
                      <Download size={16} /> Download audio
                    </button>
                    <button className="btn btn-outline" onClick={clearRecording}>
                      <Trash2 size={16} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="btn" onClick={submitToSupabase} disabled={!studentName.trim() || !audioBlob || isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="spin" /> Uploading...</> : "Submit response"}
            </button>

            {submitted && (
              <div className="alert alert-success">
                <div className="row"><CheckCircle2 size={16} /> Submission successful for <strong>{studentName}</strong>.</div>
              </div>
            )}

            {!!submitError && <div className="alert">{submitError}</div>}
            {permissionState === "denied" && <div className="alert">Microphone access is blocked. The browser has to allow microphone access for recording to work.</div>}
          </div>
        </section>

        <aside className="card">
          <div className="card-header"><div className="title" style={{fontSize: '1.6rem'}}>Deployment notes</div></div>
          <div className="card-content stack">
            <div className="info-box">
              <strong>Env vars</strong>
              <div className="small">Set <span className="code">VITE_SUPABASE_URL</span>, <span className="code">VITE_SUPABASE_PUBLISHABLE_KEY</span>, and <span className="code">VITE_SUPABASE_BUCKET</span>.</div>
            </div>
            <div className="info-box">
              <strong>Bucket</strong>
              <div className="small">Public bucket named <span className="code">student-audio</span>.</div>
            </div>
            <div className="info-box">
              <strong>Table</strong>
              <div className="small">Uses <span className="code">student_submissions</span>.</div>
            </div>
            <div className="info-box">
              <strong>HTTPS</strong>
              <div className="small">Browser mic access requires a secure site, which Vercel provides.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
