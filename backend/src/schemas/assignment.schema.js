import { z } from 'zod';

export const createAssignmentSchema = z.object({
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  lesson_plan_id: z.string().min(1).optional().nullable(),
  grade: z.number().int().min(1).max(8),
  title: z.string().min(2).max(200),
  subject: z.string().min(1).max(100),
  assignment_type: z.enum(['classwork', 'homework', 'worksheet', 'quiz']),
  difficulty_level: z.enum(['remedial', 'on_level', 'extension']).default('on_level'),
  content: z.record(z.any()), // JSONB structure for questions, slate exercises, etc.
  answer_key: z.record(z.any()).optional().nullable(),
  status: z.enum(['assigned', 'completed', 'needs_help']).default('assigned'),
  assigned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable()
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

