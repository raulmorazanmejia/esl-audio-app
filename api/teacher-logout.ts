import type { VercelRequest, VercelResponse } from "@vercel/node";

type TeacherConfig = {
  teacherEmail: string;
  teacherPassword: string;
  sessionSecret: string;
  tokenTtlSeconds: number;
};

type TeacherConfigResult =
  | { ok: true; config: TeacherConfig }
  | { ok: false; missingEnvVar: "TEACHER_EMAIL" | "TEACHER_PASSWORD" | "TEACHER_SESSION_SECRET" };

const TEACHER_SESSION_COOKIE_NAME = "teacher_session";

function getTeacherConfig(): TeacherConfigResult {
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase() || "";
  if (!teacherEmail) {
    return { ok: false, missingEnvVar: "TEACHER_EMAIL" };
  }

  const teacherPassword = process.env.TEACHER_PASSWORD?.trim() || "";
  if (!teacherPassword) {
    return { ok: false, missingEnvVar: "TEACHER_PASSWORD" };
  }

  const sessionSecret = process.env.TEACHER_SESSION_SECRET?.trim() || "";
  if (!sessionSecret) {
    return { ok: false, missingEnvVar: "TEACHER_SESSION_SECRET" };
  }

  const parsedTtl = Number(process.env.TEACHER_AUTH_TOKEN_TTL_SECONDS ?? "43200");
  const tokenTtlSeconds = Number.isFinite(parsedTtl) && parsedTtl > 0 ? Math.floor(parsedTtl) : 43200;

  return {
    ok: true,
    config: {
      teacherEmail,
      teacherPassword,
      sessionSecret,
      tokenTtlSeconds,
    },
  };
}

function createTeacherSessionLogoutCookie(): string {
  return `${TEACHER_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const configResult = getTeacherConfig();
    if (!configResult.ok) {
      return res.status(500).json({ error: `Missing ${configResult.missingEnvVar}` });
    }

    res.setHeader("Set-Cookie", createTeacherSessionLogoutCookie());
    return res.status(200).json({ authenticated: false });
  } catch (error) {
    console.error("TEACHER_LOGOUT UNEXPECTED ERROR:", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
