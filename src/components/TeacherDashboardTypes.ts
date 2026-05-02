export type PromptRow = {
  id: string;
  prompt_text: string | null;
  assignment_type: AssignmentActivityType | null;
  external_url: string | null;
  class_name: string | null;
  suggested_time: string | null;
  prompt_image_path: string | null;
  prompt_image_url: string | null;
  example_text: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  prompt_assignments?: PromptAssignmentRow[];
};

export type AssignmentResponseMode = "audio" | "video" | "text" | "multiple_choice" | "guided_speaking";
export type AssignmentActivityType = "audio_response" | "video_response" | "text_response" | "external_link" | "guided_speaking" | "multiple_choice";

export type PromptAssignmentRow = {
  id: string;
  prompt_id: string;
  class_name: string;
  is_visible: boolean;
  created_at: string | null;
};

export type SubmissionRow = {
  id: string;
  prompt_id: string | null;
  response_mode: AssignmentResponseMode | null;
  text_response: string | null;
  completion_marked_at: string | null;
  prompt?: {
    assignment_type: AssignmentActivityType | null;
  } | null;
  student_name: string | null;
  prompt_text: string | null;
  audio_path: string | null;
  audio_url: string | null;
  video_path: string | null;
  video_url: string | null;
  status: string | null;
  created_at: string | null;
  feedback_audio_path: string | null;
  feedback_audio_url: string | null;
  feedback_status: string | null;
  feedback_created_at: string | null;
  student_email: string | null;
  student_auth_id: string | null;
  feedback_url: string | null;
  transcript: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  ai_grammar_feedback?: string[] | null;
  ai_improvements?: string[] | null;
  ai_picture_accuracy?: { correct?: string[]; missing?: string[]; incorrect?: string[] } | null;
  teacher_score: number | null;
  teacher_comment: string | null;
  student_code: string | null;
};

export type StudentRow = {
  id: string;
  class_name: string | null;
  student_name: string;
  student_code: string;
  created_at: string | null;
};

export type DraftState = {
  score: number;
  comment: string;
  savingOverride: boolean;
  savingAudio: boolean;
  savedMessage: string;
  error: string;
  teacherBlob: Blob | null;
  teacherPreviewUrl: string;
  isRecordingTeacher: boolean;
  recordingError: string;
};

export type DraftsById = Record<string, DraftState>;
