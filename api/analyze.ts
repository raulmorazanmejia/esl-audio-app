import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { audioUrl, promptText } = req.body;

    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();

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
                type: "input_audio",
                input_audio: {
                  data: Buffer.from(buffer).toString("base64"),
                  format: "webm",
                },
              },
            ],
          },
        ],
      }),
    });

    const tData = await transcriptionRes.json();
    console.log("TRANSCRIPTION RAW:", JSON.stringify(tData, null, 2));

    const transcript =
      tData.output_text ||
      tData.output?.[0]?.content?.[0]?.text ||
      tData.output?.[0]?.content?.[0]?.transcript ||
      "";

    const gradingRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `
Score this ESL response from 1 to 5.
Give one short sentence only.

Prompt: ${promptText}
Answer: ${transcript}

Return valid JSON only:
{"score": number, "comment": string}
`,
      }),
    });

    const gData = await gradingRes.json();
    console.log("GRADING RAW:", JSON.stringify(gData, null, 2));

    let parsed = { score: 3, comment: "Basic response." };

    try {
      const rawText =
        gData.output_text ||
        gData.output?.[0]?.content?.[0]?.text ||
        "";

      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("GRADE PARSE ERROR:", e);
    }

    res.status(200).json({
      transcript,
      score: parsed.score,
      comment: parsed.comment,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    res.status(500).json({ error: "failed" });
  }
}
