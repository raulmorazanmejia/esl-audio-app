export async function getTeacherSessionStatus(): Promise<boolean> {
  const response = await fetch("/api/teacher-session", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) return false;

  const payload = (await response.json()) as { authenticated?: boolean };
  return Boolean(payload?.authenticated);
}

export async function clearTeacherSession(): Promise<void> {
  await fetch("/api/teacher-logout", {
    method: "POST",
    credentials: "include",
  });
}
