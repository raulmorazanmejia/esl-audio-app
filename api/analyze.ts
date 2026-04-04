import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

// 🔒 HARD LIMIT (change this)
const MAX_REQUESTS_PER_MONTH = 100;

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

export default async function handler(req: any, res: any) {
  try {
    const { audioUrl, submissionId } = req.body;

    if (!audioUrl || !submissionId) {
      return res.status(400).json({ error: "Missing data" });
    }

    // -----------------------------
    // 🔒 CHECK USAGE
    // -----------------------------
    const month = getMonthKey();

    const { data: usageRow } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("month", month)
      .single();

    let currentUsage = usageRow?.count || 0;

    if (currentUsage >= MAX_REQUESTS_PER_MONTH) {
      console.log("🚫 AI LIMIT REACHED");

      // fallback (NO AI CALL)
      await supabase
        .from("student_submissions")
        .update({
          transcript: "...",
          ai_score: 3,
          ai_comment: "AI limit reached. Basic feedback.",
        })
        .eq("id", submissionId);

      return res.status(200).json({ success: true, limited: true });
    }

    // -----------------------------
    // 🎤 DOWNLOAD AUDIO
    // -----------------------------
    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    // -----------------------------
    // 🤖 CALL OPENAI
    // -----------------------------
    const openaiRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: (() => {
          const form = new FormData();
          form.append("file", new Blob([audioBuffer]), "audio.webm");
          form.append("model", "gpt-4o-mini-transcribe");
          return form;
        })(),
      }
    );

    const transcription = await openaiRes.json();

    if (!transcription.text) {
      throw new Error("Transcription failed");
    }

    // -----------------------------
    // 🧠 SIMPLE SCORING
    // -----------------------------
    const text = transcription.text;

    const score = text.length > 20 ? 5 : 3;
    const comment =
      text.length > 20
        ? "Good response."
        : "Try to speak more.";

    // -----------------------------
    // 💾 SAVE RESULT
    // -----------------------------
    await supabase
      .from("student_submissions")
      .update({
        transcript: text,
        ai_score: score,
        ai_comment: comment,
      })
      .eq("id", submissionId);

    // -----------------------------
    // 🔒 INCREMENT USAGE
    // -----------------------------
    if (usageRow) {
      await supabase
        .from("usage_tracking")
        .update({ count: currentUsage + 1 })
        .eq("month", month);
    } else {
      await supabase
        .from("usage_tracking")
        .insert({ month, count: 1 });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("❌ ERROR:", err.message);

    // fallback
    await supabase
      .from("student_submissions")
      .update({
        transcript: "...",
        ai_score: 3,
        ai_comment: "Something went wrong. Basic feedback.",
      })
      .eq("id", req.body?.submissionId);

    return res.status(500).json({ error: "failed" });
  }
}
