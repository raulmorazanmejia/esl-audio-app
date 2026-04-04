import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  student_name: string;
  audio_url: string;
  prompt_text: string;
  transcript?: string;
  ai_score?: number;
  ai_comment?: string;
  created_at: string;
};

export default function TeacherDashboard() {
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("student_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setData(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h2>Teacher Dashboard</h2>

      <button onClick={loadData}>Refresh</button>

      {loading && <p>Loading...</p>}

      {data.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 10,
          }}
        >
          <p><strong>{s.student_name}</strong></p>

          <audio controls src={s.audio_url} />

          <p><strong>Prompt:</strong> {s.prompt_text}</p>

          <p><strong>Transcript:</strong> {s.transcript || "..."}</p>

          <p><strong>Score:</strong> {s.ai_score ?? "-"}</p>

          <p><strong>Comment:</strong> {s.ai_comment || "-"}</p>
        </div>
      ))}
    </div>
  );
}
