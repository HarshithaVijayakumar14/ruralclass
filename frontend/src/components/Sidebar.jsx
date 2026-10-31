import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  Users,
  ClipboardCheck,
  CalendarClock, 
  BookOpen, 
  FolderCheck,
  FileSpreadsheet,
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  Camera,
  Settings,
  Info,
  Globe2,
  GraduationCap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const NAV_SECTIONS = [
    {
      title: t('nav.sectionClassroom', 'Classroom & Students'),
      items: [
        { to: '/', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
        { to: '/classroom', label: t('nav.classrooms', 'Classroom Setup'), icon: School },
        { to: '/students', label: t('nav.students', 'Student Roster'), icon: Users },
        { to: '/attendance', label: t('nav.attendance', 'Attendance'), icon: ClipboardCheck },
        { to: '/timetable', label: t('nav.timetable', 'Classroom Schedule'), icon: CalendarClock, badge: 'Live Timer' }
      ]
    },
    {
      title: t('nav.sectionLessonPlanning', 'Lesson Planning'),
      items: [
        { to: '/lessons', label: t('nav.lessonPlanner', 'AI Lesson Planner'), icon: BookOpen, badge: 'AI Drafts' },
        { to: '/saved-plans', label: t('nav.savedPlans', 'Saved Plans'), icon: FolderCheck },
        { to: '/worksheets', label: t('nav.worksheets', 'Worksheets & Tests'), icon: FileSpreadsheet }
      ]
    },
    {
      title: t('nav.sectionProgress', 'Progress & Support'),
      items: [
        { to: '/progress', label: t('nav.studentProgress', 'Student Progress'), icon: TrendingUp },
        { to: '/recommendations', label: t('nav.supportRecommendations', 'Support & Remedial'), icon: AlertTriangle },
        { to: '/analytics', label: t('nav.analytics', 'Class Analytics'), icon: BarChart3 }
      ]
    },
    {
      title: t('nav.sectionTools', 'Tools & Media'),
      items: [
        { to: '/images', label: t('nav.imageUploads', 'Textbook Photos'), icon: Camera }
      ]
    },
    {
      title: t('nav.sectionSystem', 'System & Impact'),
      items: [
        { to: '/settings', label: t('nav.settings', 'Settings & Language'), icon: Settings },
        { to: '/about', label: t('nav.about', 'About GuruMitra'), icon: Info },
        { to: '/impact', label: t('nav.impact', 'Impact & SDGs'), icon: Globe2 },
        { to: '/research', label: t('nav.research', 'Research & Methodology'), icon: GraduationCap }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-stone-200 
        transition-transform duration-200 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between p-3 overflow-y-auto
      `}>
        {/* Navigation list */}
        <div className="space-y-4">
          {NAV_SECTIONS.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    end={item.to === '/'}
                    className={({ isActive }) => `
                      flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all
                      ${isActive 
                        ? 'bg-[#E8F5E9] text-[#2E7D32] font-semibold shadow-xs' 
                        : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'}
                    `}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom pedagogical footnote */}
        <div className="pt-3 mt-4 border-t border-stone-100">
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-[10px] text-stone-600 space-y-1">
            <div className="font-semibold text-stone-800">Single-Teacher Invariant</div>
            <p className="leading-tight text-stone-500">
              Mathematically ensuring ≤ 1 grade receives direct teacher focus at any minute.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
