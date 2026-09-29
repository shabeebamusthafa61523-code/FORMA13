import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Clock, Plus, Search, CheckCircle2, AlertCircle, RefreshCw, 
  ChevronRight, Calendar, Building, Sparkles, Send, ShieldAlert, FileText, Filter, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/ToastProvider';
import { useUser } from '../contexts/UserContext';
import ExcelExportButton from '../components/ExcelExportButton';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getApiEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE.endsWith('/v1')) {
    return `${API_BASE}${cleanPath}`;
  }
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/v1${cleanPath}`;
  }
  return `${API_BASE}/api/v1${cleanPath}`;
};

const DEPARTMENTS = [
  'Creative & Marketing',
  'HR & Administration',
  'Software & Development',
  'Sales & CRM',
  'Finance & Accounts',
  'Academy & LMS',
  'Operations',
  'Management'
];

const STEPPER_STAGES = [
  { name: 'Attendance', label: 'Attendance' },
  { name: 'Briefing', label: 'Department Briefing' },
  { name: 'Execution', label: 'Priority Execution' },
  { name: 'Review', label: 'Review' },
  { name: 'EOD', label: 'EOD' },
  { name: 'MD Review', label: 'MD Review' }
];

const DailyOperationsPage = () => {
  const { showToast } = useToast();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Data states
  const [routines, setRoutines] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [eodClosures, setEodClosures] = useState([]);

  // Form states - Department Briefing
  const [briefingDept, setBriefingDept] = useState(DEPARTMENTS[0]);
  const [briefingPriority, setBriefingPriority] = useState('');
  const [briefingDeliverables, setBriefingDeliverables] = useState('');
  const [briefingBlockers, setBriefingBlockers] = useState('');
  const [briefingSaving, setBriefingSaving] = useState(false);

  // Form states - EOD Closure
  const [eodCompleted, setEodCompleted] = useState('');
  const [eodPendingReason, setEodPendingReason] = useState('');
  const [eodTomorrowPriority, setEodTomorrowPriority] = useState('');
  const [eodSubmitting, setEodSubmitting] = useState(false);

  // Routine Modal
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [newRoutineTime, setNewRoutineTime] = useState('');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineSubtitle, setNewRoutineSubtitle] = useState('');
  const [addingRoutine, setAddingRoutine] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Content-Type': 'application/json',
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` 
    };
  }, []);

  // Fetch all daily operations data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint(`/daily-operations?date=${selectedDate}`), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setRoutines(data.data.routines || []);
        setBriefings(data.data.briefings || []);
        setEodClosures(data.data.eodClosures || []);

        // Pre-fill user's existing briefing for selected department if exists
        const existingBriefing = (data.data.briefings || []).find(b => b.department === briefingDept);
        if (existingBriefing) {
          setBriefingPriority(existingBriefing.priority || '');
          setBriefingDeliverables(existingBriefing.deliverables || '');
          setBriefingBlockers(existingBriefing.blockers || '');
        }

        // Pre-fill user's EOD closure if exists
        const userId = user?._id || user?.id;
        const existingEod = (data.data.eodClosures || []).find(e => String(e.user) === String(userId));
        if (existingEod) {
          setEodCompleted(existingEod.completedToday || '');
          setEodPendingReason(existingEod.pendingReason || '');
          setEodTomorrowPriority(existingEod.tomorrowPriority || '');
        }
      } else {
        showToast(data.message || 'Failed to fetch Daily Operations data', 'error');
      }
    } catch (err) {
      console.error('Error loading Daily Operations:', err);
      showToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, briefingDept, user, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle department change in briefing form
  const handleDepartmentChange = (dept) => {
    setBriefingDept(dept);
    const existing = briefings.find(b => b.department === dept);
    if (existing) {
      setBriefingPriority(existing.priority || '');
      setBriefingDeliverables(existing.deliverables || '');
      setBriefingBlockers(existing.blockers || '');
    } else {
      setBriefingPriority('');
      setBriefingDeliverables('');
      setBriefingBlockers('');
    }
  };

  // Toggle routine item status
  const handleToggleRoutine = async (routineId) => {
    try {
      const res = await fetch(getApiEndpoint(`/daily-operations/routine/${routineId}/toggle`), {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        showToast(data.message || 'Status updated', 'success');
        setRoutines(prev => prev.map(r => r._id === routineId ? data.data : r));
      } else {
        showToast(data.message || 'Failed to update routine', 'error');
      }
    } catch (err) {
      console.error('Error toggling routine:', err);
      showToast('Error updating routine', 'error');
    }
  };

  // Add custom routine item
  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineTime || !newRoutineTitle) {
      showToast('Please enter Time and Title', 'warning');
      return;
    }
    setAddingRoutine(true);
    try {
      const res = await fetch(getApiEndpoint('/daily-operations/routine'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          time: newRoutineTime,
          title: newRoutineTitle,
          subtitle: newRoutineSubtitle,
          date: selectedDate
        })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        showToast('Routine item added', 'success');
        setRoutines(prev => [...prev, data.data].sort((a, b) => a.time.localeCompare(b.time)));
        setShowAddRoutineModal(false);
        setNewRoutineTime('');
        setNewRoutineTitle('');
        setNewRoutineSubtitle('');
      } else {
        showToast(data.message || 'Failed to add routine item', 'error');
      }
    } catch (err) {
      console.error('Error adding routine item:', err);
      showToast('Error adding routine item', 'error');
    } finally {
      setAddingRoutine(false);
    }
  };

  // Save Department Daily Briefing
  const handleSaveBriefing = async (e) => {
    e.preventDefault();
    setBriefingSaving(true);
    try {
      const res = await fetch(getApiEndpoint('/daily-operations/briefing'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          department: briefingDept,
          priority: briefingPriority,
          deliverables: briefingDeliverables,
          blockers: briefingBlockers,
          date: selectedDate
        })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        showToast('Department Daily Briefing saved successfully!', 'success');
        fetchData();
      } else {
        showToast(data.message || 'Failed to save briefing', 'error');
      }
    } catch (err) {
      console.error('Error saving briefing:', err);
      showToast('Error saving briefing', 'error');
    } finally {
      setBriefingSaving(false);
    }
  };

  // Submit EOD Closure
  const handleSubmitEod = async (e) => {
    e.preventDefault();
    setEodSubmitting(true);
    try {
      const res = await fetch(getApiEndpoint('/daily-operations/eod'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          completedToday: eodCompleted,
          pendingReason: eodPendingReason,
          tomorrowPriority: eodTomorrowPriority,
          department: briefingDept,
          date: selectedDate
        })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        showToast('EOD Closure submitted successfully!', 'success');
        fetchData();
      } else {
        showToast(data.message || 'Failed to submit EOD closure', 'error');
      }
    } catch (err) {
      console.error('Error submitting EOD:', err);
      showToast('Error submitting EOD closure', 'error');
    } finally {
      setEodSubmitting(false);
    }
  };

  // Filtered routines by search
  const filteredRoutines = routines.filter(r => 
    !searchQuery || 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.time.includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Clock size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Operations</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily execution rhythm</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExcelExportButton
            data={filteredRoutines.map(r => ({
              'Title': r.title || '',
              'Time': r.time || '',
              'Subtitle': r.subtitle || '',
              'Date': selectedDate,
              'Department': briefingDept,
              'Completed': r.completed ? 'Yes' : 'No'
            }))}
            fileName={`daily_ops_${selectedDate}_export`}
            sheetName="DailyOps"
          />
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-600">
            <Calendar size={16} className="text-slate-500" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-sm focus:outline-none"
            />
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search routines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Add Routine Item Button */}
          <button
            onClick={() => setShowAddRoutineModal(true)}
            className="flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Routine Item</span>
          </button>
        </div>
      </div>

      {/* Stepper Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] text-xs font-semibold text-slate-600 dark:text-slate-300">
          {STEPPER_STAGES.map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span>{stage.label}</span>
              </div>
              {idx < STEPPER_STAGES.length - 1 && (
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content Sections */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw size={32} className="animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading Daily Operations OS...</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* SECTION 1: Daily Operations OS Timeline */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daily Operations OS</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Time-locked operational milestones for today</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full">
                {routines.filter(r => r.status === 'completed').length} / {routines.length} Completed
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredRoutines.map((routine) => {
                const isCompleted = routine.status === 'completed';
                return (
                  <div 
                    key={routine._id} 
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                        {routine.time}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                          {routine.title}
                        </p>
                        {routine.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{routine.subtitle}</p>
                        )}
                        {isCompleted && routine.completedByName && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ✓ Completed by {routine.completedByName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        isCompleted 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>

                      <button
                        onClick={() => handleToggleRoutine(routine._id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isCompleted
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        }`}
                      >
                        {isCompleted ? 'Mark Pending' : 'Complete'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredRoutines.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  No routine items found for this query.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Department Daily Briefing Form */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Department Daily Briefing</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Head of Department update</p>
            </div>

            <form onSubmit={handleSaveBriefing} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Department
                  </label>
                  <select
                    value={briefingDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Priority
                  </label>
                  <input
                    type="text"
                    placeholder="Today's #1 priority"
                    value={briefingPriority}
                    onChange={(e) => setBriefingPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Projects / Deliverables */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Projects / Deliverables
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detail key projects & deliverables planned for today..."
                    value={briefingDeliverables}
                    onChange={(e) => setBriefingDeliverables(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Blockers / Approval Needed */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Blockers / Approval Needed
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mention any issues, delays, or pending management approvals..."
                    value={briefingBlockers}
                    onChange={(e) => setBriefingBlockers(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-start pt-2">
                <button
                  type="submit"
                  disabled={briefingSaving}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {briefingSaving ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Save Briefing</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: EOD Closure Form */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">EOD Closure</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Planned vs completed + escalation</p>
            </div>

            <form onSubmit={handleSubmitEod} className="space-y-4">
              {/* Completed Today */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Completed Today
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of all key achievements and tasks closed today..."
                  value={eodCompleted}
                  onChange={(e) => setEodCompleted(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Pending / Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Pending / Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="Unfinished tasks and exact reason for spillover..."
                  value={eodPendingReason}
                  onChange={(e) => setEodPendingReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Tomorrow Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Tomorrow Priority
                </label>
                <textarea
                  rows={3}
                  placeholder="Top action items planned for tomorrow..."
                  value={eodTomorrowPriority}
                  onChange={(e) => setEodTomorrowPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-start pt-2">
                <button
                  type="submit"
                  disabled={eodSubmitting}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {eodSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Submit EOD</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 4: Today's Submitted Briefings Log */}
          {briefings.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submitted Department Briefings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {briefings.map((b) => (
                  <div key={b._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{b.department}</span>
                      <span className="text-[11px] text-slate-400">By {b.submittedByName || 'User'}</span>
                    </div>
                    {b.priority && (
                      <p className="text-xs text-slate-800 dark:text-slate-200">
                        <strong className="text-slate-900 dark:text-white">Priority:</strong> {b.priority}
                      </p>
                    )}
                    {b.deliverables && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">Deliverables:</strong> {b.deliverables}
                      </p>
                    )}
                    {b.blockers && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        <strong>Blockers:</strong> {b.blockers}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Add Routine Modal rendered in Viewport via Portal */}
      {showAddRoutineModal && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowAddRoutineModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700 relative my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
                <span>Add Routine Milestone</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoutineModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRoutine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Time (HH:MM)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 11:30"
                  value={newRoutineTime}
                  onChange={(e) => setNewRoutineTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Delivery Sync"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Subtitle / Team
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations & Tech"
                  value={newRoutineSubtitle}
                  onChange={(e) => setNewRoutineSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowAddRoutineModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRoutine}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {addingRoutine ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DailyOperationsPage;
