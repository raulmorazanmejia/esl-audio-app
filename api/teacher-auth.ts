import crypto from "crypto";

export const TEACHER_AUTH_ERROR_CODES = {
  MISSING_CONFIG: "MISSING_CONFIG",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_TOKEN: "INVALID_TOKEN",
} as const;

export type TeacherAuthErrorCode = (typeof TEACHER_AUTH_ERROR_CODES)[keyof typeof TEACHER_AUTH_ERROR_CODES];

export type TeacherConfig = {
  teacherEmail: string;
  teacherPassword: string;
  authSecret: string;
  tokenTtlSeconds: number;
};

export type TeacherConfigResult =
  | { ok: true; config: TeacherConfig }
  | { ok: false; missingEnvVar: "TEACHER_PASSWORD" };

export function getTeacherConfig(): TeacherConfigResult {
  const teacherPassword = process.env.TEACHER_PASSWORD?.trim() || "";
  if (!teacherPassword) {
    return { ok: false, missingEnvVar: "TEACHER_PASSWORD" };
  }

  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase() || "";
  const authSecret = process.env.TEACHER_AUTH_SECRET?.trim() || teacherPassword;
  const parsedTtl = Number(process.env.TEACHER_AUTH_TOKEN_TTL_SECONDS ?? "43200");
  const tokenTtlSeconds = Number.isFinite(parsedTtl) && parsedTtl > 0 ? Math.floor(parsedTtl) : 43200;

  return {
    ok: true,
    config: {
      teacherEmail,
      teacherPassword,
      authSecret,
      tokenTtlSeconds,
    },
  };
}

export function verifyTeacherCredentials(
  config: TeacherConfig,
  input: { email?: unknown; password?: unknown },
): { ok: true } | { ok: false; code: TeacherAuthErrorCode } {
  const password = typeof input.password === "string" ? input.password : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  const isPasswordMatch = password === config.teacherPassword;
  if (!isPasswordMatch) {
    return { ok: false, code: TEACHER_AUTH_ERROR_CODES.INVALID_CREDENTIALS };
  }

  if (config.teacherEmail && email !== config.teacherEmail) {
    return { ok: false, code: TEACHER_AUTH_ERROR_CODES.INVALID_CREDENTIALS };
  }

  return { ok: true };
}

type TeacherTokenPayload = {
  exp: number;
  v: 1;
};

function toBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url<T>(input: string): T | null {
  try {
    const raw = Buffer.from(input, "base64url").toString("utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function signPayload(payloadBase64: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function createTeacherToken(config: TeacherConfig, nowMs = Date.now()): string {
  const payload: TeacherTokenPayload = {
    v: 1,
    exp: Math.floor(nowMs / 1000) + config.tokenTtlSeconds,
  };
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64, config.authSecret);
  return `${payloadBase64}.${signature}`;
}

export function verifyTeacherToken(token: string, config: TeacherConfig, nowMs = Date.now()): boolean {
  if (!token || !token.includes(".")) return false;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;

  const expectedSignature = signPayload(payloadBase64, config.authSecret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  const payload = fromBase64Url<TeacherTokenPayload>(payloadBase64);
  if (!payload || payload.v !== 1 || typeof payload.exp !== "number") {
    return false;
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  return payload.exp > nowSeconds;
}
