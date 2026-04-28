import crypto from "crypto";
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

function verifyTeacherCredentials(
  config: TeacherConfig,
  input: { email?: unknown; password?: unknown },
): { ok: true } | { ok: false } {
  const password = typeof input.password === "string" ? input.password : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (password !== config.teacherPassword) {
    return { ok: false };
  }

  if (config.teacherEmail && email !== config.teacherEmail) {
    return { ok: false };
  }

  return { ok: true };
}

function createTeacherToken(config: TeacherConfig, nowMs = Date.now()): string {
  const payload = {
    v: 1,
    exp: Math.floor(nowMs / 1000) + config.tokenTtlSeconds,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", config.sessionSecret).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

function createTeacherSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${TEACHER_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
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

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const authResult = verifyTeacherCredentials(configResult.config, req.body as { email?: unknown; password?: unknown });
    if (!authResult.ok) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = createTeacherToken(configResult.config);
    res.setHeader("Set-Cookie", createTeacherSessionCookie(token, configResult.config.tokenTtlSeconds));
    return res.status(200).json({ authenticated: true });
  } catch (error) {
    console.error("TEACHER_LOGIN UNEXPECTED ERROR:", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
