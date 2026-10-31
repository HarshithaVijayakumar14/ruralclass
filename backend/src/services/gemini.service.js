import { GoogleGenAI } from '@google/genai';
import { 
  aiLessonPlanResponseSchema, 
  aiProgressAssessmentResponseSchema,
  aiWorksheetResponseSchema,
  aiTextbookExtractResponseSchema 
} from '../schemas/ai.schema.js';
import { generateMathematicalSchedule } from './scheduler.service.js';
import dotenv from 'dotenv';
dotenv.config();

let apiKey = process.env.GEMINI_API_KEY;
// User requested GEMINI_MODEL defaulting to gemini-2.5-flash or modern gemini-3.8-flash
const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let geminiClient = null;

export const isGeminiConfigured = () => Boolean(geminiClient);

export const configureGeminiKey = (newKey) => {
  if (newKey && newKey.trim() && newKey.trim() !== 'your_gemini_api_key_here') {
    apiKey = newKey.trim();
    geminiClient = new GoogleGenAI({ apiKey });
    process.env.GEMINI_API_KEY = apiKey;
    console.log(`[Gemini] Key updated dynamically and SDK initialized with model: ${defaultModel}`);
    return true;
  }
  return false;
};

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    geminiClient = new GoogleGenAI({ apiKey });
    console.log(`[Gemini] Initialized SDK with model: ${defaultModel}`);
  } catch (err) {
    console.warn('[Gemini] Initialization error:', err.message);
  }
} else {
  console.warn('[Gemini] Warning: GEMINI_API_KEY is not set in backend/.env. AI calls will provide rule-based pedagogical fallbacks.');
}

/**
 * Generate Structured Multi-Grade Lesson Plan
 */
export const generateLessonPlanWithGemini = async (planRequest) => {
  const { classroom_id, subject, topic, grades, duration_minutes, planning_mode, available_materials, teacher_priorities } = planRequest;

  // Generate deterministic mathematical rotation schedule
  const mathematicalSchedule = generateMathematicalSchedule({
    grades,
    durationMinutes: duration_minutes,
    topic,
    planningMode: planning_mode,
    materials: available_materials
  });

  // If Gemini client is not configured, immediately return grounded rule-based draft
  if (!geminiClient) {
    const fallbackPlan = createRuleBasedLessonPlanFallback(planRequest, mathematicalSchedule, 'GEMINI_API_KEY is not configured in backend/.env');
    return {
      success: true,
      source: 'rule-based',
      plan: fallbackPlan,
      fallbackPlan
    };
  }

  const prompt = `
You are an expert rural primary school pedagogical specialist assisting a single teacher managing a multi-grade classroom with Grades ${grades.join(', ')} simultaneously in one room.
The teacher has ${duration_minutes} minutes for ${subject} on the topic "${topic}".
Planning mode: ${planning_mode} (${planning_mode === 'split_topics' ? 'Different topics or specialized grade skills for each grade' : 'Common theme across all grades with differentiated grade objectives'}).
Available zero-cost materials: ${available_materials.join(', ')}.
Teacher special priorities: ${teacher_priorities || 'None specified'}.

STRICT MULTI-GRADE INSTRUCTIONAL RULES:
1. One teacher cannot teach multiple grades simultaneously. At any time slot, at most ONE grade receives direct Teacher-Led instruction.
2. While the teacher instructs one grade, all other grades MUST be actively engaged in Independent Practice (slates, workbooks) or Peer Learning (buddy quizzing, seed counting).
3. All Teaching-Learning Materials (TLM) must be zero-cost local items (chalkboard, slates, tamarind seeds, pebbles, leaves, chart paper). No expensive tech.
4. AI output is always a DRAFT and requires explicit teacher approval. Set status strictly to "draft".
5. Return strictly valid JSON matching the required schema.

Required JSON structure:
{
  "title": "Clear concise plan title",
  "summary": "Brief 2-sentence summary of the multi-grade lesson",
  "common_theme": "The core uniting concept across all grades",
  "grade_plans": [
    {
      "grade": 2,
      "learning_objective": "Specific observable objective for Grade 2",
      "key_concept": "Core concept simplified for this level",
      "direct_instruction": "What the teacher models and demonstrates directly",
      "independent_activity": "What children do on slates or in workbooks while teacher is with another grade",
      "peer_learning_activity": "Pair activity with buddy using seeds/pebbles",
      "zero_cost_tlm": ["Slates", "Tamarind seeds"],
      "formative_check": ["Quick question 1", "Quick question 2"]
    }
  ],
  "rotation_schedule": [
    {
      "time_range": "0-10 min",
      "duration_minutes": 10,
      "teacher_focus_grade": "All Grades",
      "student_assignments": [
        { "grade": 2, "mode": "teacher-led", "task": "Joint opening question" }
      ]
    }
  ],
  "zero_cost_tlm": ["Chalkboard", "Slates", "Seeds", "Leaves"],
  "remedial_suggestions": [
    { "grade": 2, "recommendation": "Concrete grouping drill with seeds for students struggling with counting" }
  ],
  "status": "draft"
}
`;

  // Attempt 1 with Gemini API
  try {
    const rawResult = await callGeminiInteractionsOrContent(prompt, aiLessonPlanResponseSchema);
    const parsed = aiLessonPlanResponseSchema.parse(rawResult);
    return {
      success: true,
      source: 'gemini-ai',
      plan: parsed
    };
  } catch (err1) {
    console.warn('[Gemini] Attempt 1 failed:', err1.message, '- Retrying once...');
    // Retry once as mandated by Gemini rules
    try {
      const rawResult2 = await callGeminiInteractionsOrContent(prompt + '\n\nIMPORTANT: Previous attempt had formatting issues. Return ONLY clean valid JSON with no markdown formatting.', aiLessonPlanResponseSchema);
      const parsed2 = aiLessonPlanResponseSchema.parse(rawResult2);
      return {
        success: true,
        source: 'gemini-ai',
        plan: parsed2
      };
    } catch (err2) {
      console.error('[Gemini] Attempt 2 failed:', err2.message);
      // Return clear error, preserve teacher input, and return rule-based fallback
      return {
        success: false,
        error: 'Gemini API call failed after 2 attempts: ' + err2.message,
        preservedInput: planRequest,
        fallbackPlan: createRuleBasedLessonPlanFallback(planRequest, mathematicalSchedule, err2.message)
      };
    }
  }
};

/**
 * Generate AI Student Progress & Remedial Assessment
 */
export const generateStudentAssessmentWithGemini = async (assessmentRequest) => {
  const { student_name, grade, subject, skill_tested, score, voice_note_transcript, teacher_observations } = assessmentRequest;

  if (!geminiClient) {
    const fallbackAssessment = createRuleBasedAssessmentFallback(assessmentRequest, 'GEMINI_API_KEY is not configured in backend/.env');
    return {
      success: true,
      source: 'rule-based',
      assessment: fallbackAssessment,
      fallbackAssessment
    };
  }

  const prompt = `
You are an expert pedagogical diagnostician for rural multi-grade classrooms.
Analyze the following student assessment data:
Student: ${student_name} (Grade ${grade})
Subject: ${subject}
Skill Tested: ${skill_tested}
Score: ${score !== undefined ? `${score}/100` : 'Not scored (observation only)'}
Teacher Voice Note Transcript: "${voice_note_transcript || 'None'}"
Teacher Observations: "${teacher_observations || 'None'}"

RULES:
1. Provide transparent, grounded benchmarks:
   - < 40%: High Priority (Requires concrete manipulative drills + daily slate practice with peer mentor).
   - 40% - 59%: Medium Priority (Developing understanding; guided error correction).
   - >= 60%: Foundational Mastery (Consolidating proficiency; peer mentor).
2. Avoid medical or clinical labeling. Strictly focus on pedagogical next steps with zero-cost materials (slates, seeds, pebbles).
3. The assessment is a DRAFT that requires teacher approval. Set status strictly to "needs_review".
4. Return strictly valid JSON matching this schema:
{
  "priority_level": "high" | "medium" | "mastery",
  "grounded_evidence": "Clear explanation citing the score and observation directly",
  "recommended_action": "Actionable zero-cost remedial step",
  "slate_drill_exercises": ["Slate drill 1", "Slate drill 2", "Slate drill 3"],
  "peer_pairing_suggestion": "Suggested buddy pairing",
  "status": "needs_review"
}
`;

  try {
    const rawResult = await callGeminiInteractionsOrContent(prompt, aiProgressAssessmentResponseSchema);
    const parsed = aiProgressAssessmentResponseSchema.parse(rawResult);
    return {
      success: true,
      source: 'gemini-ai',
      assessment: parsed
    };
  } catch (err1) {
    console.warn('[Gemini] Assessment attempt 1 failed:', err1.message, '- Retrying once...');
    try {
      const rawResult2 = await callGeminiInteractionsOrContent(prompt + '\n\nReturn ONLY valid JSON.', aiProgressAssessmentResponseSchema);
      const parsed2 = aiProgressAssessmentResponseSchema.parse(rawResult2);
      return {
        success: true,
        source: 'gemini-ai',
        assessment: parsed2
      };
    } catch (err2) {
      console.error('[Gemini] Assessment attempt 2 failed:', err2.message);
      return {
        success: false,
        error: 'Gemini assessment failed after 2 attempts: ' + err2.message,
        preservedInput: assessmentRequest,
        fallbackAssessment: createRuleBasedAssessmentFallback(assessmentRequest, err2.message)
      };
    }
  }
};

/**
 * Generate Differentiated Worksheet / Assignment
 */
export const generateWorksheetWithGemini = async (worksheetRequest) => {
  const { grade, subject, topic, difficulty_level, language = 'en' } = worksheetRequest;

  if (!geminiClient) {
    const fallbackWorksheet = createRuleBasedWorksheetFallback(worksheetRequest, 'GEMINI_API_KEY is not configured in backend/.env');
    return {
      success: true,
      source: 'rule-based',
      worksheet: fallbackWorksheet,
      fallbackWorksheet
    };
  }

  const prompt = `
You are an expert curriculum developer for rural Indian multi-grade schools (Grades 1-8).
Generate a differentiated, zero-cost printable worksheet for:
Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Difficulty Level: ${difficulty_level} ('remedial' = concrete manipulatives & slate drills, 'on_level' = standard curriculum practice, 'extension' = critical thinking challenge).
Language: ${language}.

STRICT RULES:
1. Always include concrete slate activities utilizing zero-cost rural items (tamarind seeds, pebbles, twigs, slates).
2. Written questions must have clean numbers and rural context (e.g. market, harvest, domestic animals, village well).
3. Status must strictly be "draft".
4. Return strictly valid JSON matching this schema:
{
  "title": "Clear worksheet title",
  "grade": ${grade},
  "subject": "${subject}",
  "topic": "${topic}",
  "difficulty_level": "${difficulty_level}",
  "remedial_pedagogical_note": "Pedagogical guidance note for teacher",
  "concrete_slate_activity": [
    "Concrete step 1 (using seeds/slates)",
    "Concrete step 2"
  ],
  "written_problems": [
    {
      "question_number": "Q1",
      "prompt": "Clear question text",
      "type": "calculation" | "word_problem" | "diagram" | "short_answer"
    }
  ],
  "answer_key": {
    "Q1": "Exact solution"
  },
  "zero_cost_tlm": ["Slates", "Tamarind seeds", "Chalkboard"],
  "status": "draft"
}
`;

  try {
    const rawResult = await callGeminiInteractionsOrContent(prompt, aiWorksheetResponseSchema);
    const parsed = aiWorksheetResponseSchema.parse(rawResult);
    return {
      success: true,
      source: 'gemini-ai',
      worksheet: parsed
    };
  } catch (err1) {
    console.warn('[Gemini] Worksheet attempt 1 failed:', err1.message, '- Retrying once...');
    try {
      const rawResult2 = await callGeminiInteractionsOrContent(prompt + '\n\nReturn ONLY valid JSON.', aiWorksheetResponseSchema);
      const parsed2 = aiWorksheetResponseSchema.parse(rawResult2);
      return {
        success: true,
        source: 'gemini-ai',
        worksheet: parsed2
      };
    } catch (err2) {
      console.error('[Gemini] Worksheet attempt 2 failed:', err2.message);
      return {
        success: false,
        error: 'Gemini worksheet generation failed: ' + err2.message,
        preservedInput: worksheetRequest,
        fallbackWorksheet: createRuleBasedWorksheetFallback(worksheetRequest, err2.message)
      };
    }
  }
};

/**
 * Extract Textbook Content using Gemini Multimodal Vision API
 */
export const extractTextbookWithGemini = async (extractRequest) => {
  const { image_base64, mime_type = 'image/jpeg' } = extractRequest;

  if (!geminiClient) {
    return {
      success: false,
      requiresApiKey: true,
      error: 'Google Gemini API key is not configured. Multimodal OCR requires GEMINI_API_KEY to be set in backend/.env.'
    };
  }

  const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `
Examine this textbook page or classroom blackboard photograph from an Indian school.
Analyze the visible text, diagrams, and educational content.
Extract the main topic, the most relevant subject, suggested grades (from 1 to 8), a concise extracted passage, core concepts, and zero-cost Teaching Learning Material (TLM) ideas suitable for a rural multi-grade classroom.

Return ONLY valid JSON matching this structure:
{
  "extracted_topic": "Concise main topic title",
  "suggested_subject": "e.g. Environmental Studies (EVS), Mathematics, Science, Language",
  "suggested_grades": [2, 3],
  "extracted_passage": "Key 2-3 sentence passage or core problem visible on the page",
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
  "zero_cost_tlm_ideas": ["Chalkboard sketch", "Leaves and seeds", "Student slate drill"]
}
`;

  try {
    const response = await geminiClient.models.generateContent({
      model: defaultModel,
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mime_type || 'image/jpeg'
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text || '';
    const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = aiTextbookExtractResponseSchema.parse(JSON.parse(cleaned));
    return {
      success: true,
      source: 'gemini-vision',
      data: parsed
    };
  } catch (err1) {
    console.warn('[Gemini Vision] Multimodal attempt failed:', err1.message);
    return {
      success: false,
      error: 'Gemini Vision extraction failed: ' + err1.message,
      fallbackData: createRuleBasedTextbookFallback(extractRequest, err1.message)
    };
  }
};

/**
 * Multi-Turn AI Pedagogical Assistant Chat
 */
export const chatWithAssistant = async (chatRequest) => {
  const { messages, classroom_context, language = 'en' } = chatRequest;

  const systemInstruction = `
You are the RuralClass Pedagogical Teaching Companion, an expert AI mentor supporting teachers in rural Indian schools who teach multiple grades (Grades 1–8) simultaneously in a single classroom.

CORE CONSTRAINTS & TEACHING PHILOSOPHY:
1. Strict Single-Teacher Invariant: One teacher cannot instruct two grades at once. At any given minute, at most 1 grade receives direct Teacher-Led instruction. All other grades MUST be on Independent Slate Practice or Peer Collaboration.
2. Zero-Cost TLM: All activities rely on student slates, chalkboard, tamarind seeds, pebbles, twigs, leaves, and textbooks. Never propose expensive lab equipment, tablets, or color printouts.
3. Grounding & Transparency: Never fabricate facts or label children clinically.
4. Response Tone: Respectful, encouraging, concise, practical, and culturally aware of rural India.
5. Classroom Context: ${classroom_context ? JSON.stringify(classroom_context) : 'Multi-grade classroom (Grades 1-5)'}.
6. Preferred Language: ${language}.
`;

  if (!geminiClient) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return {
      success: true,
      source: 'rule-based',
      reply: generateAssistantRuleBasedReply(lastUserMsg, classroom_context)
    };
  }

  try {
    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await geminiClient.models.generateContent({
      model: defaultModel,
      contents: formattedContents,
      config: {
        systemInstruction
      }
    });

    return {
      success: true,
      source: 'gemini-chat',
      reply: response.text || 'I am ready to help you plan your multi-grade lessons and zero-cost activities.'
    };
  } catch (err) {
    console.warn('[Gemini Chat] Chat failed:', err.message);
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return {
      success: true,
      source: 'rule-based-fallback',
      reply: generateAssistantRuleBasedReply(lastUserMsg, classroom_context)
    };
  }
};

/**
 * Helper to call Gemini Interactions API with fallback to generateContent
 */
async function callGeminiInteractionsOrContent(prompt, zodSchema) {
  let jsonText = '';

  // 1. Try modern Interactions API if available
  if (geminiClient?.interactions?.create) {
    try {
      const interaction = await geminiClient.interactions.create({
        model: defaultModel,
        input: prompt,
        response_format: {
          type: 'text',
          mime_type: 'application/json'
        }
      });
      jsonText = interaction.output_text || '';
    } catch (interactErr) {
      // Fallback to models.generateContent if interactions throws
      const response = await geminiClient.models.generateContent({
        model: defaultModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      jsonText = response.text || '';
    }
  } else if (geminiClient?.models?.generateContent) {
    const response = await geminiClient.models.generateContent({
      model: defaultModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    jsonText = response.text || '';
  } else {
    throw new Error('Gemini SDK client methods unavailable');
  }

  // Clean JSON string (strip markdown code blocks if any)
  const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Rule-based fallback generator for Lesson Plans (preserves teacher input)
 */
export const createRuleBasedLessonPlanFallback = (planRequest, mathematicalSchedule, reason = '') => {
  const { topic, subject, grades, duration_minutes, planning_mode, available_materials } = planRequest;

  return {
    title: `Multi-Grade ${subject}: ${topic} (Pedagogical Rule-Based Draft)`,
    summary: `Structured ${duration_minutes}-minute multi-grade plan for Grades ${grades.join(', ')} on "${topic}" using zero-cost rural TLM.`,
    common_theme: `Foundational concepts of ${topic} explored through observation, slate work, and peer collaboration.`,
    grade_plans: grades.map(g => ({
      grade: g,
      learning_objective: `Grade ${g} students understand key age-appropriate foundations of ${topic} through concrete manipulatives.`,
      key_concept: `Essential grade-level core principles of ${topic}.`,
      direct_instruction: `Teacher demonstrates ${topic} concepts using chalkboard sketches and real-world rural specimens.`,
      independent_activity: `Students copy and complete 3 slate practice drills based on ${topic}.`,
      peer_learning_activity: `Partner review using ${available_materials[1] || 'pebbles/seeds'} to test comprehension.`,
      zero_cost_tlm: available_materials.slice(0, 3),
      formative_check: [
        `Identify 1 key fact about ${topic} on your slate`,
        `Solve the sample question written on the left side of chalkboard`
      ]
    })),
    rotation_schedule: mathematicalSchedule.blocks.map(b => ({
      time_range: `${b.startMinute}–${b.endMinute} min`,
      duration_minutes: b.durationMinutes,
      teacher_focus_grade: b.focusGrade,
      student_assignments: b.assignments.map(a => ({
        grade: a.grade,
        mode: a.mode,
        task: a.activity
      }))
    })),
    zero_cost_tlm: available_materials,
    remedial_suggestions: grades.map(g => ({
      grade: g,
      recommendation: `Provide extra slate diagramming and pair struggling students with a peer mentor.`
    })),
    status: 'draft',
    note: reason ? `Generated via deterministic pedagogical rules because: ${reason}` : undefined
  };
};

/**
 * Rule-based fallback for Student Progress Assessment
 */
export const createRuleBasedAssessmentFallback = (assessmentRequest, reason = '') => {
  const { student_name, grade, subject, skill_tested, score = 50, voice_note_transcript, teacher_observations } = assessmentRequest;

  let priority = 'medium';
  if (score < 40) priority = 'high';
  else if (score >= 60) priority = 'mastery';

  return {
    priority_level: priority,
    grounded_evidence: `Grounded evidence: Student scored ${score}% on "${skill_tested}" (${subject}). Observations noted: "${teacher_observations || voice_note_transcript || 'Routine formative assessment check'}".`,
    recommended_action: priority === 'high'
      ? 'Intensive concrete manipulative drills (tamarind seeds / pebbles) + daily 10-minute slate practice with a peer mentor.'
      : priority === 'medium'
        ? 'Guided error review on chalkboard and partner check exercises.'
        : 'Foundational mastery achieved. Assign student as a peer buddy mentor during group rotations.',
    slate_drill_exercises: [
      `Slate Exercise 1: Fundamental practice on ${skill_tested}`,
      `Slate Exercise 2: Self-check comparison with partner`,
      `Slate Exercise 3: Application question from textbook page`
    ],
    peer_pairing_suggestion: `Pair with a Grade ${grade} peer buddy for 5-minute daily slate review.`,
    status: 'needs_review',
    note: reason ? `Generated via rule-based benchmark heuristics: ${reason}` : undefined
  };
};

/**
 * Rule-based fallback for Differentiated Worksheets
 */
export const createRuleBasedWorksheetFallback = (worksheetRequest, reason = '') => {
  const { grade, subject, topic, difficulty_level } = worksheetRequest;

  const isRemedial = difficulty_level === 'remedial';
  const isExtension = difficulty_level === 'extension';

  return {
    title: `Grade ${grade} ${subject}: ${topic} (${difficulty_level.toUpperCase()})`,
    grade,
    subject,
    topic,
    difficulty_level,
    remedial_pedagogical_note: isRemedial 
      ? 'Use concrete manipulatives (tamarind seeds, pebbles, slates) to model groupings before writing answers.'
      : isExtension
        ? 'Encourage peer explanation and multi-step reasoning.'
        : 'Standard on-level foundational practice.',
    concrete_slate_activity: [
      `Slate Step 1: Arrange ${isRemedial ? '10' : '20'} seeds or pebbles on your slate to model ${topic}.`,
      `Slate Step 2: Draw your seed arrangement on your slate with chalk and show your bench partner.`,
      `Slate Step 3: Complete the matching challenge written on the chalkboard.`
    ],
    written_problems: [
      {
        question_number: 'Q1',
        prompt: isRemedial 
          ? `Solve using your seeds: Draw 3 groups of 2 pebbles on your slate. How many total?`
          : `Calculate: Find the sum and write the place value of the tens digit.`,
        type: 'calculation'
      },
      {
        question_number: 'Q2',
        prompt: `Word Problem: A farmer collects 12 coconuts in the morning and 15 in the evening. How many coconuts were collected in all?`,
        type: 'word_problem'
      },
      {
        question_number: 'Q3',
        prompt: `Diagram Challenge: Draw a diagram representing ${topic} and label two key parts.`,
        type: 'diagram'
      }
    ],
    answer_key: {
      "Q1": isRemedial ? "6 total pebbles (3 groups of 2)" : "Verified tens place value calculation",
      "Q2": "27 coconuts (12 + 15 = 27)",
      "Q3": "Teacher visual check of slate diagram labels"
    },
    zero_cost_tlm: ["Student Slates & Chalk", "Tamarind Seeds / Pebbles", "Chalkboard"],
    status: 'draft',
    note: reason ? `Rule-based pedagogical fallback: ${reason}` : undefined
  };
};

/**
 * Rule-based fallback for Textbook OCR
 */
export const createRuleBasedTextbookFallback = (extractRequest, reason = '') => {
  return {
    extracted_topic: 'Seed Germination & Plant Growth (EVS)',
    suggested_subject: 'Environmental Studies (EVS)',
    suggested_grades: [2, 3, 4],
    extracted_passage: 'Seeds require soil moisture, sunlight, and air to sprout. Roots grow downwards into the earth while shoots grow upwards towards the light.',
    key_concepts: [
      'Components needed for plant growth (sunlight, water, soil)',
      'Parts of a seedling (root, shoot, seed coat)',
      'Observational recording of seed sprouting'
    ],
    zero_cost_tlm_ideas: [
      'Moist cotton or cloth with soaked chickpea/mustard seeds',
      'Chalkboard diagram showing root and shoot progression',
      'Student daily slate tracking of sprout growth'
    ]
  };
};

/**
 * Rule-based assistant replies
 */
function generateAssistantRuleBasedReply(userQuery, classroomContext) {
  const query = userQuery.toLowerCase();

  if (query.includes('timetable') || query.includes('rotation') || query.includes('schedule')) {
    return `In a multi-grade classroom, rotation balance is critical:\n\n` +
      `1. Single-Teacher Invariant: Instruct only ONE grade directly at a time (e.g., 15 minutes of teacher modeling for Grade 3).\n` +
      `2. Simultaneous Slate Engagement: Have Grades 1 and 2 work on concrete counting or handwriting drills on their slates.\n` +
      `3. Sound the Bell: Use a distinct audio chime or clap sequence 2 minutes before rotating to ensure clean transitions without chaos.`;
  }

  if (query.includes('remedial') || query.includes('struggl') || query.includes('slow')) {
    return `For students needing additional learning support:\n\n` +
      `• Drop abstract paper worksheets immediately; switch to concrete manipulatives like tamarind seeds, pebbles, or clay balls.\n` +
      `• Implement 1-on-1 peer buddy practice: pair the student with an older or proficient peer mentor for 5 minutes during independent rotations.\n` +
      `• Record daily slate checks in the Student Progress tab to monitor growth without discouraging the child.`;
  }

  if (query.includes('material') || query.includes('cost') || query.includes('tlm')) {
    return `Zero-Cost TLM (Teaching Learning Materials) best practices:\n\n` +
      `• Math: Tamarind seeds and river pebbles for counting, place value bundles, and multiplication arrays.\n` +
      `• Science: Real leaves, soil samples, and seeds brought by children from home.\n` +
      `• Language: Slates for instant erasing and low-stress phonetic drills.\n` +
      `• Chalkboard: Divide into 3 vertical columns, one for each grade's independent tasks!`;
  }

  return `Namaste Teacher! Here is a recommended pedagogical strategy for your multi-grade class:\n\n` +
    `• Divide chalkboard into distinct grade zones so independent learners have clear instructions.\n` +
    `• Spend 12–15 minutes of direct modeling with your target grade while others complete slate drills.\n` +
    `• Conduct a quick 3-minute oral peer check at the end of the rotation block.`;
}
