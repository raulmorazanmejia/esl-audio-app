export async function analyzeSubmission(audioUrl: string, promptText: string) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioUrl, promptText }),
  });

  if (!res.ok) {
    throw new Error("AI analysis failed");
  }

  return await res.json();
}
