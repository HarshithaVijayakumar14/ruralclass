import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Trash2, 
  Edit3, 
  Sparkles,
  Search,
  Filter,
  Share2,
  Copy,
  Eye,
  Check
} from 'lucide-react';
import { fetchLessonPlans, updateLessonPlan, approveLessonPlan } from '../lib/api';
import { Link } from 'react-router-dom';
import { PrintLessonPlanModal } from '../components/PrintLessonPlanModal';

export const SavedLessonPlans = ({ activeClassroom }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState(null);
  const [quickCopiedId, setQuickCopiedId] = useState(null);

  const classroomId = activeClassroom?.id;

  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }
    const loadPlans = async () => {
      setLoading(true);
      try {
        const list = await fetchLessonPlans(classroomId);
        setPlans(list || []);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, [classroomId]);

  const handleApprove = async (planId) => {
    await approveLessonPlan(planId);
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'approved' } : p));
    if (selectedPlanForPrint?.id === planId) {
      setSelectedPlanForPrint(prev => ({ ...prev, status: 'approved' }));
    }
  };

  const handleQuickCopy = async (e, plan) => {
    e.stopPropagation();
    const content = plan.content || {};
    const grades = plan.grades?.join(', ') || '';
    let text = `📚 GURUMITRA LESSON PLAN: ${plan.title || plan.topic}\n`;
    text += `🏫 ${activeClassroom?.school_name || 'Govt School'} • Grades: ${grades} • Duration: ${plan.duration_minutes || 60}m\n\n`;
    text += `🎯 Objective & Flow:\n${content.summary || plan.topic}\n\n`;
    if (content.grade_plans?.length) {
      text += `📝 Grade-wise Tasks:\n`;
      content.grade_plans.forEach(gp => {
        text += `• Grade ${gp.grade}: ${gp.learning_objective || ''}\n  - Direct: ${gp.direct_instruction || ''}\n  - Slate: ${gp.independent_activity || ''}\n`;
      });
    }
    try {
      await navigator.clipboard.writeText(text);
      setQuickCopiedId(plan.id);
      setTimeout(() => setQuickCopiedId(null), 2500);
    } catch (err) {}
  };

  const filteredPlans = plans.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <FolderCheck className="w-6 h-6 text-[#2E7D32]" />
            <span>Saved Multi-Grade Lesson Plans</span>
          </h1>
          <p className="text-xs text-stone-500">
            {activeClassroom?.name || 'Classroom'} • Review, edit, approve and print lesson drafts
          </p>
        </div>

        <Link
          to="/lessons"
          className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>New AI Plan</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans by topic or subject..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#2E7D32]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Plans ({plans.length})</option>
            <option value="approved">Approved ({plans.filter(p => p.status === 'approved').length})</option>
            <option value="draft">Drafts ({plans.filter(p => p.status === 'draft').length})</option>
          </select>
        </div>
      </div>

      {/* Plan Grid */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-800">
            {plans.length === 0 ? 'No lesson plans saved yet' : 'No plans match your search'}
          </div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {plans.length === 0 
              ? 'Use the AI Lesson Planner to synthesize your first conflict-free multi-grade plan.'
              : 'Try clearing your search query or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map(plan => (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlanForPrint(plan)}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    plan.status === 'approved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {plan.status === 'approved' ? 'Approved Plan' : 'Draft (Needs Approval)'}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    {plan.duration_minutes || 60} min
                  </span>
                </div>

                <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-[#2E7D32] transition-colors">
                  {plan.title || plan.topic}
                </h3>

                <p className="text-xs text-stone-600 line-clamp-2">
                  {plan.content?.summary || plan.topic}
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
                  <span>Grades: <strong className="text-stone-800">{plan.grades?.join(', ')}</strong></span>
                  <span>•</span>
                  <span>Subject: <strong className="text-stone-800">{plan.subject}</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs gap-2">
                {plan.status !== 'approved' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(plan.id);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                ) : (
                  <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleQuickCopy(e, plan)}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Copy lesson plan text to clipboard for WhatsApp/notes"
                  >
                    {quickCopiedId === plan.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanForPrint(plan);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="View and print full teaching guide"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Print Guide</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing, printing, and sharing the complete teaching plan content */}
      {selectedPlanForPrint && (
        <PrintLessonPlanModal
          plan={selectedPlanForPrint}
          onClose={() => setSelectedPlanForPrint(null)}
          activeClassroom={activeClassroom}
        />
      )}

    </div>
  );
};


