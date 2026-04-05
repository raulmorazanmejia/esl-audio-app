import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type PromptRow = {
  id: string;
  prompt_text: string | null;
  example_text: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type SubmissionRow = {
  id: string;
  student_name: string | null;
  prompt_text: string | null;
  audio_path: string | null;
  audio_url: string | null;
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
  teacher_score: number | null;
  teacher_comment: string | null;
  student_code: string | null;
};

const SUBMISSION_SELECT =
  "id, student_name, prompt_text, audio_path, audio_url, status, created_at, feedback_audio_path, feedback_audio_url, feedback_status, feedback_created_at, student_email, student_auth_id, feedback_url, transcript, ai_score, ai_comment, teacher_score, teacher_comment, student_code";

type DraftState = {
  score: number;
  comment: string;
  savingOverride: boolean;
  savingAudio: boolean;
  savedMessage: string;
  error: string;
  teacherBlob: Blob | null;
  teacherPreviewUrl: string;
  isRecordingTeacher: boolean;
  recordingError: string;
};

type DraftsById = Record<string, DraftState>;

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
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

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[24px] leading-none text-amber-400" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= value ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </span>
  );
}

export default function TeacherView() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSubmissionIdRef = useRef<string | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [drafts, setDrafts] = useState<DraftsById>({});

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [prompts]);

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
        if (draft.teacherPreviewUrl) {
          URL.revokeObjectURL(draft.teacherPreviewUrl);
        }
      });
    };
  }, []);

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
      .select("id, prompt_text, example_text, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setPromptError(error.message);
      return;
    }

    const rows = (data ?? []) as PromptRow[];
    setPrompts(rows);

    const active = rows.find((row) => row.is_active);
    setSelectedPromptId(active?.id ?? null);
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

  useEffect(() => {
    void fetchPrompts();
    void fetchSubmissions();
  }, [fetchPrompts, fetchSubmissions]);

  async function handleSavePrompt() {
    const text = newPrompt.trim();
    if (!text) return;

    setIsSavingPrompt(true);
    setPromptError("");

    const { error } = await supabase.from("prompts").insert({
      prompt_text: text,
      is_active: false,
    });

    if (error) {
      setPromptError(error.message);
      setIsSavingPrompt(false);
      return;
    }

    setNewPrompt("");
    setIsSavingPrompt(false);
    await fetchPrompts();
  }

  async function handleUsePrompt(promptId: string) {
    setPromptError("");

    const { error: deactivateError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deactivateError) {
      setPromptError(deactivateError.message);
      return;
    }

    const { error: activateError } = await supabase
      .from("prompts")
      .update({ is_active: true })
      .eq("id", promptId);

    if (activateError) {
      setPromptError(activateError.message);
      return;
    }

    setSelectedPromptId(promptId);
    await fetchPrompts();
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

  async function handleSaveOverride(submission: SubmissionRow) {
    const draft = drafts[submission.id];
    if (!draft) return;

    updateDraft(submission.id, {
      savingOverride: true,
      savedMessage: "",
      error: "",
    });

    const payload = {
      teacher_score: clampScore(draft.score),
      teacher_comment: draft.comment.trim(),
    };

    const { data, error } = await supabase
      .from("student_submissions")
      .update(payload)
      .eq("id", submission.id)
      .select(SUBMISSION_SELECT)
      .single();

    if (error) {
      updateDraft(submission.id, {
        savingOverride: false,
        error: error.message,
      });
      return;
    }

    setSubmissions((prev) =>
      prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row))
    );

    updateDraft(submission.id, {
      savingOverride: false,
      savedMessage: "Override saved ✅",
      error: "",
    });
  }

  async function startTeacherRecording(submissionId: string) {
    const current = activeSubmissionIdRef.current;
    if (current && current !== submissionId) {
      updateDraft(current, {
        isRecordingTeacher: false,
        recordingError: "Stopped because another recording started.",
      });
      stopRecorderAndTracks();
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
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const targetId = activeSubmissionIdRef.current || submissionId;
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        setDrafts((prev) => {
          const existing = prev[targetId];
          if (!existing) return prev;

          if (existing.teacherPreviewUrl) {
            URL.revokeObjectURL(existing.teacherPreviewUrl);
          }

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

      updateDraft(submissionId, {
        isRecordingTeacher: true,
        recordingError: "",
        savedMessage: "",
        error: "",
      });

      recorder.start();
    } catch (error: any) {
      updateDraft(submissionId, {
        isRecordingTeacher: false,
        recordingError: error?.message || "Microphone access failed.",
      });
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

      if (existing.teacherPreviewUrl) {
        URL.revokeObjectURL(existing.teacherPreviewUrl);
      }

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
      updateDraft(submission.id, {
        error: "Record teacher audio first.",
        savedMessage: "",
      });
      return;
    }

    updateDraft(submission.id, {
      savingAudio: true,
      savedMessage: "",
      error: "",
    });

    try {
      const mimeType = draft.teacherBlob.type || "audio/webm";
      const ext = getFileExtension(mimeType);
      const filePath = `${submission.id}/teacher-feedback-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-audio")
        .upload(filePath, draft.teacherBlob, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("teacher-audio").getPublicUrl(filePath);

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

      setSubmissions((prev) =>
        prev.map((row) => (row.id === submission.id ? ((data as SubmissionRow) ?? row) : row))
      );

      updateDraft(submission.id, {
        savingAudio: false,
        savedMessage: "Teacher audio saved ✅",
        error: "",
      });
    } catch (error: any) {
      updateDraft(submission.id, {
        savingAudio: false,
        error: error?.message || "Teacher audio upload failed.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex justify-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-xl font-semibold text-slate-700 shadow-sm"
          >
            Student
          </button>
          <button
            type="button"
            className="rounded-2xl bg-slate-950 px-6 py-3 text-xl font-semibold text-white shadow-sm"
          >
            Teacher
          </button>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Classroom prompts
            </div>

            <div className="mb-6 flex gap-3">
              <input
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Type a new prompt"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg text-slate-700 outline-none focus:border-indigo-300"
              />
              <button
                type="button"
                onClick={() => void handleSavePrompt()}
                disabled={isSavingPrompt}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white shadow-sm disabled:opacity-60"
              >
                {isSavingPrompt ? "Saving..." : "Save"}
              </button>
            </div>

            {promptError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {promptError}
              </div>
            ) : null}

            <div className="space-y-4">
              {sortedPrompts.map((prompt) => {
                const isActive = selectedPromptId === prompt.id || Boolean(prompt.is_active);

                return (
                  <div
                    key={prompt.id}
                    className={[
                      "rounded-[28px] border px-5 py-5 transition",
                      isActive
                        ? "border-indigo-400 bg-indigo-50 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className={isActive ? "text-2xl font-bold leading-snug text-indigo-600" : "text-2xl font-bold leading-snug text-slate-800"}>
                        {prompt.prompt_text}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleUsePrompt(prompt.id)}
                        className={[
                          "shrink-0 rounded-2xl border px-5 py-3 text-lg font-bold shadow-sm",
                          isActive
                            ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                            : "border-slate-200 bg-white text-slate-700",
                        ].join(" ")}
                      >
                        {isActive ? "✓" : "Use"}
                      </button>
                    </div>

                    {prompt.example_text ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        {prompt.example_text}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Student submissions
              </div>

              <button
                type="button"
                onClick={() => void fetchSubmissions()}
                disabled={isLoadingSubmissions}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 shadow-sm disabled:opacity-60"
              >
                {isLoadingSubmissions ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {submissionsError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submissionsError}
              </div>
            ) : null}

            <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-1">
              {submissions.map((submission) => {
                const draft = drafts[submission.id] ?? buildDraft(submission);
                const savedTeacherAudioUrl = submission.feedback_audio_url || submission.feedback_url;

                return (
                  <article key={submission.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-[40px] font-black leading-none text-slate-950">
                          {submission.student_code || submission.student_name || "No code"}
                        </div>
                        {submission.student_name && submission.student_code ? (
                          <div className="mt-2 text-lg text-slate-500">{submission.student_name}</div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={submission.status || "unknown"} />
                        <StatusPill label={submission.feedback_status || "no feedback audio"} />
                      </div>
                    </div>

                    <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg italic text-slate-700">
                      “{submission.prompt_text || "No prompt saved"}”
                    </div>

                    <div className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
                      Student recording
                    </div>

                    {submission.audio_url ? (
                      <audio controls src={submission.audio_url} className="mb-6 w-full" />
                    ) : (
                      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500">
                        No student audio found.
                      </div>
                    )}

                    <div className="mb-6 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
                          AI feedback
                        </div>
                        <div className="space-y-3 text-lg text-slate-700">
                          <div>
                            <span className="font-bold text-slate-800">Transcript:</span>{" "}
                            {submission.transcript || "Pending"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Score:</span>{" "}
                            {submission.ai_score ?? "Pending"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Comment:</span>{" "}
                            {submission.ai_comment || "Pending"}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
                          Submission info
                        </div>
                        <div className="space-y-3 text-lg text-slate-700">
                          <div>
                            <span className="font-bold text-slate-800">Date:</span>{" "}
                            {formatDate(submission.created_at) || "Unknown"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Student email:</span>{" "}
                            {submission.student_email || "—"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Feedback created:</span>{" "}
                            {submission.feedback_created_at ? formatDate(submission.feedback_created_at) : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
                        Override score and comment
                      </div>

                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="text-lg font-bold text-slate-800">Teacher score: {draft.score}/5</label>
                        <StarRow value={draft.score} />
                      </div>

                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={draft.score}
                        onChange={(e) =>
                          updateDraft(submission.id, {
                            score: clampScore(Number(e.target.value)),
                            savedMessage: "",
                            error: "",
                          })
                        }
                        className="mb-5 w-full"
                      />

                      <textarea
                        value={draft.comment}
                        onChange={(e) =>
                          updateDraft(submission.id, {
                            comment: e.target.value,
                            savedMessage: "",
                            error: "",
                          })
                        }
                        rows={4}
                        placeholder="Write or edit the teacher feedback here"
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-800 outline-none focus:border-indigo-300"
                      />

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-sm">
                          {draft.error ? (
                            <span className="text-red-600">{draft.error}</span>
                          ) : draft.savedMessage ? (
                            <span className="text-emerald-600">{draft.savedMessage}</span>
                          ) : (
                            <span className="text-slate-400">Save only if you want to override the AI.</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleSaveOverride(submission)}
                          disabled={draft.savingOverride}
                          className="rounded-2xl bg-slate-950 px-5 py-3 text-lg font-bold text-white shadow-sm disabled:opacity-60"
                        >
                          {draft.savingOverride ? "Saving..." : "Save override"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
                        Teacher audio feedback
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3">
                        {!draft.isRecordingTeacher ? (
                          <button
                            type="button"
                            onClick={() => void startTeacherRecording(submission.id)}
                            className="rounded-2xl bg-indigo-600 px-5 py-3 text-base font-bold text-white shadow-sm"
                          >
                            Start recording
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => stopTeacherRecording(submission.id)}
                            className="rounded-2xl bg-rose-600 px-5 py-3 text-base font-bold text-white shadow-sm"
                          >
                            Stop recording
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void handleSaveTeacherAudio(submission)}
                          disabled={!draft.teacherBlob || draft.savingAudio || draft.isRecordingTeacher}
                          className="rounded-2xl bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {draft.savingAudio ? "Saving audio..." : "Save teacher audio"}
                        </button>

                        <button
                          type="button"
                          onClick={() => clearTeacherRecording(submission.id)}
                          disabled={!draft.teacherBlob || draft.isRecordingTeacher}
                          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>

                      {draft.isRecordingTeacher ? (
                        <div className="mb-3 text-sm font-medium text-rose-700">Recording in progress...</div>
                      ) : null}

                      {draft.recordingError ? (
                        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {draft.recordingError}
                        </div>
                      ) : null}

                      {draft.teacherPreviewUrl ? (
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 text-sm font-semibold text-slate-600">Preview new teacher audio</div>
                          <audio controls src={draft.teacherPreviewUrl} className="w-full" />
                        </div>
                      ) : null}

                      {savedTeacherAudioUrl ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 text-sm font-semibold text-slate-600">Saved teacher audio</div>
                          <audio controls src={savedTeacherAudioUrl} className="w-full" />
                        </div>
                      ) : (
                        !draft.teacherPreviewUrl && <div className="italic text-slate-400">No saved teacher audio yet</div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
