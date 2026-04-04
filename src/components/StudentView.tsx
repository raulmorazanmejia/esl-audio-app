# FILE 2 ONLY — copy this entire file

## src/components/StudentView.tsx

```tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function StudentView() {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    const loadPrompt = async () => {
      const { data } = await supabase
        .from("prompts")
        .select("*")
        .eq("is_active", true)
        .single();

      if (data) setPrompt(data.prompt_text);
    };

    loadPrompt();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div
        style={{
          padding: 30,
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: 400,
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          style={{ width: "100%", padding: 10, marginBottom: 20 }}
        />

        <h2>SPEAKING TASK</h2>
        <p>{prompt}</p>

        <button>🎤 Record</button>
        <br />
        <br />
        <button>Submit</button>
      </div>
    </div>
  );
}
```
