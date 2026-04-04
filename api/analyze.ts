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

    const arrayBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // 2) Transcribe with Responses API
    const transcriptionRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-transcribe",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Transcribe this audio exactly. Return only the transcript.",
              },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: "webm",
                },
              },
            ],
          },
        ],
      }),
    });

    const transcriptionJson = await transcriptionRes.json();
    console.log("TRANSCRIPTION JSON:", JSON.stringify(transcriptionJson, null, 2));

    if (!transcriptionRes.ok) {
      return res.status(500).json({
        error: "Transcription request failed",
        details: transcriptionJson,
      });
    }

    const transcript =
      transcriptionJson.output_text ||
      transcriptionJson.output?.[0]?.content?.[0]?.text ||
      transcriptionJson.output?.[0]?.content?.find?.((c: any) => c.type === "output_text")?.text ||
      "";

    // If transcription is empty, return early so we can see it clearly in the app
    if (!transcript.trim()) {
      return res.status(200).json({
        transcript: "",
        score: 1,
        comment: "No transcript returned.",
      });
    }

    // 3) Grade the transcript
    const gradingRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  'You grade short ESL speaking responses. Return valid JSON only in this exact format: {"score": number, "comment": string}. Score from 1 to 5. Comment must be one short sentence.',
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Prompt: ${promptText}\nStudent answer: ${transcript}`,
              },
            ],
          },
        ],
      }),
    });

    const gradingJson = await gradingRes.json();
    console.log("GRADING JSON:", JSON.stringify(gradingJson, null, 2));

    let score = 3;
    let comment = "Basic response.";

    try {
      const raw =
        gradingJson.output_text ||
        gradingJson.output?.[0]?.content?.[0]?.text ||
        "{}";

      const parsed = JSON.parse(raw);
      score = parsed.score ?? 3;
      comment = parsed.comment ?? "Basic response.";
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
