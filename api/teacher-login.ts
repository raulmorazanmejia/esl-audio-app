import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTeacherToken, getTeacherConfig, verifyTeacherCredentials } from "./teacher-auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configResult = getTeacherConfig();
  if (!configResult.ok) {
    return res.status(500).json({
      error: "Missing server login config",
      code: "MISSING_CONFIG",
      missingEnvVar: configResult.missingEnvVar,
    });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Invalid payload", code: "INVALID_PAYLOAD" });
  }

  const authResult = verifyTeacherCredentials(configResult.config, req.body as { email?: unknown; password?: unknown });
  if (!authResult.ok) {
    return res.status(401).json({ error: "Incorrect email or password", code: authResult.code });
  }

  const token = createTeacherToken(configResult.config);
  return res.status(200).json({ ok: true, token, requiresEmail: Boolean(configResult.config.teacherEmail) });
}
