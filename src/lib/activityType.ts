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
