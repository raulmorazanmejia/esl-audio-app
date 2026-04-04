import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { audioUrl, promptText } = req.body;

    // Step 1: Download audio
    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();

    // Step 2: Transcribe using new API
    const transcriptionRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-transcribe",
        input_audio: {
          data: Buffer.from(buffer).toString("base64"),
          format: "webm"
        }
      })
    });

    const tData = await transcriptionRes.json();
    const transcript = tData.output_text || "";

    // Step 3: Grade
    const gradingRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        input: `
Score this ESL response from 1 to 5.
Give one short sentence only.

Prompt: ${promptText}
Answer: ${transcript}

Return JSON:
{ "score": number, "comment": string }
`
      })
    });

    const gData = await gradingRes.json();

    let parsed;
    try {
      parsed = JSON.parse(gData.output_text);
    } catch {
      parsed = { score: 3, comment: "Basic response." };
    }

    res.status(200).json({
      transcript,
      score: parsed.score,
      comment: parsed.comment,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
}
