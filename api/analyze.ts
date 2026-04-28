import type { VercelRequest, VercelResponse } from "@vercel/node";

const SAFE_INAPPROPRIATE_MESSAGE =
  "This response could not be accepted because it contains inappropriate language. Please record again using classroom-appropriate English.";
const TEACHER_FLAG_MARKER = "Flagged for inappropriate language.";
const DEMO_MAX_ATTEMPTS_PER_DAY = 3;
const DEMO_MIN_SUBMIT_INTERVAL_MS = 3_000;
const DEMO_MAX_TRANSCRIPT_CHARS = 700;
const DEMO_MAX_AUDIO_SECONDS = 90;
const demoUsageByIp = new Map<string, { date: string; count: number; lastAt: number }>();

function getClientIp(req: VercelRequest): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function firstNonEmptyString(...values: any[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isLikelyImageUrl(value: string | null): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("data:image/");
}

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

function guessAudioMeta(audioInput: string, fallbackUrl?: string) {
  if (audioInput.startsWith("data:")) {
    const header = audioInput.slice(5, audioInput.indexOf(","));
    const mime = header.split(";")[0]?.trim().toLowerCase() || "";
    if (mime === "audio/mp4" || mime === "audio/x-m4a" || mime === "audio/m4a") {
      return { mimeType: "audio/mp4", fileName: "student-audio.m4a" };
    }
    if (mime === "audio/mpeg" || mime === "audio/mp3") {
      return { mimeType: "audio/mpeg", fileName: "student-audio.mp3" };
    }
    if (mime === "audio/ogg") {
      return { mimeType: "audio/ogg", fileName: "student-audio.ogg" };
    }
    if (mime === "audio/webm") {
      return { mimeType: "audio/webm", fileName: "student-audio.webm" };
    }
    if (mime.startsWith("audio/")) {
      const ext = mime.replace("audio/", "") || "webm";
      return { mimeType: mime, fileName: `student-audio.${ext}` };
    }
  }
  return guessAudioMetaFromUrl(fallbackUrl || audioInput);
}

function isClearlyInappropriate(moderationResult: any): boolean {
  const categories = moderationResult?.categories || {};
  const categoryScores = moderationResult?.category_scores || {};

  const severeCategoryKeys = [
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "sexual",
    "sexual/minors",
    "violence",
    "violence/graphic",
  ];

  return severeCategoryKeys.some((key) => {
    const flagged = categories[key] === true;
    const score = typeof categoryScores[key] === "number" ? categoryScores[key] : 0;
    return flagged && score >= 0.5;
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  function fail(
    status: number,
    reason: "missing_openai_key" | "invalid_audio_payload" | "demo_limit_reached" | "transcription_failed" | "grading_failed",
    message: string,
    isDemoMode: boolean,
  ) {
    console.error("demo analyze failed", { reason, status, isDemoMode });
    return res.status(status).json({ error: reason, message });
  }

  // Security note: OPENAI_API_KEY must stay server-only in Vercel env vars.
  // Never expose this key to browser bundles, React components, or client env vars (e.g. VITE_*).
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();

  if (!openAiApiKey) {
    return fail(500, "missing_openai_key", "AI analysis is temporarily unavailable: server is missing OPENAI_API_KEY.", false);
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
      imageUrl,
      prompt_image_path,
      transcriptText,
      assignmentType,
      assignment_type,
      activityType,
      activity_type,
      isDemoMode,
      demo,
      audioDurationSeconds,
    } = req.body ?? {};

    const demoMode = Boolean(isDemoMode || demo);
    const finalAudioUrl = audioUrl || audio_url;
    const finalPromptText = promptText || prompt_text || prompt;
    const finalPromptImageUrl = firstNonEmptyString(promptImageUrl, prompt_image_url, promptImage, imageUrl, prompt_image_path);
    const finalTranscriptText = typeof transcriptText === "string" ? transcriptText.trim() : "";
    const finalActivityType = assignmentType || assignment_type || activityType || activity_type || null;
    const isPictureActivity =
      finalActivityType === "audio_response" &&
      Boolean(firstNonEmptyString(promptImageUrl, prompt_image_url, imageUrl, prompt_image_path, promptImage));

    if (demoMode) {
      const ip = getClientIp(req);
      const today = getTodayDate();
      const now = Date.now();
      const usage = demoUsageByIp.get(ip);
      const current = usage && usage.date === today ? usage : { date: today, count: 0, lastAt: 0 };
      if (current.count >= DEMO_MAX_ATTEMPTS_PER_DAY) {
        return fail(429, "demo_limit_reached", "Demo limit reached", demoMode);
      }
      if (current.lastAt && now - current.lastAt < DEMO_MIN_SUBMIT_INTERVAL_MS) {
        return fail(429, "demo_limit_reached", "Demo limit reached", demoMode);
      }
      demoUsageByIp.set(ip, { date: today, count: current.count + 1, lastAt: now });
      if (typeof audioDurationSeconds === "number" && audioDurationSeconds > DEMO_MAX_AUDIO_SECONDS) {
        return res.status(400).json({ error: "invalid_audio_payload", message: "Demo recordings are limited to 90 seconds." });
      }
      if (finalTranscriptText.length > DEMO_MAX_TRANSCRIPT_CHARS) {
        return res.status(400).json({ error: "Demo text is too long." });
      }
    }

    if ((!finalAudioUrl && !finalTranscriptText) || !finalPromptText) {
      return res.status(400).json({
        error: "Missing audioUrl/transcriptText or promptText",
        received: {
          audioUrl: !!audioUrl,
          audio_url: !!audio_url,
          promptText: !!promptText,
          prompt_text: !!prompt_text,
          prompt: !!prompt,
        },
      });
    }

    let transcript = finalTranscriptText;
    if (!transcript) {
      if (typeof finalAudioUrl !== "string" || !finalAudioUrl.trim()) {
        return fail(400, "invalid_audio_payload", "Missing or invalid audioUrl", demoMode);
      }

      let audioRes: Response;
      try {
        audioRes = await fetch(finalAudioUrl);
      } catch (audioFetchErr) {
        console.error("AUDIO FETCH ERROR:", audioFetchErr);
        return fail(400, "invalid_audio_payload", "Could not read audio payload", demoMode);
      }
      if (!audioRes.ok) {
        return fail(400, "invalid_audio_payload", "Could not download audio file", demoMode);
      }

      const audioBuffer = await audioRes.arrayBuffer();
      if (!audioBuffer.byteLength) {
        return fail(400, "invalid_audio_payload", "Audio payload is empty", demoMode);
      }
      const { mimeType, fileName } = guessAudioMeta(finalAudioUrl, finalAudioUrl);

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
        return fail(502, "transcription_failed", "AI transcription failed. Please try again in a moment.", demoMode);
      }
      transcript = String(transcriptionJson.text || "").trim();
    }

    if (!transcript) {
      return res.status(200).json({
        transcript: "",
        score: 1,
        comment: "No clear response was detected.",
      });
    }

    let isFlagged = false;
    try {
      const moderationRes = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: transcript,
        }),
      });
      const moderationJson = await moderationRes.json();

      if (!moderationRes.ok) {
        console.error("MODERATION PROVIDER ERROR:", {
          status: moderationRes.status,
          statusText: moderationRes.statusText,
        });
      } else {
        const moderationResult = moderationJson?.results?.[0];
        isFlagged = isClearlyInappropriate(moderationResult);
      }
    } catch (moderationErr) {
      console.error("MODERATION ERROR:", moderationErr);
    }

    if (isFlagged) {
      return res.status(200).json({
        transcript,
        score: 0,
        comment: `${TEACHER_FLAG_MARKER} ${SAFE_INAPPROPRIATE_MESSAGE}`,
        flagged: true,
      });
    }

    async function requestGrade(usePictureContext: boolean) {
      const shouldIncludeImage = usePictureContext && isPictureActivity && isLikelyImageUrl(finalPromptImageUrl);
      const userContent = shouldIncludeImage
        ? [
            {
              type: "text",
              text: `Activity type: ${finalActivityType || "unknown"}\nPrompt: ${finalPromptText}\nStudent answer: ${transcript}\n\nEvaluate against BOTH the prompt and image.`,
            },
            {
              type: "image_url",
              image_url: {
                url: finalPromptImageUrl,
              },
            },
          ]
        : `Activity type: ${finalActivityType || "unknown"}\nPrompt: ${finalPromptText}\nStudent answer: ${transcript}`;

      return fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          max_tokens: demoMode ? 220 : 360,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You grade ESL responses. Return valid JSON only in this schema: {"score": number, "comment": string, "strengths": string[], "improvements": string[], "pictureAccuracy": string}. Score must be integer 1-5. Evaluate relevance, completeness, and understandable grammar/syntax. Do not heavily punish minor grammar errors when meaning is clear. Keep comments practical and specific.${demoMode ? " Keep wording concise for demo users." : ""} ${
                isPictureActivity
                  ? "For describe-a-picture tasks: judge whether learner mentions visible objects/people/actions, describes scene accurately, avoids invented details, and gives enough detail for level. If image is unavailable, fall back to prompt+transcript only."
                  : "For non-picture tasks: evaluate against prompt and transcript only."
              }`,
            },
            {
              role: "user",
              content: userContent,
            },
          ],
        }),
      });
    }

    let gradingRes: Response;
    try {
      gradingRes = await requestGrade(true);
    } catch (pictureErr: any) {
      if (isPictureActivity) {
        console.error("picture grading fallback", { reason: pictureErr?.message || "picture_request_failed" });
      }
      gradingRes = await requestGrade(false);
    }
    if (!gradingRes.ok && isPictureActivity && isLikelyImageUrl(finalPromptImageUrl)) {
      console.error("picture grading fallback", { reason: `provider_status_${gradingRes.status}` });
      gradingRes = await requestGrade(false);
    }

    const gradingJson = await gradingRes.json();
    console.log("GRADING JSON:", JSON.stringify(gradingJson, null, 2));

    if (!gradingRes.ok) {
      console.error("GRADING PROVIDER ERROR:", {
        status: gradingRes.status,
        statusText: gradingRes.statusText,
      });
      return fail(502, "grading_failed", "AI grading failed. Please try again in a moment.", demoMode);
    }

    let score = 3;
    let comment = "Basic response.";
    let strengths: string[] | undefined;
    let improvements: string[] | undefined;
    let pictureAccuracy: string | undefined;

    try {
      const raw = gradingJson.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      score = typeof parsed.score === "number" ? parsed.score : 3;
      comment = typeof parsed.comment === "string" ? parsed.comment : "Basic response.";
      strengths = Array.isArray(parsed.strengths) ? parsed.strengths.filter((item: any) => typeof item === "string") : undefined;
      improvements = Array.isArray(parsed.improvements) ? parsed.improvements.filter((item: any) => typeof item === "string") : undefined;
      pictureAccuracy = typeof parsed.pictureAccuracy === "string" ? parsed.pictureAccuracy : undefined;
    } catch (err) {
      console.error("GRADE PARSE ERROR:", err);
    }

    return res.status(200).json({
      transcript,
      score,
      comment,
      strengths,
      improvements,
      pictureAccuracy,
      flagged: false,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    return res.status(500).json({
      error: "AI analysis failed due to a server error.",
    });
  }
}
