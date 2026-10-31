import { z } from 'zod';

// ==========================================
// 1. LESSON PLAN AI SCHEMAS
// ==========================================
export const aiLessonPlanRequestSchema = z.object({
  classroom_id: z.string().min(1, 'Classroom ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  grades: z.array(z.number().int().min(1).max(8)).min(1, 'At least one grade is required'),
  duration_minutes: z.number().int().min(15).max(360).default(60),
  planning_mode: z.enum(['common_theme', 'split_topics']).default('common_theme'),
  available_materials: z.array(z.string()).default(['Chalkboard', 'Student Slates & Chalk', 'Tamarind Seeds / Pebbles']),
  teacher_priorities: z.string().optional()
});

export const aiGradePlanSchema = z.object({
  grade: z.number().int(),
  learning_objective: z.string(),
  key_concept: z.string(),
  direct_instruction: z.string(),
  independent_activity: z.string(),
  peer_learning_activity: z.string(),
  zero_cost_tlm: z.array(z.string()),
  formative_check: z.array(z.string())
});

export const aiRotationScheduleItemSchema = z.object({
  time_range: z.string(),
  duration_minutes: z.number().int(),
  teacher_focus_grade: z.string(), // At most 1 grade or "All Grades"
  student_assignments: z.array(z.object({
    grade: z.number().int(),
    mode: z.enum(['teacher-led', 'independent', 'peer']),
    task: z.string()
  }))
});

export const aiLessonPlanResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  common_theme: z.string(),
  grade_plans: z.array(aiGradePlanSchema),
  rotation_schedule: z.array(aiRotationScheduleItemSchema),
  zero_cost_tlm: z.array(z.string()),
  remedial_suggestions: z.array(z.object({
    grade: z.number().int(),
    recommendation: z.string()
  })),
  status: z.literal('draft')
});

// ==========================================
// 2. STUDENT PROGRESS & ASSESSMENT AI SCHEMAS
// ==========================================
export const aiProgressAssessmentRequestSchema = z.object({
  classroom_id: z.string().min(1),
  student_id: z.string().min(1),
  student_name: z.string().min(1),
  grade: z.number().int().min(1).max(8),
  subject: z.string().min(1),
  skill_tested: z.string().min(1),
  score: z.number().min(0).max(100).optional(),
  voice_note_transcript: z.string().optional(),
  teacher_observations: z.string().optional()
});

export const aiProgressAssessmentResponseSchema = z.object({
  priority_level: z.enum(['high', 'medium', 'mastery']),
  grounded_evidence: z.string(),
  recommended_action: z.string(),
  slate_drill_exercises: z.array(z.string()),
  peer_pairing_suggestion: z.string(),
  status: z.literal('needs_review')
});

// ==========================================
// 3. DIFFERENTIATED WORKSHEET AI SCHEMAS
// ==========================================
export const aiWorksheetRequestSchema = z.object({
  classroom_id: z.string().min(1).optional(),
  grade: z.number().int().min(1).max(8),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty_level: z.enum(['remedial', 'on_level', 'extension']).default('on_level'),
  language: z.string().default('en')
});

export const aiWorksheetResponseSchema = z.object({
  title: z.string(),
  grade: z.number().int(),
  subject: z.string(),
  topic: z.string(),
  difficulty_level: z.enum(['remedial', 'on_level', 'extension']),
  remedial_pedagogical_note: z.string().optional(),
  concrete_slate_activity: z.array(z.string()),
  written_problems: z.array(z.object({
    question_number: z.string(),
    prompt: z.string(),
    type: z.enum(['calculation', 'word_problem', 'diagram', 'short_answer'])
  })),
  answer_key: z.record(z.string()),
  zero_cost_tlm: z.array(z.string()),
  status: z.literal('draft')
});

// ==========================================
// 4. TEXTBOOK & IMAGE OCR AI SCHEMAS
// ==========================================
export const aiTextbookExtractRequestSchema = z.object({
  image_base64: z.string().min(1, 'Image data is required'),
  mime_type: z.string().default('image/jpeg'),
  classroom_id: z.string().min(1).optional()
});

export const aiTextbookExtractResponseSchema = z.object({
  extracted_topic: z.string(),
  suggested_subject: z.string(),
  suggested_grades: z.array(z.number().int()),
  extracted_passage: z.string(),
  key_concepts: z.array(z.string()),
  zero_cost_tlm_ideas: z.array(z.string())
});

// ==========================================
// 5. AI ASSISTANT CHAT SCHEMAS
// ==========================================
export const aiAssistantChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1)
  })).min(1),
  classroom_context: z.object({
    school_name: z.string().optional().nullable(),
    grades: z.array(z.number().int()).optional().nullable(),
    subjects: z.array(z.string()).optional().nullable()
  }).optional().nullable(),
  language: z.string().default('en')
});
