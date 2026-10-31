import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { 
  aiLessonPlanRequestSchema, 
  aiProgressAssessmentRequestSchema,
  aiWorksheetRequestSchema,
  aiTextbookExtractRequestSchema,
  aiAssistantChatRequestSchema
} from '../schemas/ai.schema.js';
import { 
  generateLessonPlanWithGemini, 
  generateStudentAssessmentWithGemini,
  generateWorksheetWithGemini,
  extractTextbookWithGemini,
  chatWithAssistant,
  isGeminiConfigured,
  configureGeminiKey
} from '../services/gemini.service.js';

const router = Router();

// Check AI status
router.get('/status', (req, res) => {
  res.json({
    gemini_configured: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  });
});

// Configure or update Gemini API Key dynamically
router.post('/configure-key', requireAuth, (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    return res.status(400).json({ success: false, error: 'Valid Google Gemini API Key required' });
  }

  const success = configureGeminiKey(apiKey);
  if (success) {
    res.json({ success: true, message: 'Gemini API key configured successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Failed to configure Gemini API Key' });
  }
});

// AI Generate Multi-Grade Lesson Plan
// Result is always a DRAFT and validated with Zod
router.post('/lesson-plan', requireAuth, validateBody(aiLessonPlanRequestSchema), async (req, res, next) => {
  try {
    const result = await generateLessonPlanWithGemini(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI Evaluate Student Formative Progress & Generate Actionable Recommendations
// Result status is always 'needs_review' and validated with Zod
router.post('/assess-progress', requireAuth, validateBody(aiProgressAssessmentRequestSchema), async (req, res, next) => {
  try {
    const result = await generateStudentAssessmentWithGemini(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI Generate Differentiated Worksheet / Assignment
// Result is always a DRAFT and validated with Zod
router.post('/worksheet', requireAuth, validateBody(aiWorksheetRequestSchema), async (req, res, next) => {
  try {
    const result = await generateWorksheetWithGemini(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI Multimodal Vision: Extract Textbook or Blackboard Photo Content
router.post('/extract-textbook', requireAuth, validateBody(aiTextbookExtractRequestSchema), async (req, res, next) => {
  try {
    const result = await extractTextbookWithGemini(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI Multi-Turn Pedagogical Assistant Chat
router.post('/assistant-chat', requireAuth, validateBody(aiAssistantChatRequestSchema), async (req, res, next) => {
  try {
    const result = await chatWithAssistant(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
