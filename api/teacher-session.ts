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

type TeacherTokenPayload = {
  exp: number;
  v: 1;
};

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

function verifyTeacherToken(token: string, config: TeacherConfig, nowMs = Date.now()): boolean {
  if (!token || !token.includes(".")) return false;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;

  const expectedSignature = crypto.createHmac("sha256", config.sessionSecret).update(payloadBase64).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  let payload: TeacherTokenPayload | null = null;
  try {
    const raw = Buffer.from(payloadBase64, "base64url").toString("utf8");
    payload = JSON.parse(raw) as TeacherTokenPayload;
  } catch {
    payload = null;
  }

  if (!payload || payload.v !== 1 || typeof payload.exp !== "number") {
    return false;
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  return payload.exp > nowSeconds;
}

function getTeacherTokenFromRequest(req: VercelRequest): string {
  const rawCookie = req.headers.cookie || "";
  if (!rawCookie) return "";

  const cookieParts = rawCookie.split(";");
  for (const part of cookieParts) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== TEACHER_SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(rawValue.join("=") || "");
  }
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const configResult = getTeacherConfig();
    if (!configResult.ok) {
      return res.status(500).json({ error: `Missing ${configResult.missingEnvVar}` });
    }

    const token = getTeacherTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ authenticated: false, error: "Not authenticated" });
    }

    const isValid = verifyTeacherToken(token, configResult.config);
    if (!isValid) {
      return res.status(401).json({ authenticated: false, error: "Not authenticated" });
    }

    return res.status(200).json({ authenticated: true });
  } catch (error) {
    console.error("TEACHER_SESSION UNEXPECTED ERROR:", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
