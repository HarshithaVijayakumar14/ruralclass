import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  AlertCircle,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { fetchStudents, fetchStudentProgress, fetchAttendance } from '../lib/api';
import { useTranslation } from 'react-i18next';

const COLORS = ['#2E7D32', '#F59E0B', '#EF4444', '#3B82F6'];

export const Analytics = ({ activeClassroom }) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const classroomId = activeClassroom?.id;
  const classroomGrades = activeClassroom?.grades || [1, 2, 3, 4, 5];

  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [stdList, progList, attList] = await Promise.all([
          fetchStudents(classroomId),
          fetchStudentProgress({ classroom_id: classroomId }),
          fetchAttendance(classroomId)
        ]);
        setStudents(stdList || []);
        setProgressRecords(progList || []);
        setAttendanceRecords(attList || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [classroomId]);

  // Real Calculated Grade-wise Distribution
  const gradeDistributionData = classroomGrades.map(g => {
    const inGrade = students.filter(s => s.grade === g);
    return {
      grade: `Grade ${g}`,
      students: inGrade.length
    };
  });

  // Real Calculated Competency / Reading Level Breakdown
  const emergingCount = students.filter(s => s.reading_level === 'emerging').length;
  const developingCount = students.filter(s => s.reading_level === 'developing').length;
  const fluentCount = students.filter(s => s.reading_level === 'fluent').length;

  const readingLevelData = [
    { name: 'Emerging', value: emergingCount, color: '#EF4444' },
    { name: 'Developing', value: developingCount, color: '#F59E0B' },
    { name: 'Fluent', value: fluentCount, color: '#2E7D32' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#2E7D32]" />
          <span>{t('analytics.title', 'Classroom Analytics')}</span>
        </h1>
        <p className="text-xs text-stone-500">
          {activeClassroom?.name || 'Classroom'} • {t('analytics.subtitle', 'Multi-grade performance, attendance trends, and remedial tracking')}
        </p>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-800">No Analytics Data Available</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {t('dashboard.addStudents', 'Add students to your roster first to start recording attendance and assessments.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Grade Enrollment */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              {t('analytics.gradeDistribution', 'Grade-Wise Distribution')}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }} 
                  />
                  <Bar dataKey="students" fill="#2E7D32" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Reading Competency Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Reading Level Breakdown
            </h3>
            {readingLevelData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-stone-400">
                No reading level records available
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={readingLevelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {readingLevelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

