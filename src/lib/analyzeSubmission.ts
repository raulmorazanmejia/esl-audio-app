// Security: AI calls must remain server-only via /api/analyze.
// Never call OpenAI directly from client code or use VITE_OPENAI_API_KEY.
export async function analyzeSubmission(
  audioUrl: string,
  promptText: string,
  submissionId?: string,
  promptImageUrl?: string | null
) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audioUrl,
      promptText,
      submissionId: submissionId ?? null,
      promptImageUrl: promptImageUrl ?? null,
      prompt_image_url: promptImageUrl ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI analysis failed: ${text}`);
  }

  return await res.json();
}
