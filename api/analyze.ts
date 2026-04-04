import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { audioUrl, promptText } = req.body;

    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "audio.webm");
    formData.append("model", "gpt-4o-mini-transcribe");

    const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const tData = await transcription.json();
    const transcript = tData.text;

    const grading = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `
Score ESL response 1-5.
One short sentence only.
Return JSON:
{ "score": number, "comment": string }
`,
          },
          {
            role: "user",
            content: `Prompt: ${promptText}\nAnswer: ${transcript}`,
          },
        ],
      }),
    });

    const gData = await grading.json();
    const parsed = JSON.parse(gData.choices[0].message.content);

    res.status(200).json({
      transcript,
      score: parsed.score,
      comment: parsed.comment,
    });

  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
}
