import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseAdmin = getServiceSupabase();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server submission configuration missing." });

  if (req.method === "GET") {
    const studentCode = String(req.query.studentCode || "").trim();
    const promptId = String(req.query.promptId || "").trim();
    const promptText = String(req.query.promptText || "").trim();

    if (!studentCode) return res.status(400).json({ error: "Missing studentCode." });

    let query = supabaseAdmin.from("student_submissions").select("*").eq("student_code", studentCode).order("created_at", { ascending: false });
    if (promptId) query = query.eq("prompt_id", promptId);
    else if (promptText) query = query.eq("prompt_text", promptText);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to load submissions." });
    return res.status(200).json({ data: data ?? [] });
  }

  if (req.method === "POST") {
    const payload = req.body && typeof req.body === "object" ? req.body : null;
    if (!payload) return res.status(400).json({ error: "Invalid payload." });
    const studentCode = String((payload as { student_code?: unknown }).student_code || "").trim();
    const studentName = String((payload as { student_name?: unknown }).student_name || "").trim();
    if (!studentCode || !studentName) return res.status(400).json({ error: "Missing student identity." });

    const { data, error } = await supabaseAdmin.from("student_submissions").insert(payload).select("*").single();
    if (error) return res.status(500).json({ error: "Could not save submission." });
    return res.status(200).json({ data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
