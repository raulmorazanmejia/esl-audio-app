const TEACHER_AUTH_TOKEN_KEY = "teacher_auth_token";

export function getTeacherAuthToken(): string {
  return window.localStorage.getItem(TEACHER_AUTH_TOKEN_KEY) || "";
}

export function setTeacherAuthToken(token: string) {
  if (!token) {
    window.localStorage.removeItem(TEACHER_AUTH_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TEACHER_AUTH_TOKEN_KEY, token);
}

export function clearTeacherAuthToken() {
  window.localStorage.removeItem(TEACHER_AUTH_TOKEN_KEY);
}
