export type PromptRow = {
  id: string;
  prompt_text: string | null;
  class_name: string | null;
  suggested_time: string | null;
  prompt_image_path: string | null;
  prompt_image_url: string | null;
  example_text: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  prompt_assignments?: PromptAssignmentRow[];
};

export type PromptAssignmentRow = {
  id: string;
  prompt_id: string;
  class_name: string;
  is_visible: boolean;
  created_at: string | null;
};

export type SubmissionRow = {
  id: string;
  student_name: string | null;
  prompt_text: string | null;
  audio_path: string | null;
  audio_url: string | null;
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

export type ClassVideoSettingRow = {
  class_name: string;
  project_video_updates_enabled: boolean | null;
};

export type ProjectVideoSubmissionRow = {
  id: string;
  student_name: string | null;
  student_code: string | null;
  class_name: string | null;
  video_path: string | null;
  video_url: string | null;
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
