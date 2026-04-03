import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

type Prompt = {
  id: string;
  title: string;
  prompt: string;
  example: string;
  text_color: string;
  button_color: string;
  bg_color: string;
  show_example: boolean;
  is_active: boolean;
  created_at: string;
};

export default function App() {
  const [view, setView] = useState<"student" | "teacher">("student");

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);

  const [promptText, setPromptText] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [exampleText, setExampleText] = useState("");

  const [textColor, setTextColor] = useState("#000000");
  const [buttonColor, setButtonColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showExample, setShowExample] = useState(true);

  const [studentName, setStudentName] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [promptError, setPromptError] = useState("");
  const [promptSuccess, setPromptSuccess] = useState("");

  // FETCH PROMPTS
  const fetchPrompts = async () => {
    const { data } = await supabase.from("prompts").select("*").order("created_at", { ascending: false });
    setPrompts(data || []);
  };

  const fetchActivePrompt = async () => {
    const { data } = await supabase.from("prompts").select("*").eq("is_active", true).single();
    setActivePrompt(data || null);
  };

  useEffect(() => {
    fetchPrompts();
    fetchActivePrompt();
  }, []);

  // CREATE PROMPT
  const createPrompt = async () => {
    if (!promptText.trim()) {
      setPromptError("Prompt cannot be empty");
      return;
    }

    const { error } = await supabase.from("prompts").insert([
      {
        title: promptTitle || "Untitled",
        prompt: promptText,
        example: exampleText,
        text_color: textColor,
        button_color: buttonColor,
        bg_color: bgColor,
        show_example: showExample,
        is_active: false
      }
    ]);

    if (error) {
      setPromptError(error.message);
      return;
    }

    setPromptSuccess("Prompt created");
    setPromptText("");
    setExampleText("");
    setPromptTitle("");
    fetchPrompts();
  };

  // FIXED ACTIVATE PROMPT
  const activatePrompt = async (promptId: string) => {
    setPromptError("");
    setPromptSuccess("");

    try {
      await supabase.from("prompts").update({ is_active: false }).eq("is_active", true);
      await supabase.from("prompts").update({ is_active: true }).eq("id", promptId);

      setPromptSuccess("Activated");
      await fetchPrompts();
      await fetchActivePrompt();
    } catch (e: any) {
      setPromptError(e.message);
    }
  };

  // RECORDING
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioBlob(blob);
    };

    recorder.start();
    setMediaRecorder(recorder);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
  };

  const submitRecording = async () => {
    if (!audioBlob || !studentName) return;

    const fileName = `${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("student-audio")
      .upload(fileName, audioBlob);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { error } = await supabase.from("student_submissions").insert([
      {
        student_name: studentName,
        audio_path: fileName,
        prompt_text: activePrompt?.prompt || ""
      }
    ]);

    if (error) {
      alert(error.message);
    } else {
      alert("Submitted!");
      setAudioBlob(null);
    }
  };

  // STUDENT VIEW
  const StudentView = () => (
    <div style={{ padding: 20 }}>
      <h2>Student Recording Screen</h2>

      {activePrompt && (
        <div style={{ background: activePrompt.bg_color, padding: 15 }}>
          <h3 style={{ color: activePrompt.text_color }}>{activePrompt.title}</h3>
          <p style={{ color: activePrompt.text_color }}>{activePrompt.prompt}</p>

          {activePrompt.show_example && (
            <p style={{ color: activePrompt.text_color }}>
              Example: {activePrompt.example}
            </p>
          )}
        </div>
      )}

      <input
        placeholder="Your name"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
      />

      <div>
        <button style={{ background: buttonColor, color: "white" }} onClick={startRecording}>
          Start recording
        </button>
        <button onClick={stopRecording}>Stop</button>
      </div>

      <button onClick={submitRecording}>Submit</button>
    </div>
  );

  // TEACHER VIEW
  const TeacherView = () => (
    <div style={{ padding: 20 }}>
      <h2>Prompt manager</h2>

      <input
        placeholder="Title"
        value={promptTitle}
        onChange={(e) => setPromptTitle(e.target.value)}
      />

      <textarea
        placeholder="Prompt text"
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
      />

      <textarea
        placeholder="Example"
        value={exampleText}
        onChange={(e) => setExampleText(e.target.value)}
      />

      <input value={textColor} onChange={(e) => setTextColor(e.target.value)} />
      <input value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} />
      <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} />

      <label>
        <input
          type="checkbox"
          checked={showExample}
          onChange={(e) => setShowExample(e.target.checked)}
        />
        Show example
      </label>

      <button onClick={createPrompt}>Create prompt</button>

      <p style={{ color: "red" }}>{promptError}</p>
      <p style={{ color: "green" }}>{promptSuccess}</p>

      <h3>Saved prompts</h3>

      {prompts.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
          <strong>{p.title}</strong>
          <p>{p.prompt}</p>

          <button onClick={() => activatePrompt(p.id)}>Make active</button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h1>ESL Audio App</h1>

      <button onClick={() => setView("student")}>Student View</button>
      <button onClick={() => setView("teacher")}>Teacher Dashboard</button>

      {view === "student" ? <StudentView /> : <TeacherView />}
    </div>
  );
}
