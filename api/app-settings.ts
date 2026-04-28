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

function getInvalidPayloadResponse(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid payload. Expected JSON object with key and value.";
  }
  const payload = body as { key?: unknown };
  if (typeof payload.key !== "string" || !payload.key.trim()) {
    return "Invalid payload. Expected non-empty string key.";
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "value")) {
    return "Invalid payload. Missing value field.";
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
      return res.status(401).json({ error: "Unauthorized. Missing bearer token." });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized. Invalid auth token." });
    }

    if (!isAllowedTeacherEmail(user.email)) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const payloadError = getInvalidPayloadResponse(req.body);
    if (payloadError) {
      return res.status(400).json({ error: payloadError });
    }

    const { key, value } = req.body as { key: string; value: unknown };
    const normalizedKey = key.trim();

    if (!WRITEABLE_KEYS.has(normalizedKey)) {
      return res.status(400).json({ error: `Unsupported settings key: ${normalizedKey}` });
    }

    const nextValue = value == null ? null : typeof value === "string" ? value : JSON.stringify(value);

    const { error: writeError } = await supabaseAdmin.from("app_settings").upsert({ key: normalizedKey, value: nextValue }, { onConflict: "key" });

    if (writeError) {
      console.error("APP_SETTINGS WRITE ERROR:", writeError);
      return res.status(500).json({ error: "Could not save settings." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("APP_SETTINGS UNEXPECTED ERROR:", error);
    return res.status(500).json({ error: "Unexpected server error while saving settings." });
  }
}
