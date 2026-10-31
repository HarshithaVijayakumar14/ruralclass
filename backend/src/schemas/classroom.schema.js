import { z } from 'zod';

export const createClassroomSchema = z.object({
  name: z.string().min(2, 'Classroom name must be at least 2 characters'),
  school_name: z.string().optional().default('Govt Higher Primary School'),
  district: z.string().optional(),
  state: z.string().optional(),
  grades: z.array(z.number().int().min(1).max(8)).min(1, 'At least one grade is required'),
  subjects: z.array(z.string()).default(['Environmental Studies (EVS)', 'Mathematics', 'Language']),
  daily_minutes: z.number().int().min(15).max(360).default(60),
  period_count: z.number().int().min(1).max(12).default(6),
  break_duration: z.number().int().min(0).max(60).default(10),
  materials: z.array(z.string()).default(['Chalkboard', 'Student Slates & Chalk', 'Tamarind Seeds / Pebbles', 'Textbooks']),
  language: z.string().default('en')
});

export const updateClassroomSchema = createClassroomSchema.partial();
