import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { audioUrl, promptText } = req.body ?? {};

    if (!audioUrl || !promptText) {
      return res.status(400).json({ error: "Missing audioUrl or promptText" });
    }

    // 1) Download audio from Supabase public URL
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return res.status(400).json({ error: "Could not download audio file" });
    }

    const audioBuffer = await audioRes.arrayBuffer();

    // 2) Send audio to the official transcription endpoint
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "student-audio.webm");
    formData.append("model", "gpt-4o-mini-transcribe");

    const transcriptionRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const transcriptionJson = await transcriptionRes.json();
    console.log("TRANSCRIPTION JSON:", JSON.stringify(transcriptionJson, null, 2));

    if (!transcriptionRes.ok) {
      return res.status(500).json({
        error: "Transcription request failed",
        details: transcriptionJson,
      });
    }

    const transcript = String(transcriptionJson.text || "").trim();

    if (!transcript) {
      return res.status(200).json({
        transcript: "",
        score: 1,
        comment: "No transcript returned.",
      });
    }

    // 3) Grade the transcript with a text model
    const gradingRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              'You grade short ESL speaking responses. Return valid JSON only in this exact format: {"score": number, "comment": string}. Score from 1 to 5. Comment must be one short sentence.',
          },
          {
            role: "user",
            content: `Prompt: ${promptText}\nStudent answer: ${transcript}`,
          },
        ],
      }),
    });

    const gradingJson = await gradingRes.json();
    console.log("GRADING JSON:", JSON.stringify(gradingJson, null, 2));

    if (!gradingRes.ok) {
      return res.status(500).json({
        error: "Grading request failed",
        details: gradingJson,
      });
    }

    let score = 3;
    let comment = "Basic response.";

    try {
      const raw = gradingJson.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      score = typeof parsed.score === "number" ? parsed.score : 3;
      comment = typeof parsed.comment === "string" ? parsed.comment : "Basic response.";
    } catch (err) {
      console.error("GRADE PARSE ERROR:", err);
    }

    return res.status(200).json({
      transcript,
      score,
      comment,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    return res.status(500).json({ error: "failed" });
  }
}
