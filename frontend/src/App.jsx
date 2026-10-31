import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Classroom } from './pages/Classroom';
import { StudentManagement } from './pages/StudentManagement';
import { Attendance } from './pages/Attendance';
import { LessonPlans } from './pages/LessonPlans';
import { SavedLessonPlans } from './pages/SavedLessonPlans';
import { Timetable } from './pages/Timetable';
import { Worksheets } from './pages/Worksheets';
import { StudentProgress } from './pages/StudentProgress';
import { SupportRecommendations } from './pages/SupportRecommendations';
import { Analytics } from './pages/Analytics';
import { ImageUploads } from './pages/ImageUploads';
import { Settings } from './pages/Settings';
import { About } from './pages/About';
import { Impact } from './pages/Impact';
import { Research } from './pages/Research';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SarvamProvider } from './lib/sarvamTranslation';
import { fetchClassrooms } from './lib/api';

const ProtectedLayout = ({ children, activeClassroom, classrooms, onSelectClassroom, onClassroomUpdated }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] text-stone-500 text-sm">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#2E7D32]" />
          <span>Loading GuruMitra Workspace...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated and trying to access app, redirect to login
  const publicPaths = ['/login', '/register', '/forgot-password', '/about', '/impact', '/research'];
  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Navbar 
        activeClassroom={activeClassroom}
        classrooms={classrooms}
        onSelectClassroom={onSelectClassroom}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar 
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function AppContent() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [activeClassroom, setActiveClassroom] = useState(null);

  // Load classrooms for the active authenticated user
  useEffect(() => {
    if (!user) {
      setClassrooms([]);
      setActiveClassroom(null);
      return;
    }

    const loadClassrooms = async () => {
      try {
        const list = await fetchClassrooms();
        if (list && list.length > 0) {
          setClassrooms(list);
          setActiveClassroom(list[0]);
        } else {
          setClassrooms([]);
          setActiveClassroom(null);
        }
      } catch (err) {
        console.warn('[App] Error fetching classrooms:', err);
        setClassrooms([]);
        setActiveClassroom(null);
      }
    };

    loadClassrooms();
  }, [user?.id]);

  const handleClassroomUpdated = (updated) => {
    setClassrooms(prev => {
      const exists = prev.some(c => c.id === updated.id);
      if (exists) {
        return prev.map(c => c.id === updated.id ? updated : c);
      }
      return [updated, ...prev];
    });
    setActiveClassroom(updated);
  };

  return (
    <BrowserRouter>
      <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Application Routes */}
          <Route path="/" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Dashboard 
                activeClassroom={activeClassroom} 
                classrooms={classrooms} 
              />
            </ProtectedLayout>
          } />

          <Route path="/classroom" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Classroom 
                activeClassroom={activeClassroom} 
                classrooms={classrooms}
                onSelectClassroom={setActiveClassroom}
                onClassroomUpdated={handleClassroomUpdated}
              />
            </ProtectedLayout>
          } />

          <Route path="/students" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <StudentManagement activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/attendance" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Attendance activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/lessons" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <LessonPlans activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/saved-plans" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <SavedLessonPlans activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/timetable" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Timetable activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/worksheets" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Worksheets activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/progress" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <StudentProgress activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/recommendations" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <SupportRecommendations activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/analytics" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Analytics activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/images" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <ImageUploads activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          <Route path="/assistant" element={<Navigate to="/" replace />} />

          <Route path="/settings" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Settings activeClassroom={activeClassroom} />
            </ProtectedLayout>
          } />

          {/* Educational Impact & Research Routes */}
          <Route path="/about" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <About />
            </ProtectedLayout>
          } />

          <Route path="/impact" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Impact />
            </ProtectedLayout>
          } />

          <Route path="/research" element={
            <ProtectedLayout 
              activeClassroom={activeClassroom} 
              classrooms={classrooms}
              onSelectClassroom={setActiveClassroom}
              onClassroomUpdated={handleClassroomUpdated}
            >
              <Research />
            </ProtectedLayout>
          } />

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SarvamProvider>
        <AppContent />
      </SarvamProvider>
    </AuthProvider>
  );
}

