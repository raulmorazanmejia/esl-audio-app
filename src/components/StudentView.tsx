// StudentView.tsx (FULL FILE — patched with correct bucket name + stable recording)

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function StudentView() {
  const [studentName, setStudentName] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // START RECORDING
  const startRecording = async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access failed ❌");
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // SUBMIT AUDIO
  const handleSubmit = async () => {
    try {
      if (!audioURL) {
        setError("No recording found ❌");
        return;
      }

      setError(null);

      const blob = await fetch(audioURL).then((r) => r.blob());

      const fileName = `${Date.now()}-${studentName}.webm`;

      // ✅ FIXED BUCKET NAME HERE
      const { error: uploadError } = await supabase.storage
        .from("Student-audio")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from("Student-audio")
        .getPublicUrl(fileName);

      const audioUrl = data.publicUrl;

      // Save submission
      const { error: insertError } = await supabase
        .from("student_submissions")
        .insert({
          student_name: studentName,
          audio_url: audioUrl,
        });

      if (insertError) throw insertError;

      alert("Submitted ✅");
      setAudioURL(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something broke ❌");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
        <input
          className="w-full mb-4 p-3 border rounded-xl"
          placeholder="Your name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
        />

        <button
          onClick={recording ? stopRecording : startRecording}
          className="w-32 h-32 rounded-full bg-blue-500 text-white text-xl mb-4"
        >
          {recording ? "Stop" : "Record"}
        </button>

        {audioURL && (
          <audio controls src={audioURL} className="w-full mb-4" />
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-black text-white py-3 rounded-xl"
        >
          Submit
        </button>

        {error && <p className="text-red-500 mt-3">{error}</p>}
      </div>
    </div>
  );
}
