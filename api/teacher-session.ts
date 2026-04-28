import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTeacherConfig, getTeacherTokenFromRequest, verifyTeacherToken } from "./teacher-auth";

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
