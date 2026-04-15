import type { VercelRequest, VercelResponse } from "@vercel/node";

function guessAudioMetaFromUrl(audioUrl: string) {
  const lower = audioUrl.toLowerCase();

  if (lower.includes(".mp4")) {
    return { mimeType: "audio/mp4", fileName: "student-audio.mp4" };
  }

  if (lower.includes(".m4a")) {
    return { mimeType: "audio/mp4", fileName: "student-audio.m4a" };
  }

  if (lower.includes(".ogg")) {
    return { mimeType: "audio/ogg", fileName: "student-audio.ogg" };
  }

  if (lower.includes(".mp3")) {
    return { mimeType: "audio/mpeg", fileName: "student-audio.mp3" };
  }

  return { mimeType: "audio/webm", fileName: "student-audio.webm" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      audioUrl,
      audio_url,
      promptText,
      prompt_text,
      prompt,
    } = req.body ?? {};

    const finalAudioUrl = audioUrl || audio_url;
    const finalPromptText = promptText || prompt_text || prompt;

    if (!finalAudioUrl || !finalPromptText) {
      return res.status(400).json({
        error: "Missing audioUrl or promptText",
        received: {
          audioUrl: !!audioUrl,
          audio_url: !!audio_url,
          promptText: !!promptText,
          prompt_text: !!prompt_text,
          prompt: !!prompt,
        },
      });
    }

    const audioRes = await fetch(finalAudioUrl);
    if (!audioRes.ok) {
      return res.status(400).json({ error: "Could not download audio file" });
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const { mimeType, fileName } = guessAudioMetaFromUrl(finalAudioUrl);

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: mimeType }), fileName);
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
        comment: "No clear response was detected.",
      });
    }

    const gradingRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You grade short ESL speaking responses. Judge whether the student answered the prompt, with focus on task completion, relevant detail, clarity, and basic grammar only when it affects understanding. Return valid JSON only in this exact format: {\"score\": number, \"comment\": string}. Score must be an integer from 1 to 5 using this rubric: 5 = clearly answers the prompt well and is understandable; 4 = answers the prompt with minor weakness; 3 = partially answers or is too limited; 2 = mostly off-topic or very weak; 1 = does not answer the prompt or is unrelated. Comment must be exactly two short sentences in this order: (1) one specific strength, (2) one specific missing detail or improvement. Keep tone practical, classroom-appropriate, and concise. Avoid repetition and generic filler. Do not hallucinate details not present in the transcript or prompt. If the prompt references an image, only mention details that would reasonably be visible from the provided prompt context.",
          },
          {
            role: "user",
            content: `Prompt: ${finalPromptText}\nStudent answer: ${transcript}`,
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
