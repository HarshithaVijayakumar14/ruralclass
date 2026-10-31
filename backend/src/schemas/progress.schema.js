import { z } from 'zod';

export const createProgressSchema = z.object({
  student_id: z.string().min(1, 'Valid student ID is required'),
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  assessment_type: z.enum(['formative_quiz', 'oral_reading', 'slate_drill', 'teacher_observation', 'activity_check']),
  subject: z.string().min(1, 'Subject is required'),
  skill_tested: z.string().min(1, 'Skill tested is required'),
  score: z.number().min(0).optional(),
  max_score: z.number().min(1).default(100.0),
  priority_level: z.enum(['high', 'medium', 'mastery']).default('medium'),
  observations: z.string().optional(),
  voice_note_transcript: z.string().optional(),
  status: z.enum(['draft', 'needs_review', 'approved']).default('draft'),
  assessment_date: z.string().optional()
});

export const updateProgressSchema = createProgressSchema.partial().omit({ student_id: true, classroom_id: true });

