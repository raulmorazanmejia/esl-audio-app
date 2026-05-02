export type LessonBuilderVersion = 2;

export type LessonBlockKind =
  | "source"
  | "vocabulary"
  | "multiple_choice"
  | "grammar_explanation"
  | "speaking_task"
  | "writing_task"
  | "final_quiz";

export type LessonBlockBase<TKind extends LessonBlockKind, TContent> = {
  id: string;
  kind: TKind;
  title?: string;
  order: number;
  required?: boolean;
  content: TContent;
};

export type SourceBlock = LessonBlockBase<
  "source",
  {
    sourceType: "video_url" | "audio_url" | "image" | "text" | "pdf_link";
    label?: string;
    url?: string;
    storagePath?: string;
    text?: string;
  }
>;

export type VocabularyItem =
  | { mode: "matching_pairs"; left: string; right: string }
  | { mode: "word_definition"; word: string; definition: string }
  | { mode: "word_image"; word: string; imageUrl: string }
  | { mode: "sentence_meaning"; sentence: string; meaning: string };

export type VocabularyBlock = LessonBlockBase<
  "vocabulary",
  {
    instructions?: string;
    items: VocabularyItem[];
  }
>;

export type MultipleChoiceBlock = LessonBlockBase<
  "multiple_choice",
  {
    question: string;
    choices: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }
>;

export type GrammarExplanationBlock = LessonBlockBase<
  "grammar_explanation",
  {
    heading: string;
    explanation: string;
    examples: string[];
    referenceUrl?: string;
  }
>;

export type SpeakingTaskBlock = LessonBlockBase<
  "speaking_task",
  {
    prompt: string;
    suggestedTimeSec?: number;
    contextSourceBlockId?: string;
    contextImageUrl?: string;
    aiFeedbackEnabled: boolean;
  }
>;

export type WritingTaskBlock = LessonBlockBase<
  "writing_task",
  {
    prompt: string;
    modelAnswer?: string;
    allowAiFeedback?: boolean;
  }
>;

export type FinalQuizQuestion = {
  id: string;
  type: "multiple_choice" | "short_answer";
  prompt: string;
  choices?: string[];
  correctAnswer?: string;
};

export type FinalQuizBlock = LessonBlockBase<
  "final_quiz",
  {
    questions: FinalQuizQuestion[];
    showScoreSummary: boolean;
  }
>;

export type LessonBlock =
  | SourceBlock
  | VocabularyBlock
  | MultipleChoiceBlock
  | GrammarExplanationBlock
  | SpeakingTaskBlock
  | WritingTaskBlock
  | FinalQuizBlock;

export type LessonBlocksPayload = {
  schemaVersion: LessonBuilderVersion;
  blocks: LessonBlock[];
};

export type LegacyLessonPayload = {
  prompt_text?: string | null;
  external_url?: string | null;
  suggested_time?: string | null;
  example_text?: string | null;
  prompt_image_url?: string | null;
};

export function migrateLegacyLessonToBlocks(legacy: LegacyLessonPayload): LessonBlocksPayload {
  const blocks: LessonBlock[] = [];

  if (legacy.prompt_text?.trim()) {
    blocks.push({
      id: "legacy-speaking-task",
      kind: "speaking_task",
      order: 0,
      required: true,
      content: {
        prompt: legacy.prompt_text,
        suggestedTimeSec: undefined,
        contextImageUrl: legacy.prompt_image_url ?? undefined,
        aiFeedbackEnabled: true,
      },
    });
  }

  if (legacy.external_url?.trim()) {
    blocks.unshift({
      id: "legacy-source-link",
      kind: "source",
      order: 0,
      content: {
        sourceType: "pdf_link",
        url: legacy.external_url,
        label: "Legacy resource",
      },
    });
  }

  return {
    schemaVersion: 2,
    blocks,
  };
}
