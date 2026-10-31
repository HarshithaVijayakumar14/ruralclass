-- ====================================================================
-- RURALCLASS PRODUCTION DATABASE SCHEMA (Supabase / PostgreSQL)
-- Multi-Grade Classroom Planning & Student Support System (Grades 1–8)
-- ====================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Automatic updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ====================================================================
-- 3. PROFILES TABLE
-- Attached to auth.users, stores teacher profile & language preferences
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    school_name TEXT DEFAULT 'Govt Primary School',
    district TEXT,
    state TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Automatically create profile entry when a new teacher signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, preferred_language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 4. CLASSROOMS TABLE
-- Represents a multi-grade classroom managed by a single rural teacher
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    school_name TEXT NOT NULL DEFAULT 'Govt Higher Primary School',
    district TEXT,
    state TEXT,
    grades INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
    subjects TEXT[] NOT NULL DEFAULT ARRAY['Environmental Studies (EVS)', 'Mathematics', 'Language'],
    daily_minutes INTEGER NOT NULL DEFAULT 60 CHECK (daily_minutes >= 15 AND daily_minutes <= 360),
    period_count INTEGER NOT NULL DEFAULT 6 CHECK (period_count >= 1 AND period_count <= 12),
    break_duration INTEGER NOT NULL DEFAULT 10,
    materials TEXT[] NOT NULL DEFAULT ARRAY['Chalkboard', 'Student Slates & Chalk', 'Tamarind Seeds / Pebbles', 'Textbooks'],
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 5. STUDENTS TABLE
-- Student roster tracking grade, baseline literacy/numeracy
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 8),
    roll_number TEXT,
    attendance_status TEXT NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
    reading_level TEXT NOT NULL DEFAULT 'developing' CHECK (reading_level IN ('emerging', 'developing', 'fluent')),
    math_level TEXT NOT NULL DEFAULT 'developing' CHECK (math_level IN ('emerging', 'developing', 'fluent')),
    overall_competency NUMERIC(5,2) NOT NULL DEFAULT 50.0 CHECK (overall_competency >= 0.0 AND overall_competency <= 100.0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 6. ATTENDANCE_RECORDS TABLE
-- Date-specific attendance tracking per student with history
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_attendance_date UNIQUE (student_id, date)
);

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. STUDENT_PROGRESS TABLE
-- Formative assessments, quiz scores, voice dictation notes & observations
-- NOTE: AI-generated records start with status 'draft' or 'needs_review'
-- and ONLY become 'approved' upon explicit teacher confirmation.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('formative_quiz', 'oral_reading', 'slate_drill', 'teacher_observation', 'activity_check')),
    subject TEXT NOT NULL,
    skill_tested TEXT NOT NULL,
    score NUMERIC(5,2) CHECK (score >= 0.0 AND score <= max_score),
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100.0 CHECK (max_score > 0.0),
    priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('high', 'medium', 'mastery')),
    observations TEXT,
    voice_note_transcript TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved')),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON public.student_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 8. LESSON_PLANS TABLE
-- Multi-grade lesson plans with structured rotation activities
-- Status is 'draft' by default until approved by the teacher.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    grades INTEGER[] NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes >= 15 AND duration_minutes <= 360),
    planning_mode TEXT NOT NULL DEFAULT 'common_theme' CHECK (planning_mode IN ('common_theme', 'split_topics')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved')),
    content JSONB NOT NULL,
    zero_cost_tlm TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_lesson_plans_updated_at
    BEFORE UPDATE ON public.lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 9. ASSIGNMENTS AND WORKSHEETS TABLE
-- Classwork, homework, quizzes and remedial worksheets
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    lesson_plan_id UUID REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 8),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('classwork', 'homework', 'worksheet', 'quiz')),
    difficulty_level TEXT NOT NULL DEFAULT 'on_level' CHECK (difficulty_level IN ('remedial', 'on_level', 'extension')),
    content JSONB NOT NULL,
    answer_key JSONB,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'needs_help')),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 10. TIMETABLE_BLOCKS TABLE
-- Multi-grade time rotation blocks mathematically ensuring <= 1 teacher-led grade at any minute
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.timetable_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_plan_id UUID REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    block_index INTEGER NOT NULL,
    start_minute INTEGER NOT NULL,
    end_minute INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    title TEXT NOT NULL,
    focus_grade TEXT NOT NULL,
    assignments JSONB NOT NULL,
    is_transition BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_timetable_blocks_updated_at
    BEFORE UPDATE ON public.timetable_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 11. SUPPORT_RECOMMENDATIONS TABLE
-- Evidence-based remedial recommendations derived from assessment history
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.support_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'mastery')),
    evidence TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_support_recommendations_updated_at
    BEFORE UPDATE ON public.support_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 12. UPLOADED_IMAGES TABLE
-- Textbook pages, blackboard photos, worksheets metadata
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.uploaded_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    extracted_text TEXT,
    image_description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 13. ASSISTANT_CONVERSATIONS AND MESSAGES TABLES
-- Persisted AI assistant conversations scoped strictly to authenticated teacher
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Pedagogical Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    search_grounding JSONB,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 14. SYNC_QUEUE TABLE
-- Server-side reconciliation audit for offline IndexedDB change sync
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ====================================================================
-- 15. INDEXES FOR HIGH-PERFORMANCE LOW-LATENCY QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON public.students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students(grade);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_classroom_date ON public.attendance_records(classroom_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_teacher ON public.attendance_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_classroom ON public.student_progress(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_teacher ON public.student_progress(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON public.student_progress(status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_classroom ON public.lesson_plans(classroom_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON public.lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON public.lesson_plans(status);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON public.assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_blocks_classroom_day ON public.timetable_blocks(classroom_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_blocks_teacher ON public.timetable_blocks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_support_recommendations_student ON public.support_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_support_recommendations_teacher ON public.support_recommendations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_teacher ON public.uploaded_images(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_teacher ON public.assistant_conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv ON public.assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_teacher_status ON public.sync_queue(teacher_id, status);

-- ====================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict tenancy: Teachers can ONLY read/write their own records
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Teachers can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Teachers can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Classrooms RLS
CREATE POLICY "Teachers manage their own classrooms"
    ON public.classrooms FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Students RLS
CREATE POLICY "Teachers manage their own students"
    ON public.students FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Attendance Records RLS
CREATE POLICY "Teachers manage their own attendance records"
    ON public.attendance_records FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Student Progress RLS
CREATE POLICY "Teachers manage their own student progress"
    ON public.student_progress FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Lesson Plans RLS
CREATE POLICY "Teachers manage their own lesson plans"
    ON public.lesson_plans FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Assignments RLS
CREATE POLICY "Teachers manage their own assignments"
    ON public.assignments FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Timetable Blocks RLS
CREATE POLICY "Teachers manage their own timetable blocks"
    ON public.timetable_blocks FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Support Recommendations RLS
CREATE POLICY "Teachers manage their own support recommendations"
    ON public.support_recommendations FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Uploaded Images RLS
CREATE POLICY "Teachers manage their own uploaded images"
    ON public.uploaded_images FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Assistant Conversations RLS
CREATE POLICY "Teachers manage their own assistant conversations"
    ON public.assistant_conversations FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Assistant Messages RLS
CREATE POLICY "Teachers manage their own assistant messages"
    ON public.assistant_messages FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Sync Queue RLS
CREATE POLICY "Teachers manage their own sync queue"
    ON public.sync_queue FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- ====================================================================
-- 17. SUPABASE STORAGE BUCKET CONFIGURATION (Classroom Images)
-- Run this block in Supabase to set up private storage bucket
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('classroom-images', 'classroom-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies (per-user private folders)
CREATE POLICY "Teachers can upload images into their own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'classroom-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Teachers can view their own images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'classroom-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Teachers can delete their own images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'classroom-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ====================================================================
-- 18. SUPABASE REALTIME CONFIGURATION
-- Publish tables to supabase_realtime publication for live UI updates
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_recommendations;
