# FILE 1 ONLY — copy this entire file

## src/components/TeacherDashboard.tsx

```tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  student_name: string;
  audio_url: string;
  prompt_text: string;
  transcript?: string | null;
  ai_score?: number | null;
  ai_comment?: string | null;
  feedback_audio_url?: string | null;
  created_at: string;
};

type PromptRow = {
  id: string;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
};

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [newPrompt, setNewPrompt] = useState("");

  const loadData = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("student_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("prompts").select("*").order("created_at", { ascending: false }),
    ]);

    setSubmissions(s || []);
    setPrompts(p || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createPrompt = async () => {
    if (!newPrompt.trim()) return;

    await supabase.from("prompts").insert({
      prompt_text: newPrompt.trim(),
      is_active: prompts.length === 0,
    });

    setNewPrompt("");
    loadData();
  };

  const activatePrompt = async (id: string) => {
    await supabase.from("prompts").update({ is_active: false }).neq("id", "");
    await supabase.from("prompts").update({ is_active: true }).eq("id", id);
    loadData();
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>CLASSROOM PROMPTS</h2>

      <input
        value={newPrompt}
        onChange={(e) => setNewPrompt(e.target.value)}
        placeholder="New prompt"
      />
      <button onClick={createPrompt}>Save</button>

      {prompts.map((p) => (
        <div key={p.id}>
          {p.prompt_text} {p.is_active && "(ACTIVE)"}
          {!p.is_active && <button onClick={() => activatePrompt(p.id)}>Use</button>}
        </div>
      ))}

      <h2>SUBMISSIONS</h2>

      {submissions.map((s) => (
        <div key={s.id}>
          <strong>{s.student_name}</strong>
          <div>{s.prompt_text}</div>
          <audio controls src={s.audio_url} />
          <div>{s.transcript}</div>
          <div>{s.ai_score}</div>
          <div>{s.ai_comment}</div>
        </div>
      ))}
    </div>
  );
}
```
