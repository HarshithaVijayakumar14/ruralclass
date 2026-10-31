import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  LogOut, 
  User, 
  School,
  Menu,
  Languages,
  Settings
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { syncOfflineQueue } from '../lib/api';
import { getPendingSyncQueue } from '../lib/db';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { changeAppLanguage } from '../i18n';
import { useTranslation } from 'react-i18next';

export const Navbar = ({ activeClassroom, classrooms = [], onSelectClassroom, onToggleMobileSidebar }) => {
  const { user, userProfile, updateProfile, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  // Monitor online status & sync queue
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkQueue = async () => {
      const queue = await getPendingSyncQueue();
      setPendingCount(queue.length);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    await changeAppLanguage(newLang, (code) => updateProfile({ preferred_language: code }));
  };

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      const queue = await getPendingSyncQueue();
      setPendingCount(queue.length);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const teacherName = userProfile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Teacher';
  const schoolName = userProfile?.school_name || activeClassroom?.school_name || activeClassroom?.name || 'Govt School';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button 
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-[#2E7D32] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1B5E20] transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#2E7D32]">{t('brand.name', 'GuruMitra')}</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-stone-500 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded">
                Multi-Grade
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Classroom Selector (Only if classrooms exist) */}
        {classrooms.length > 0 && (
          <div className="hidden md:flex items-center gap-2 max-w-xs">
            <School className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              value={activeClassroom?.id || ''}
              onChange={(e) => {
                const found = classrooms.find(c => c.id === e.target.value);
                if (found && onSelectClassroom) onSelectClassroom(found);
              }}
              aria-label="Select active classroom"
              className="text-xs font-medium bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none truncate"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Grades {c.grades?.join(', ') || '1-5'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right: Language Selector, Connectivity & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Multilingual Selector with Sarvam AI */}
          <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 rounded-lg px-2 py-1 shadow-2xs">
            <Languages className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <select
              value={currentLang}
              onChange={handleLanguageChange}
              aria-label="Select language"
              className="bg-transparent text-xs font-bold text-emerald-950 outline-none cursor-pointer max-w-[110px] sm:max-w-none"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded uppercase tracking-wider hidden md:inline">
              Sarvam AI
            </span>
          </div>

          {/* Online/Offline Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 border border-stone-200">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}

            {/* Offline sync badge */}
            {pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                title={`${pendingCount} pending offline changes. Click to sync.`}
                className="ml-1 flex items-center gap-1 text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded text-[11px] transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingCount}</span>
              </button>
            )}
          </div>

          {/* Teacher Profile / Settings / Sign Out */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link 
                to="/settings"
                title="Profile & Settings"
                className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity"
              >
                <span className="text-xs font-semibold text-stone-900 leading-tight">{teacherName}</span>
                <span className="text-[10px] text-stone-500 truncate max-w-[120px]">{schoolName}</span>
              </Link>
              <Link
                to="/settings"
                className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-stone-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              Sign In
            </Link>
          )}

        </div>

      </div>
    </header>
  );
};
