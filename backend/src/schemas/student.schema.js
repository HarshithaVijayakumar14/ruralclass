import { z } from 'zod';

export const createStudentSchema = z.object({
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  name: z.string().min(1, 'Student name is required'),
  grade: z.number().int().min(1).max(8, 'Grade must be between 1 and 8'),
  roll_number: z.string().optional(),
  attendance_status: z.enum(['present', 'absent', 'late', 'excused']).default('present'),
  reading_level: z.enum(['emerging', 'developing', 'fluent']).default('developing'),
  math_level: z.enum(['emerging', 'developing', 'fluent']).default('developing'),
  overall_competency: z.number().min(0).max(100).default(50.0),
  notes: z.string().optional()
});

export const updateStudentSchema = createStudentSchema.partial().omit({ classroom_id: true });

export const bulkCreateStudentsSchema = z.object({
  classroom_id: z.string().min(1, 'Valid classroom ID is required'),
  students: z.array(z.object({
    name: z.string().min(1),
    grade: z.number().int().min(1).max(8),
    roll_number: z.string().optional(),
    attendance_status: z.enum(['present', 'absent', 'late', 'excused']).default('present'),
    reading_level: z.enum(['emerging', 'developing', 'fluent']).default('developing'),
    math_level: z.enum(['emerging', 'developing', 'fluent']).default('developing'),
    overall_competency: z.number().min(0).max(100).default(50.0),
    notes: z.string().optional()
  })).min(1, 'At least one student is required')
});

