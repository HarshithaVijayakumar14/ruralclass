import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import classroomRoutes from './routes/classroom.routes.js';
import studentRoutes from './routes/student.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import progressRoutes from './routes/progress.routes.js';
import lessonRoutes from './routes/lesson.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import profileRoutes from './routes/profile.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import aiRoutes from './routes/ai.routes.js';
import syncRoutes from './routes/sync.routes.js';
import translateRoutes from './routes/translate.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

// Environment variable validation at startup
const validateEnv = () => {
  const missing = [];
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.startsWith('http')) {
    missing.push('SUPABASE_URL (e.g. https://your-project.supabase.co)');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.length < 20) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY (found under Project Settings -> API in Supabase)');
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    missing.push('GEMINI_API_KEY (obtainable from Google AI Studio at https://aistudio.google.com/)');
  }

  if (missing.length > 0) {
    console.warn('\n========================================================');
    console.warn(' [RuralClass Startup Notice] Missing External Credentials:');
    missing.forEach(item => console.warn(`   * ${item}`));
    console.warn(' Rule-based pedagogical fallbacks & offline storage are active.');
    console.warn(' Configure these in backend/.env for live cloud sync and LLM synthesis.');
    console.warn('========================================================\n');
  } else {
    console.log('[RuralClass Startup] All external environment credentials verified.');
  }
};

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Helmet HTTP Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Security: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});
app.use('/api/', apiLimiter);

// Security: Configurable Restricted CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http'));
  const hasSupabaseServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');

  res.json({
    status: 'ok',
    app: 'RuralClass Multi-Grade Orchestration API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      supabase_configured: hasSupabaseUrl && hasSupabaseServiceKey,
      gemini_configured: hasGeminiKey,
      gemini_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      sarvam_configured: Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here')
    }
  });
});

// API Routes
app.use('/api/profile', profileRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/translate', translateRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handling
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` RuralClass Backend API is running on http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(`========================================================`);
  });
}

export default app;
