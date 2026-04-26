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
  // Security note: OPENAI_API_KEY must stay server-only in Vercel env vars.
  // Never expose this key to browser bundles, React components, or client env vars (e.g. VITE_*).
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();

  if (!openAiApiKey) {
    console.error("ANALYZE CONFIG ERROR: Missing OPENAI_API_KEY");
    return res.status(500).json({
      error: "AI analysis is temporarily unavailable: server is missing OPENAI_API_KEY.",
    });
  }

  try {
    const {
      audioUrl,
      audio_url,
      promptText,
      prompt_text,
      prompt,
      promptImageUrl,
      prompt_image_url,
      promptImage,
    } = req.body ?? {};

    const finalAudioUrl = audioUrl || audio_url;
    const finalPromptText = promptText || prompt_text || prompt;
    const finalPromptImageUrl = promptImageUrl || prompt_image_url || promptImage || null;

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
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: formData,
    });

    const transcriptionJson = await transcriptionRes.json();
    console.log("TRANSCRIPTION JSON:", JSON.stringify(transcriptionJson, null, 2));

    if (!transcriptionRes.ok) {
      console.error("TRANSCRIPTION PROVIDER ERROR:", {
        status: transcriptionRes.status,
        statusText: transcriptionRes.statusText,
      });
      return res.status(502).json({
        error: "AI transcription failed. Please try again in a moment.",
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

    const userContent = finalPromptImageUrl
      ? [
          {
            type: "text",
            text: `Prompt: ${finalPromptText}\nStudent answer: ${transcript}\n\nEvaluate task completion against BOTH the prompt text and this image. Reward relevant visible details. Do not invent invisible details. Light inferences are okay only when strongly supported by visible evidence.`,
          },
          {
            type: "image_url",
            image_url: {
              url: finalPromptImageUrl,
            },
          },
        ]
      : `Prompt: ${finalPromptText}\nStudent answer: ${transcript}`;

    const gradingRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
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
              "You grade short ESL speaking responses using transcript-only evidence. Evaluate both content (relevance and completeness) and inferred delivery (clarity, fluency, and answer length) from the transcript text. Infer likely speaking limits this way: very short answers may indicate limited speaking; repetitive or overly simple wording may indicate fluency limits; unnatural phrasing may indicate clarity issues. Do not pretend to hear audio and do not claim specific pronunciation errors from sound. Use classroom-safe speaking guidance such as \"speak more clearly\", \"improve pronunciation\", or \"add more detail when speaking\" when appropriate. Return valid JSON only in this exact format: {\"score\": number, \"comment\": string}. Score must be an integer from 1 to 5 using this rubric: 5 = clearly answers the prompt well with strong understandable language and solid inferred delivery; 4 = answers the prompt with minor weakness in content or inferred delivery; 3 = partially answers or is too limited in content or inferred delivery; 2 = mostly off-topic or very weak with limited understandable output; 1 = does not answer the prompt or is unrelated. Comment must be exactly two short sentences in this order: (1) one specific strength, (2) one specific improvement for future speaking. Keep tone practical, classroom-appropriate, and concise. Avoid repetition and generic filler. Do not hallucinate details not present in the transcript or prompt. For image prompts, only credit details that are visibly present in the provided image and allow only light, reasonable inferences strongly supported by visible evidence.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    const gradingJson = await gradingRes.json();
    console.log("GRADING JSON:", JSON.stringify(gradingJson, null, 2));

    if (!gradingRes.ok) {
      console.error("GRADING PROVIDER ERROR:", {
        status: gradingRes.status,
        statusText: gradingRes.statusText,
      });
      return res.status(502).json({
        error: "AI grading failed. Please try again in a moment.",
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
    return res.status(500).json({
      error: "AI analysis failed due to a server error.",
    });
  }
}
