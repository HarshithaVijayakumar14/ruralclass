import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateMathematicalSchedule, validateTeacherConstraint } from '../src/services/scheduler.service.js';

describe('RuralClass Mathematical Multi-Grade Scheduler', () => {

  test('Strict Single-Teacher Invariant: mathematically guarantees <= 1 teacher-led grade per slot', () => {
    const grades = [2, 3, 5];
    const durationMinutes = 60;
    const schedule = generateMathematicalSchedule({ grades, durationMinutes });

    assert.equal(schedule.feasible, true);
    assert.equal(schedule.collisionFree, true);

    // Verify each rotating slot has strictly <= 1 teacher-led grade
    schedule.blocks.forEach(block => {
      if (block.focusGrade !== 'All Grades') {
        const teacherLed = block.assignments.filter(a => a.mode === 'teacher-led');
        assert.ok(
          teacherLed.length <= 1,
          `Block "${block.title}" violated single-teacher invariant with ${teacherLed.length} teacher-led grades!`
        );
      }
    });
  });

  test('Rejects insufficient duration when requested time cannot fit all grades', () => {
    // 5 grades require at least 5*5 + 10 = 35 minutes
    const schedule = generateMathematicalSchedule({
      grades: [1, 2, 3, 4, 5],
      durationMinutes: 15
    });

    assert.equal(schedule.feasible, false);
    assert.match(schedule.error, /insufficient/i);
    assert.equal(schedule.blocks.length, 0);
  });

  test('Rejects schedule generation when 0 grades are provided', () => {
    const schedule = generateMathematicalSchedule({
      grades: [],
      durationMinutes: 45
    });

    assert.equal(schedule.feasible, false);
    assert.match(schedule.error, /at least one grade/i);
  });

  test('Validates block duration sum equals requested total duration', () => {
    const grades = [2, 4];
    const durationMinutes = 50;
    const schedule = generateMathematicalSchedule({ grades, durationMinutes });

    assert.equal(schedule.feasible, true);
    const sumDuration = schedule.blocks.reduce((acc, b) => acc + b.durationMinutes, 0);
    assert.equal(sumDuration, durationMinutes, 'Block durations must sum exactly to total duration');
  });

  test('Every selected grade receives active assignment in every block', () => {
    const grades = [1, 3, 5];
    const schedule = generateMathematicalSchedule({ grades, durationMinutes: 60 });

    schedule.blocks.forEach(block => {
      const assignedGrades = block.assignments.map(a => a.grade);
      grades.forEach(g => {
        assert.ok(
          assignedGrades.includes(g),
          `Grade ${g} was left unassigned in block ${block.title}`
        );
      });
    });
  });

  test('validateTeacherConstraint detects collision when 2 grades are set to teacher-led simultaneously', () => {
    const invalidBlocks = [
      {
        focusGrade: 'Grade 2',
        assignments: [
          { grade: 2, mode: 'teacher-led' },
          { grade: 4, mode: 'teacher-led' } // COLLISION!
        ]
      }
    ];

    const isCollisionFree = validateTeacherConstraint(invalidBlocks);
    assert.equal(isCollisionFree, false, 'Validator must catch simultaneous teacher-led collision');
  });

});

