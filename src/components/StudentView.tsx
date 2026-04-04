import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { analyzeSubmission } from "../lib/analyzeSubmission";

export default function StudentView() {
  const [name, setName] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState("Ready");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioURL(url);
      setStatus("Recorded");
    };

    recorder.start();
    setRecording(true);
    setStatus("Recording...");
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!audioBlob || !name) return;

    setStatus("Uploading...");

    const fileName = `${Date.now()}-${name}.webm`;

    await supabase.storage
      .from("Student-audio")
      .upload(fileName, audioBlob);

    const { data } = supabase.storage
      .from("Student-audio")
      .getPublicUrl(fileName);

    const insert = await supabase
      .from("student_submissions")
      .insert({
        student_name: name,
        audio_url: data.publicUrl,
        prompt_text: "Speaking prompt",
      })
      .select()
      .single();

    setStatus("Analyzing...");

    const ai = await analyzeSubmission(
      data.publicUrl,
      "Speaking prompt"
    );

    await supabase
      .from("student_submissions")
      .update({
        transcript: ai.transcript,
        ai_score: ai.score,
        ai_comment: ai.comment,
      })
      .eq("id", insert.data.id);

    setStatus("Done ✅");
  };

  return (
    <div>
      <h2>Student</h2>

      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br /><br />

      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop</button>
      )}

      <br /><br />

      {audioURL && <audio controls src={audioURL} />}

      <br /><br />

      <button onClick={submit}>Submit</button>

      <p>{status}</p>
    </div>
  );
}
