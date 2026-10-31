import { z } from 'zod';

export const createLessonPlanSchema = z.object({
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  grades: z.array(z.number().int().min(1).max(8)).min(1, 'At least one grade is required'),
  duration_minutes: z.number().int().min(15).max(360).default(60),
  planning_mode: z.enum(['common_theme', 'split_topics']).default('common_theme'),
  status: z.enum(['draft', 'needs_review', 'approved']).default('draft'),
  content: z.record(z.any()),
  zero_cost_tlm: z.array(z.string()).default([])
});

export const updateLessonPlanSchema = createLessonPlanSchema.partial().omit({ classroom_id: true });

