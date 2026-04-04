import { useEffect, useRef, useState } from "react";

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">

        {/* Name Input */}
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 text-center text-gray-700"
        />

        {/* Title */}
        <h1 className="text-center text-xl font-semibold text-gray-800">
          SPEAKING TASK
        </h1>

        {/* Prompt */}
        <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-600 italic">
          "Describe your work skills in 1 minute"
        </div>

        {/* Mic Button */}
        <div className="flex justify-center">
          {!recording ? (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-blue-500 text-white text-2xl shadow-lg hover:bg-blue-600"
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 text-white text-xl shadow-lg"
            >
              Stop
            </button>
          )}
        </div>

        {/* Audio Preview */}
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full" />
        )}

        {/* Submit */}
        <button
          onClick={submit}
          className="w-full bg-gray-800 text-white py-2 rounded-xl hover:bg-gray-900"
        >
          Submit
        </button>

        {/* Status */}
        {status && (
          <div className="text-center text-sm text-gray-500">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
