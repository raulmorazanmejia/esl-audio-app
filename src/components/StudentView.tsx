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
    try {
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
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording...");
    } catch (err) {
      console.error("MIC ERROR:", err);
      setStatus("Mic failed ❌");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!audioBlob || !name) {
      setStatus("Missing name or recording ❌");
      return;
    }

    try {
      setStatus("Uploading...");

      const safeName = name.trim().replace(/\s+/g, "-").toLowerCase();
      const fileName = `submissions/${Date.now()}-${safeName}.webm`;

      const uploadRes = await supabase.storage
        .from("Student-audio")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadRes.error) {
        console.error("UPLOAD ERROR FULL:", JSON.stringify(uploadRes.error, null, 2));
        setStatus("Upload failed ❌");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("Student-audio")
        .getPublicUrl(fileName);

      const audioUrl = publicData.publicUrl;

      setStatus("Saving...");

      const insert = await supabase
        .from("student_submissions")
        .insert({
          student_name: name.trim(),
          prompt_text: "Describe your work skills in 1 minute",
          audio_path: fileName,
          audio_url: audioUrl,
          status: "submitted",
          student_email: null,
          student_auth_id: null,
        })
        .select()
        .single();

      if (insert.error || !insert.data) {
        console.error("INSERT ERROR FULL:", JSON.stringify(insert.error, null, 2));
        console.error("INSERT DATA:", insert.data);
        setStatus("Insert failed ❌");
        return;
      }

      setStatus("Analyzing...");

      const ai = await analyzeSubmission(
        audioUrl,
        "Describe your work skills in 1 minute"
      );

      if (!ai) {
        setStatus("AI failed ❌");
        return;
      }

      const update = await supabase
        .from("student_submissions")
        .update({
          transcript: ai.transcript,
          ai_score: ai.score,
          ai_comment: ai.comment,
        })
        .eq("id", insert.data.id);

      if (update.error) {
        console.error("UPDATE ERROR FULL:", JSON.stringify(update.error, null, 2));
        setStatus("Update failed ❌");
        return;
      }

      setStatus("Done ✅");
    } catch (err) {
      console.error("UNEXPECTED ERROR FULL:", err);
      setStatus("Something broke ❌");
    }
  };

  return (
    <div>
      <h2>Student</h2>

      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br />
      <br />

      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}

      <br />
      <br />

      {audioURL && <audio controls src={audioURL} />}

      <br />
      <br />

      <button onClick={submit}>Submit</button>

      <p>{status}</p>
    </div>
  );
}
