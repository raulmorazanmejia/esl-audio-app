import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const WRITEABLE_KEYS = new Set(["demo_config", "student_welcome_image_url"]);

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function getBearerToken(req: VercelRequest): string {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

function isAllowedTeacherEmail(email?: string | null): boolean {
  const allowedCsv = process.env.TEACHER_ALLOWED_EMAILS?.trim() || "";
  if (!allowedCsv) return true;
  const allowed = new Set(
    allowedCsv
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  return !!email && allowed.has(email.toLowerCase());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseAdmin = getServiceSupabase();
  if (!supabaseAdmin) {
    console.error("APP_SETTINGS CONFIG ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Settings service is unavailable." });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!isAllowedTeacherEmail(user.email)) {
    return res.status(403).json({ error: "Forbidden." });
  }

  const { key, value } = req.body ?? {};
  const normalizedKey = typeof key === "string" ? key.trim() : "";

  if (!normalizedKey || !WRITEABLE_KEYS.has(normalizedKey)) {
    return res.status(400).json({ error: "Unsupported settings key." });
  }

  const nextValue = value == null ? null : String(value);

  const { error: writeError } = await supabaseAdmin.from("app_settings").upsert({ key: normalizedKey, value: nextValue }, { onConflict: "key" });

  if (writeError) {
    console.error("APP_SETTINGS WRITE ERROR:", writeError.message);
    return res.status(500).json({ error: "Could not save settings." });
  }

  return res.status(200).json({ ok: true });
}
