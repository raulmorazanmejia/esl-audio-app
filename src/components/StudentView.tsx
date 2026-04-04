import { useRef, useState } from "react";

export default function StudentView() {
  const [name, setName] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [status, setStatus] = useState("");

  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      chunks.current = [];
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
    setStatus("Recording...");
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setStatus("Recording complete");
  };

  const submit = async () => {
    if (!audioUrl || !name) {
      setStatus("Missing name or recording ❌");
      return;
    }

    setStatus("Submitting...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl,
          promptText: "Describe your work skills in 1 minute",
          submissionId: crypto.randomUUID(),
        }),
      });

      if (!res.ok) throw new Error();

      setStatus("Done ✅");
    } catch {
      setStatus("Something broke ❌");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6">

        {/* Name */}
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
          SPEAKING TASK
        </h1>

        {/* Prompt */}
        <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-gray-700 italic shadow-sm">
          "Describe your work skills in 1 minute"
        </div>

        {/* Mic */}
        <div className="flex justify-center">
          {!recording ? (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl shadow-lg hover:scale-105 transition"
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 text-white text-lg shadow-lg animate-pulse"
            >
              STOP
            </button>
          )}
        </div>

        {/* Audio */}
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full" />
        )}

        {/* Submit */}
        <button
          onClick={submit}
          className="w-full bg-gradient-to-r from-gray-800 to-black text-white py-3 rounded-xl font-medium hover:opacity-90 transition"
        >
          Submit
        </button>

        {/* Status */}
        {status && (
          <div className="text-sm text-gray-500 text-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
