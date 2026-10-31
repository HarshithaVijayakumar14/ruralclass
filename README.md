
# RuralClass — Multi-Grade Planning & Student Support System

> **"One teacher. Many grades. Zero planning stress."**  
> A real, deployment-ready full-stack progressive web app engineered specifically for rural primary schools across India where a single government teacher instructs students across multiple grades (Grades 1–8) simultaneously in one physical classroom.


## 1. Core Architectural Pillars & Pedagogical Invariants

1. **Strict Single-Teacher Invariant ($\le 1$ Teacher-Led Session At Any Minute):**
   - In a multi-grade classroom, a teacher cannot physically instruct multiple grades at once.
   - The scheduling engine mathematically partitions class time so that at any minute $t$, at most **ONE** grade receives direct Teacher-Led instruction.
   - All other grades are actively engaged in structured **Independent Slate Practice** or **Peer Buddy Learning** (tamarind seed counting, pair flashcards).
   - Smooth 2-minute transition cues prevent room disorder during rotation switches.

2. **Teacher Stays In Control (AI Output is Always a DRAFT):**
   - AI outputs generated via Google Gemini are strictly saved with status `"draft"` or `"needs_review"`.
   - AI outputs **never** become active lesson plans or student assessments without explicit teacher verification and approval.

3. **Zero-Cost Teaching Learning Materials (TLM):**
   - Designed around real rural school resources: chalkboard, student slates & chalk, tamarind seeds, pebbles, garden specimens, and textbooks.

4. **Zero Demo Data Non-Negotiable:**
   - Production contains zero fake business data, zero hardcoded statistics, and zero fabricated student rosters.
   - Newly registered teachers see clean, actionable empty states with real Get Started checklists.

5. **22 Scheduled Indian Languages + English:**
   - Built on a comprehensive multilingual framework supporting English and all 22 Eighth Schedule Indian languages displayed in their native scripts (Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Gujarati, Bengali, Odia, Punjabi, Assamese, Urdu, Sanskrit, Konkani, Nepali, Maithili, Dogri, Kashmiri, Sindhi, Santali, Bodo, Manipuri) with dynamic RTL support for Urdu, Kashmiri, and Sindhi.

6. **100% Offline-First with Reversible Sync Queue:**
   - Precached PWA shell via `vite-plugin-pwa` (Workbox) and persistent client storage via IndexedDB (`idb`).
   - All roster edits, attendance toggles, and lesson plans function completely offline and queue into an IndexedDB mutation queue that reconciles with Supabase PostgreSQL via `/api/sync` when connectivity resumes.


## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | High-performance responsive single-page web app |
| **Styling** | Tailwind CSS v4 | Rural palette: Green `#2E7D32`, Amber `#F9A825`, Off-white `#FAFAF7` |
| **Routing** | React Router v7 | 20 dedicated routes with protected layout |
| **Multilingual**| i18next + react-i18next | Native script language selector and translation dictionaries |
| **Charts** | Recharts | Grade enrollment and foundational competency analytics |
| **Icons** | Lucide React | Clean, accessible instructional iconography |
| **Database & Auth** | Supabase (PostgreSQL) | Tenancy via Row Level Security (RLS), Supabase Auth, Storage, and Realtime |
| **Backend API** | Node.js + Express | REST APIs, Helmet headers, rate limiting, and sync reconciliation |
| **Validation** | Zod | Strict schema validation for all API requests and AI outputs |
| **AI LLM** | Google Gemini API (`@google/genai`) | Structured multi-grade lesson synthesis with rule-based fallback |
| **Offline Storage** | IndexedDB (`idb`) | Browser client database and offline change queue |
| **PWA Service Worker**| `vite-plugin-pwa` (Workbox) | Offline precaching, app manifest, and standalone mobile support |
| **Voice & Audio** | Web Speech & Web Audio API | Speech-to-text dictation, text-to-speech, and 2-tone school bell audio chime |


## 3. Implemented Pages (20 Functional Routes)

1. **Login** (`/login`): Clean authentication with show/hide password, error banners, and persistent session.
2. **Registration** (`/register`): Teacher account registration (Full Name, Email, Password).
3. **Forgot Password** (`/forgot-password`): Password reset dispatch flow.
4. **Dashboard** (`/`): Real-time metrics calculated from authenticated teacher data, Get Started checklist, and zero-data welcoming states.
5. **Classroom Setup** (`/classroom`): Manage school name, multi-grade groupings (Grades 1–8), daily minutes, and zero-cost TLM.
6. **Student Roster** (`/students`): Full student CRUD, grade filtering, live search, and multi-line bulk paste.
7. **Attendance Register** (`/attendance`): Date-specific student attendance (Present, Absent, Late, Excused), Mark All Present, and real-time statistics.
8. **AI Lesson Planner** (`/lessons`): Common theme or split-topic differentiated multi-grade plan generator with rule-based fallback.
9. **Saved Lesson Plans** (`/saved-plans`): Review, approve, edit, and print lesson plans.
10. **Swimlane Timetable** (`/timetable`): Rotation timetable enforcing $\le 1$ teacher-led grade invariant with live timer companion and synthesized bell.
11. **Worksheets & Assignments** (`/worksheets`): Generate classwork, homework, and remedial worksheets with printable paper layout and answer keys.
12. **Student Progress** (`/progress`): Formative quiz scores, oral reading checks, and teacher voice note transcriptions.
13. **Support Recommendations** (`/recommendations`): Grounded, evidence-based remedial next steps citing recorded student scores.
14. **Class Analytics** (`/analytics`): Recharts bar and pie graphs of grade distribution and reading competency.
15. **Textbook Photo Scanner** (`/images`): Upload or photograph textbook pages with client-side image compression and OCR topic extraction.
16. **AI Teaching Companion** (`/assistant`): Interactive pedagogical assistant with Web Speech STT and TTS read-aloud.
17. **Settings & Language** (`/settings`): Profile editing, 23 Indian languages selector, and offline mutation sync manager.
18. **About RuralClass** (`/about`): Product vision, target teachers, and pedagogical pillars.
19. **Impact & SDGs** (`/impact`): Alignment with UN SDG 4 (Quality Education) and rural classroom impact metrics.
20. **Research & Methodology** (`/research`): Educational science, ASER citations, and mathematical proof of the single-teacher invariant.


## 4. How to Configure and Run

### Step 1: Database Setup (Supabase)

1. Log into your Supabase project dashboard (or create a free project at [supabase.com](https://supabase.com)).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open `database/schema.sql` in this project, copy its entire contents, paste it into the SQL Editor, and click **Run**.
4. This sets up:
   - Tables: `profiles`, `classrooms`, `students`, `attendance_records`, `student_progress`, `lesson_plans`, `assignments`, `timetable_blocks`, `support_recommendations`, `uploaded_images`, `assistant_conversations`, `assistant_messages`, `sync_queue`.
   - Automatic `on_auth_user_created` trigger for user profiles.
   - Row Level Security (RLS) policies on every table (`auth.uid() = teacher_id` / `auth.uid() = id`).
   - Private storage bucket `classroom-images` with user-folder RLS policies.
   - Realtime publication across interactive tables.

### Step 2: Configure Environment Secrets

#### Backend (`backend/.env`):
Create `backend/.env` (copy from `backend/.env.example`):
```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# Supabase Credentials (from Project Settings -> API in Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini API (from Google AI Studio at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash


#### Frontend (`frontend/.env`):
Create `frontend/.env` (copy from `frontend/.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=/api


*(Note: If external credentials are not yet configured, RuralClass runs safely in local/offline mode with rule-based pedagogical fallbacks, IndexedDB local persistence, and zero errors!)*


### Step 3: Run Automated Tests & Production Build

#### Run Backend Unit Tests:
```powershell
cd backend
npm test
*Result: 11 passing tests covering single-teacher mathematical invariant, collision detection, duration checks, and Zod schemas.*

#### Run Frontend Production Build:
```powershell
cd frontend
npm run build

*Result: Production Vite + PWA bundle generated in `dist/` with zero errors.*


### Step 4: Launch Application

#### Windows Quick Launch:
Double-click `start.bat` or run:
```powershell
.\start.bat


#### Manual Launch:
1. **Start Backend (Port 5000):**
   ```powershell
   cd ruralclass/backend
   npm run dev
   ```
2. **Start Frontend (Port 5173):**
   ```powershell
   cd ruralclass/frontend
   npm run dev
   ```
3. Open your browser at **http://localhost:5173**.


## 5. Deployment Guide

### Frontend Deployment (Vercel):
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Framework Preset to `Vite`.
4. Configure Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase publishable anonymous key.
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://ruralclass-api.onrender.com/api`).
5. Deploy.

### Backend Deployment (Render):
1. Create a new Web Service on [Render](https://render.com).
2. Set Root Directory to `backend`.
3. Set Runtime to `Node`.
4. Build Command: `npm install`.
5. Start Command: `node src/server.js`.
6. Configure Environment Variables:
   - `PORT`: `5000` (or leave default).
   - `FRONTEND_ORIGIN`: Your deployed Vercel URL (e.g. `https://ruralclass.vercel.app`).
   - `SUPABASE_URL`: Your Supabase URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service-role secret key.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `GEMINI_MODEL`: `gemini-2.5-flash`.
7. Deploy.

# ruralclass
>>>>>>> d2ada5996bcc678053b6e766066dd62ab3c2f687
