import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTeacherSessionLogoutCookie, getTeacherConfig } from "./teacher-auth";

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
