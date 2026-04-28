export type DemoActivityType = "audio_response" | "text_response" | "external_link" | "video_response";
export type FeedbackProfile = "student_friendly" | "academic_demo" | "balanced" | "strict";

export type DemoActivityConfig = {
  id: string;
  type: DemoActivityType;
  title: string;
  prompt: string;
  suggestedTime: string;
  visible: boolean;
  order: number;
  externalUrl?: string;
  imageUrl?: string;
};

export type DemoConfig = {
  demoEnabled: boolean;
  aiFeedbackEnabled: boolean;
  feedbackProfile: FeedbackProfile;
  welcomeTitle: string;
  welcomeSubtitle: string;
  heroImageUrl: string;
  activities: DemoActivityConfig[];
};

export const DEMO_CONFIG_SETTING_KEY = "demo_config";

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  demoEnabled: true,
  aiFeedbackEnabled: false,
  feedbackProfile: "academic_demo",
  welcomeTitle: "Try ESL Hub",
  welcomeSubtitle: "Complete a sample activity and see how it works.",
  heroImageUrl: "",
  activities: [
    {
      id: "demo-speaking",
      type: "audio_response",
      title: "Talk about your hometown",
      prompt: "Say 3 or more sentences about your hometown.",
      suggestedTime: "1 minute",
      visible: true,
      order: 1,
    },
    {
      id: "demo-picture",
      type: "audio_response",
      title: "Describe the picture",
      prompt: "Describe what you see in the picture.",
      suggestedTime: "1 minute",
      visible: true,
      order: 2,
      imageUrl: "",
    },
    {
      id: "demo-text",
      type: "text_response",
      title: "Write about your favorite food",
      prompt: "Write 3 sentences about a food you like.",
      suggestedTime: "2 minutes",
      visible: true,
      order: 3,
    },
    {
      id: "demo-external",
      type: "external_link",
      title: "Practice on an external activity",
      prompt: "Open a sample external worksheet in a new tab.",
      suggestedTime: "3 minutes",
      visible: false,
      order: 4,
      externalUrl: "https://example.com",
    },
  ],
};

const VALID_TYPES = new Set<DemoActivityType>(["audio_response", "text_response", "external_link", "video_response"]);

export function normalizeDemoConfig(input: unknown): DemoConfig {
  const source = (input && typeof input === "object" ? input : {}) as Partial<DemoConfig> & { enabled?: boolean; activities?: unknown };
  const baseActivities = Array.isArray(source.activities) ? source.activities : [];

  const normalizedActivities = baseActivities
    .map((raw, index) => {
      const row = (raw && typeof raw === "object" ? raw : {}) as Partial<DemoActivityConfig>;
      const id = String(row.id || `demo-${index + 1}`).trim() || `demo-${index + 1}`;
      const type = VALID_TYPES.has(row.type as DemoActivityType) ? (row.type as DemoActivityType) : "audio_response";
      const fallback = DEFAULT_DEMO_CONFIG.activities[index] || DEFAULT_DEMO_CONFIG.activities[0];
      return {
        id,
        type,
        title: String(row.title ?? fallback.title),
        prompt: String(row.prompt ?? fallback.prompt),
        suggestedTime: String(row.suggestedTime ?? fallback.suggestedTime ?? ""),
        visible: row.visible !== false,
        order: typeof row.order === "number" ? row.order : index + 1,
        externalUrl: typeof row.externalUrl === "string" ? row.externalUrl : "",
        imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : "",
      } satisfies DemoActivityConfig;
    })
    .sort((a, b) => a.order - b.order);

  return {
    demoEnabled: source.demoEnabled ?? source.enabled !== false,
    aiFeedbackEnabled: source.aiFeedbackEnabled === true,
    feedbackProfile:
      source.feedbackProfile === "student_friendly" ||
      source.feedbackProfile === "academic_demo" ||
      source.feedbackProfile === "balanced" ||
      source.feedbackProfile === "strict"
        ? source.feedbackProfile
        : DEFAULT_DEMO_CONFIG.feedbackProfile,
    welcomeTitle: String(source.welcomeTitle ?? DEFAULT_DEMO_CONFIG.welcomeTitle),
    welcomeSubtitle: String(source.welcomeSubtitle ?? DEFAULT_DEMO_CONFIG.welcomeSubtitle),
    heroImageUrl: String(source.heroImageUrl ?? ""),
    activities: normalizedActivities.length ? normalizedActivities : DEFAULT_DEMO_CONFIG.activities,
  };
}

export function parseDemoConfigValue(value: string | null | undefined): DemoConfig {
  if (!value?.trim()) return DEFAULT_DEMO_CONFIG;
  try {
    return normalizeDemoConfig(JSON.parse(value));
  } catch {
    return DEFAULT_DEMO_CONFIG;
  }
}
