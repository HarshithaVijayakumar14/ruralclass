import { z } from 'zod';

export const timetableAssignmentSchema = z.object({
  grade: z.number().int().min(1).max(8),
  mode: z.enum(['teacher-led', 'independent', 'peer']),
  activity: z.string().min(1),
  materials: z.array(z.string()).default([])
});

export const createTimetableBlockSchema = z.object({
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  lesson_plan_id: z.string().min(1).optional().nullable(),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  block_index: z.number().int().min(0),
  start_minute: z.number().int().min(0),
  end_minute: z.number().int().min(1),
  duration_minutes: z.number().int().min(1),
  title: z.string().min(1),
  focus_grade: z.string().min(1),
  assignments: z.array(timetableAssignmentSchema),
  is_transition: z.boolean().default(false),
  status: z.enum(['draft', 'needs_review', 'approved']).default('draft')
});

export const updateTimetableBlockSchema = createTimetableBlockSchema.partial().omit({ classroom_id: true });

