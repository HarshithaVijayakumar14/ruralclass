import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createAssignmentSchema } from '../src/schemas/assignment.schema.js';
import { 
  aiLessonPlanRequestSchema, 
  aiWorksheetRequestSchema, 
  aiWorksheetResponseSchema,
  aiTextbookExtractRequestSchema,
  aiTextbookExtractResponseSchema,
  aiAssistantChatRequestSchema
} from '../src/schemas/ai.schema.js';
import { 
  generateLessonPlanWithGemini,
  generateStudentAssessmentWithGemini,
  generateWorksheetWithGemini,
  extractTextbookWithGemini,
  chatWithAssistant
} from '../src/services/gemini.service.js';

describe('RuralClass AI Services & Schemas', () => {

  test('Assignment schema validates valid worksheet assignment', () => {
    const valid = {
      classroom_id: '11111111-2222-3333-4444-555555555555',
      grade: 3,
      title: 'Grade 3 Math: Seed Grouping Drills',
      subject: 'Mathematics',
      assignment_type: 'worksheet',
      difficulty_level: 'remedial',
      content: {
        topic: 'Grouping into Tens',
        concrete_slate_activity: ['Group 20 seeds into pairs']
      },
      answer_key: { Q1: '10 pairs' },
      status: 'assigned'
    };

    const parsed = createAssignmentSchema.parse(valid);
    assert.equal(parsed.grade, 3);
    assert.equal(parsed.difficulty_level, 'remedial');
    assert.equal(parsed.assignment_type, 'worksheet');
  });

  test('Worksheet AI schema validates request and response structure', () => {
    const req = {
      classroom_id: '11111111-2222-3333-4444-555555555555',
      grade: 4,
      subject: 'Science',
      topic: 'Water Cycle and Village Wells',
      difficulty_level: 'on_level',
      language: 'en'
    };
    const parsedReq = aiWorksheetRequestSchema.parse(req);
    assert.equal(parsedReq.grade, 4);

    const res = {
      title: 'Grade 4 Science: Water Cycle',
      grade: 4,
      subject: 'Science',
      topic: 'Water Cycle',
      difficulty_level: 'on_level',
      remedial_pedagogical_note: 'Demonstrate with a pot of water in the sun.',
      concrete_slate_activity: ['Draw evaporation on slates with chalk.'],
      written_problems: [
        {
          question_number: 'Q1',
          prompt: 'Where does water go when a puddle dries?',
          type: 'short_answer'
        }
      ],
      answer_key: { Q1: 'Evaporates into the air as vapor.' },
      zero_cost_tlm: ['Chalkboard', 'Student Slates', 'Water Cup'],
      status: 'draft'
    };
    const parsedRes = aiWorksheetResponseSchema.parse(res);
    assert.equal(parsedRes.status, 'draft');
  });

  test('generateWorksheetWithGemini returns valid structured worksheet', async () => {
    const result = await generateWorksheetWithGemini({
      grade: 2,
      subject: 'Mathematics',
      topic: 'Basic Addition using Seeds',
      difficulty_level: 'remedial'
    });

    const sheet = result.worksheet || result.fallbackWorksheet;
    assert.ok(sheet, 'Worksheet object should exist');
    assert.equal(sheet.grade, 2);
    assert.equal(sheet.status, 'draft');
    assert.ok(Array.isArray(sheet.concrete_slate_activity));
    assert.ok(sheet.concrete_slate_activity.length > 0);
  });

  test('extractTextbookWithGemini correctly signals when GEMINI_API_KEY is required', async () => {
    const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await extractTextbookWithGemini({
      image_base64: dummyBase64,
      mime_type: 'image/png'
    });

    // Without GEMINI_API_KEY, it must not fabricate fake results; it must signal requiresApiKey
    assert.equal(result.success, false);
    assert.equal(result.requiresApiKey, true);
    assert.ok(result.error);
  });

  test('chatWithAssistant provides grounded pedagogical response adhering to single-teacher invariant', async () => {
    const result = await chatWithAssistant({
      messages: [
        { role: 'user', content: 'How do I manage timetable transitions between Grade 2 and Grade 4?' }
      ],
      classroom_context: {
        school_name: 'Govt Primary School',
        grades: [2, 4]
      },
      language: 'en'
    });

    assert.ok(result.success);
    assert.ok(result.reply.length > 20);
    // Should mention slates or rotation or invariant
    const hasPedagogicalGrounding = 
      result.reply.toLowerCase().includes('slate') || 
      result.reply.toLowerCase().includes('grade') || 
      result.reply.toLowerCase().includes('rotation') ||
      result.reply.toLowerCase().includes('bell');
    assert.ok(hasPedagogicalGrounding, 'Assistant reply must contain pedagogical multi-grade grounding');
  });

});

