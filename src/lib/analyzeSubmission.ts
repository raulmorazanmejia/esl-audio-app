export async function analyzeSubmission(
  audioUrl: string,
  promptText: string,
  submissionId?: string
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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI analysis failed: ${text}`);
  }

  return await res.json();
}
