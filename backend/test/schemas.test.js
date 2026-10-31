import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomSchema } from '../src/schemas/classroom.schema.js';
import { createStudentSchema } from '../src/schemas/student.schema.js';
import { createProgressSchema } from '../src/schemas/progress.schema.js';

describe('RuralClass Zod Schema Validation', () => {

  test('Classroom schema validates valid multi-grade payload', () => {
    const valid = {
      name: 'Govt Higher Primary Class 1-3',
      school_name: 'Govt Higher Primary School',
      grades: [1, 2, 3],
      daily_minutes: 60,
      period_count: 6
    };
    const parsed = createClassroomSchema.parse(valid);
    assert.equal(parsed.name, valid.name);
    assert.deepEqual(parsed.grades, [1, 2, 3]);
  });

  test('Classroom schema rejects daily_minutes < 15 or > 360', () => {
    assert.throws(() => {
      createClassroomSchema.parse({
        name: 'Invalid Room',
        grades: [1, 2],
        daily_minutes: 10 // Too short!
      });
    });

    assert.throws(() => {
      createClassroomSchema.parse({
        name: 'Invalid Room',
        grades: [1, 2],
        daily_minutes: 500 // Too long!
      });
    });
  });

  test('Student schema validates valid student payload', () => {
    const validStudent = {
      classroom_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      name: 'Ananya M.',
      grade: 3,
      reading_level: 'developing',
      math_level: 'fluent'
    };
    const parsed = createStudentSchema.parse(validStudent);
    assert.equal(parsed.name, 'Ananya M.');
    assert.equal(parsed.grade, 3);
  });

  test('Student schema rejects invalid grade (<1 or >8)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        classroom_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        name: 'Invalid Grade',
        grade: 12 // Outside 1-8 primary range
      });
    });
  });

  test('Progress assessment schema validates formative quiz score and priority benchmarks', () => {
    const validProgress = {
      student_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      classroom_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      assessment_type: 'slate_drill',
      subject: 'Mathematics',
      skill_tested: 'Regrouping using pebbles',
      score: 35,
      max_score: 100,
      priority_level: 'high'
    };
    const parsed = createProgressSchema.parse(validProgress);
    assert.equal(parsed.score, 35);
    assert.equal(parsed.priority_level, 'high');
  });

});

