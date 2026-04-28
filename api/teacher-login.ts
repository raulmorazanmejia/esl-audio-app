import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTeacherSessionCookie, createTeacherToken, getTeacherConfig, verifyTeacherCredentials } from "./teacher-auth";

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
