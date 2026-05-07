export type NormalizedActivityType = "speaking" | "picture" | "text" | "external" | "video" | "lesson" | "unknown";

const TYPE_MAP: Record<string, NormalizedActivityType> = {
  speaking: "speaking",
  audio: "speaking",
  audio_response: "speaking",
  speaking_audio: "speaking",
  speaking_response: "speaking",
  guided_speaking: "speaking",

  picture: "picture",
  image: "picture",
  image_prompt: "picture",
  picture_response: "picture",
  picture_description: "picture",

  text: "text",
  written: "text",
  writing: "text",
  short_answer: "text",
  text_response: "text",

  external: "external",
  external_link: "external",
  links: "external",
  google_form: "external",

  video: "video",
  video_response: "video",
  legacy_video: "video",

  lesson: "lesson",
  guided_lesson: "lesson",
};

export function normalizeActivityType(type: string | null | undefined): NormalizedActivityType {
  const key = String(type ?? "").trim().toLowerCase();
  if (!key) return "unknown";
  return TYPE_MAP[key] ?? "unknown";
}

type StudentActivityCategoryInput = {
  assignment_type?: string | null;
  prompt_image_url?: string | null;
  prompt_image_path?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  picture_prompt_data?: unknown;
};

function hasPicturePromptData(activity: StudentActivityCategoryInput): boolean {
  if (activity.prompt_image_url || activity.prompt_image_path || activity.image_url || activity.image_path) return true;
  if (activity.picture_prompt_data == null) return false;
  if (typeof activity.picture_prompt_data === "string") return activity.picture_prompt_data.trim().length > 0;
  if (Array.isArray(activity.picture_prompt_data)) return activity.picture_prompt_data.length > 0;
  return typeof activity.picture_prompt_data === "object";
}

export function normalizeStudentActivityCategory(activity: StudentActivityCategoryInput): NormalizedActivityType {
  const normalizedType = normalizeActivityType(activity.assignment_type);

  // Priority: lesson > picture > video > external > text > speaking.
  if (normalizedType === "lesson") return "lesson";
  if (hasPicturePromptData(activity) || normalizedType === "picture") return "picture";
  if (normalizedType === "video") return "video";
  if (normalizedType === "external") return "external";
  if (normalizedType === "text") return "text";
  if (normalizedType === "speaking") return "speaking";
  return normalizedType;
}
