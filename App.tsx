/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2, Circle, 
  BookOpen, ClipboardList, BarChart3, Settings as SettingsIcon, 
  Moon, Sun, Flame, Quote, Clock, Calendar, ChevronRight, 
  MoreVertical, Edit3, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AppState, Subject, Note, Goal, Habit, Settings, Unit } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_STATE: AppState = {
  subjects: [],
  notes: [],
  goals: [],
  habits: [],
  settings: {
    showQuotes: true,
    showStreak: true,
    studyTime: 25,
    breakTime: 5,
    darkMode: false,
  },
  stats: {
    totalStudySessions: 0,
    todayStudyMinutes: 0,
    weeklyStudyMinutes: [0, 0, 0, 0, 0, 0, 0],
  },
};

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "It always seems impossible until it's done.",
  "Don't stop when you're tired. Stop when you're done.",
  "Your only limit is you.",
  "Focus on being productive instead of busy.",
  "Success is the sum of small efforts, repeated day in and day out.",
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focusdesk_state');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'notes' | 'analytics' | 'settings'>('dashboard');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(state.settings.studyTime * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('focusdesk_state', JSON.stringify(state));
  }, [state]);

  // Dark Mode
  useEffect(() => {
    if (state.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.darkMode]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      if (!isBreak) {
        // Study session finished
        setState(prev => ({
          ...prev,
          subjects: selectedSubjectId ? prev.subjects.map(s => s.id === selectedSubjectId ? { ...s, studyMinutes: s.studyMinutes + prev.settings.studyTime } : s) : prev.subjects,
          stats: {
            ...prev.stats,
            totalStudySessions: prev.stats.totalStudySessions + 1,
            todayStudyMinutes: prev.stats.todayStudyMinutes + prev.settings.studyTime,
          }
        }));
        setIsBreak(true);
        setTimeLeft(state.settings.breakTime * 60);
      } else {
        // Break finished
        setIsBreak(false);
        setTimeLeft(state.settings.studyTime * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, isBreak, state.settings.studyTime, state.settings.breakTime]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setIsBreak(false);
    setTimeLeft(state.settings.studyTime * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = useMemo(() => {
    const total = isBreak ? state.settings.breakTime * 60 : state.settings.studyTime * 60;
    return ((total - timeLeft) / total) * 100;
  }, [timeLeft, isBreak, state.settings.studyTime, state.settings.breakTime]);

  // Handlers
  const addSubject = (name: string) => {
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af'];
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name,
      units: [],
      color: colors[state.subjects.length % colors.length],
      studyMinutes: 0,
    };
    setState(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
  };

  const deleteSubject = (id: string) => {
    setState(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.id !== id) }));
  };

  const addUnit = (subjectId: string, name: string) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === subjectId ? {
        ...s,
        units: [...s.units, { id: crypto.randomUUID(), name, completed: false }]
      } : s)
    }));
  };

  const toggleUnit = (subjectId: string, unitId: string) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === subjectId ? {
        ...s,
        units: s.units.map(u => u.id === unitId ? { ...u, completed: !u.completed } : u)
      } : s)
    }));
  };

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: '',
      updatedAt: Date.now(),
    };
    setState(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
  };

  const updateNote = (id: string, title: string, content: string) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n)
    }));
  };

  const deleteNote = (id: string) => {
    setState(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
  };

  const addGoal = (text: string) => {
    const newGoal: Goal = { id: crypto.randomUUID(), text, completed: false };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };

  const toggleGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g)
    }));
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  };

  const addHabit = (name: string) => {
    const newHabit: Habit = { id: crypto.randomUUID(), name, completedToday: false, streak: 0 };
    setState(prev => ({ ...prev, habits: [...prev.habits, newHabit] }));
  };

  const toggleHabit = (id: string) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => {
        if (h.id === id) {
          const completed = !h.completedToday;
          return {
            ...h,
            completedToday: completed,
            streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1),
            lastCompletedDate: completed ? new Date().toISOString() : h.lastCompletedDate
          };
        }
        return h;
      })
    }));
  };

  const deleteHabit = (id: string) => {
    setState(prev => ({ ...prev, habits: prev.habits.filter(h => h.id !== id) }));
  };

  const resetData = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      setState(INITIAL_STATE);
      localStorage.removeItem('focusdesk_state');
    }
  };

  const randomQuote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-64 flex flex-col p-6 z-10 bg-slate-50 dark:bg-[#1C1C1E] border-r border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Clock className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-400">FocusDesk</h1>
        </div>

        <div className="space-y-2 flex-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Clock size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} icon={<BookOpen size={20} />} label="Subjects" />
          <NavItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<Edit3 size={20} />} label="Notes" />
          <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={20} />} label="Analytics" />
        </div>

        <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 space-y-2">
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Settings" />
          <button 
            onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, darkMode: !prev.settings.darkMode } }))}
            className="sidebar-item"
          >
            {state.settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{state.settings.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-400">{format(currentTime, 'EEEE, MMMM do')}</h2>
                  <p className="text-slate-600 dark:text-white/60 font-medium">{format(currentTime, 'h:mm:ss a')}</p>
                </div>
                {state.settings.showStreak && (
                  <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-bold shadow-sm">
                    <Flame size={20} />
                    <span>5 Day Study Streak 🔥</span>
                  </div>
                )}
              </div>

              {/* Top Section: Timer & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit",
                      isBreak ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                    )}>
                      {isBreak ? 'Break Time' : 'Focus Session'}
                    </div>
                    {!isBreak && state.subjects.length > 0 && (
                      <select 
                        value={selectedSubjectId || ''} 
                        onChange={(e) => setSelectedSubjectId(e.target.value || null)}
                        className="mac-input py-1 text-[10px] font-bold uppercase tracking-wider"
                      >
                        <option value="">No Subject</option>
                        {state.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-black/5 dark:text-white/5"
                      />
                      <motion.circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="753.98"
                        animate={{ strokeDashoffset: 753.98 * (1 - progress / 100) }}
                        transition={{ duration: 1, ease: "linear" }}
                        className={isBreak ? "text-green-500" : "text-blue-600"}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold font-mono">{formatTime(timeLeft)}</span>
                      <span className="text-sm text-black/60 dark:text-white/40 font-medium">
                        {isBreak ? 'Relax' : 'Stay Focused'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleTimer}
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg hover:scale-105",
                        isTimerRunning ? "bg-red-500 text-white shadow-red-500/30" : "bg-blue-600 text-white shadow-blue-600/30"
                      )}
                    >
                      {isTimerRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </button>
                    <button 
                      onClick={resetTimer}
                      className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-4">Today's Progress</h3>
                    <div className="space-y-4">
                      <StatItem label="Study Time" value={`${state.stats.todayStudyMinutes}m`} icon={<Clock className="text-blue-600" />} />
                      <StatItem label="Sessions" value={state.stats.totalStudySessions} icon={<Flame className="text-blue-600" />} />
                      <StatItem label="Units Done" value={state.subjects.reduce((acc, s) => acc + s.units.filter(u => u.completed).length, 0)} icon={<CheckCircle2 className="text-blue-600" />} />
                    </div>
                  </div>
                  
                  {state.settings.showQuotes && (
                    <div className="glass-card p-6 bg-blue-600/5 border-none">
                      <Quote className="text-blue-600 mb-2" size={20} />
                      <p className="italic font-medium text-lg leading-relaxed text-blue-900 dark:text-blue-200">"{randomQuote}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Section: Subjects & Side Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">Subject Progress</h3>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('subject') as HTMLInputElement;
                        if (input.value.trim()) {
                          addSubject(input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        name="subject"
                        placeholder="New subject..." 
                        className="mac-input w-full sm:w-48"
                      />
                      <button type="submit" className="bg-blue-600 text-white p-2 rounded-macos hover:bg-blue-700 transition-colors">
                        <Plus size={20} />
                      </button>
                    </form>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.subjects.length === 0 ? (
                      <div className="col-span-full glass-card p-12 flex flex-col items-center justify-center text-black/40 dark:text-white/40">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p>No subjects added yet.</p>
                      </div>
                    ) : (
                      state.subjects.map((subject: Subject) => (
                        <SubjectCard 
                          key={subject.id} 
                          subject={subject} 
                          onDelete={() => deleteSubject(subject.id)}
                          onAddUnit={(name) => addUnit(subject.id, name)}
                          onToggleUnit={(unitId) => toggleUnit(subject.id, unitId)}
                        />
                      ))
                    )}
                  </div>

                  {/* Study Analytics (Bottom Section) */}
                  <div className="glass-card p-6 h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <BarChart3 size={18} />
                        Weekly Activity
                      </h3>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 'Mon', mins: 45 },
                        { day: 'Tue', mins: 120 },
                        { day: 'Wed', mins: 90 },
                        { day: 'Thu', mins: 60 },
                        { day: 'Fri', mins: 150 },
                        { day: 'Sat', mins: 30 },
                        { day: 'Sun', mins: state.stats.todayStudyMinutes },
                      ]}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12 }} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
                          {[0,1,2,3,4,5,6].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : '#93c5fd'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Daily Goals */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <ClipboardList size={18} />
                        Daily Goals
                      </h3>
                    </div>
                    <div className="space-y-3 mb-4">
                      {state.goals.map(goal => (
                        <div key={goal.id} className="flex items-center justify-between group">
                          <button 
                            onClick={() => toggleGoal(goal.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            {goal.completed ? 
                              <CheckCircle2 className="text-green-600 shrink-0" size={20} /> : 
                              <Circle className="text-slate-300 dark:text-white/20 shrink-0" size={20} />
                            }
                            <span className={cn("font-medium text-slate-700 dark:text-white/90", goal.completed && "line-through text-slate-400 dark:text-white/40")}>
                              {goal.text}
                            </span>
                          </button>
                          <button onClick={() => deleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('goal') as HTMLInputElement;
                      if (input.value) {
                        addGoal(input.value);
                        input.value = '';
                      }
                    }}>
                      <input 
                        name="goal"
                        placeholder="Add a goal..." 
                        className="mac-input w-full text-sm"
                      />
                    </form>
                  </div>

                  {/* Habit Tracker */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Flame size={18} />
                        Habits
                      </h3>
                    </div>
                    <div className="space-y-4 mb-4">
                      {state.habits.map(habit => (
                        <div key={habit.id} className="space-y-2 group">
                          <div className="flex items-center justify-between">
                            <button 
                              onClick={() => toggleHabit(habit.id)}
                              className="flex items-center gap-3"
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                habit.completedToday ? "bg-blue-600 text-white" : "border-2 border-black/20 dark:border-white/10"
                              )}>
                                {habit.completedToday && <CheckCircle2 size={16} />}
                              </div>
                              <span className="font-bold">{habit.name}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-600">{habit.streak}d</span>
                              <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('habit') as HTMLInputElement;
                      if (input.value) {
                        addHabit(input.value);
                        input.value = '';
                      }
                    }}>
                      <input 
                        name="habit"
                        placeholder="New habit..." 
                        className="mac-input w-full text-sm"
                      />
                    </form>
                  </div>

                  {/* Notes Preview (Side Panel) */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Edit3 size={18} />
                        Recent Notes
                      </h3>
                      <button onClick={() => setActiveTab('notes')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                      {state.notes.slice(0, 2).map(note => (
                        <div key={note.id} className="p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                          <h4 className="font-bold text-sm truncate">{note.title}</h4>
                          <p className="text-xs opacity-70 line-clamp-2 mt-1">{note.content}</p>
                        </div>
                      ))}
                      {state.notes.length === 0 && <p className="text-xs opacity-60 italic">No notes yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'subjects' && (
            <motion.div 
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Subjects & Units</h2>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('subject') as HTMLInputElement;
                    if (input.value.trim()) {
                      addSubject(input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="flex gap-2"
                >
                  <input 
                    name="subject"
                    placeholder="Enter subject name..." 
                    className="mac-input w-full sm:w-64"
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white mac-button shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  >
                    <Plus size={20} /> Add Subject
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.subjects.map(subject => (
                  <div key={subject.id} className="glass-card overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between" style={{ borderTop: `4px solid ${subject.color}` }}>
                      <h3 className="text-xl font-bold">{subject.name}</h3>
                      <button onClick={() => deleteSubject(subject.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="p-6 flex-1 space-y-4">
                      <div className="space-y-2">
                        {subject.units.map(unit => (
                          <div key={unit.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <button onClick={() => toggleUnit(subject.id, unit.id)}>
                              {unit.completed ? 
                                <CheckCircle2 className="text-green-500" size={20} /> : 
                                <Circle className="text-black/20 dark:text-white/20" size={20} />
                              }
                            </button>
                            <span className={cn("font-medium text-slate-700 dark:text-white/90", unit.completed && "line-through text-slate-400 dark:text-white/40")}>
                              {unit.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('unit') as HTMLInputElement;
                        if (input.value) {
                          addUnit(subject.id, input.value);
                          input.value = '';
                        }
                      }}>
                        <input 
                          name="unit"
                          placeholder="Add unit..." 
                          className="mac-input w-full text-sm"
                        />
                      </form>
                    </div>
                    <div className="p-4 bg-black/5 dark:bg-white/5">
                      <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider opacity-50">
                        <span>Progress</span>
                        <span>{Math.round((subject.units.filter(u => u.completed).length / (subject.units.length || 1)) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(subject.units.filter(u => u.completed).length / (subject.units.length || 1)) * 100}%` }}
                          className="h-full"
                          style={{ backgroundColor: subject.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Study Notes</h2>
                <button 
                  onClick={addNote}
                  className="bg-blue-600 text-white mac-button shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                >
                  <Plus size={20} /> New Note
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.notes.map((note: Note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onUpdate={(title, content) => updateNote(note.id, title, content)}
                    onDelete={() => deleteNote(note.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Study Analytics</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-8">
                  <p className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Today's Study</p>
                  <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">{state.stats.todayStudyMinutes} <span className="text-lg font-medium opacity-50">min</span></p>
                </div>
                <div className="glass-card p-8">
                  <p className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Total Sessions</p>
                  <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">{state.stats.totalStudySessions}</p>
                </div>
                <div className="glass-card p-8">
                  <p className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Units Completed</p>
                  <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">{state.subjects.reduce((acc, s) => acc + s.units.filter(u => u.completed).length, 0)}</p>
                </div>
              </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-8 h-[400px]">
                  <h3 className="text-xl font-bold mb-8 text-blue-700 dark:text-blue-400">Weekly Activity</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { day: 'Mon', mins: 45 },
                      { day: 'Tue', mins: 120 },
                      { day: 'Wed', mins: 90 },
                      { day: 'Thu', mins: 60 },
                      { day: 'Fri', mins: 150 },
                      { day: 'Sat', mins: 30 },
                      { day: 'Sun', mins: state.stats.todayStudyMinutes },
                    ]}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.7 }} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="mins" radius={[6, 6, 0, 0]}>
                        {[0,1,2,3,4,5,6].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : '#93c5fd'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card p-8 h-[400px]">
                  <h3 className="text-xl font-bold mb-8 text-blue-700 dark:text-blue-400">Study by Subject</h3>
                  {state.subjects.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={state.subjects.map(s => ({ name: s.name, mins: s.studyMinutes, color: s.color }))} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="mins" radius={[0, 4, 4, 0]}>
                          {state.subjects.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Settings</h2>

              <div className="glass-card divide-y divide-black/5 dark:divide-white/5">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Motivational Quotes</h4>
                    <p className="text-sm text-slate-500 dark:text-white/50">Show quotes on the dashboard</p>
                  </div>
                  <Toggle 
                    enabled={state.settings.showQuotes} 
                    onChange={(val) => setState(prev => ({ ...prev, settings: { ...prev.settings, showQuotes: val } }))} 
                  />
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Study Streak</h4>
                    <p className="text-sm text-slate-500 dark:text-white/50">Display your current study streak</p>
                  </div>
                  <Toggle 
                    enabled={state.settings.showStreak} 
                    onChange={(val) => setState(prev => ({ ...prev, settings: { ...prev.settings, showStreak: val } }))} 
                  />
                </div>
                <div className="p-6 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white">Timer Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Study (min)</label>
                      <input 
                        type="number" 
                        value={state.settings.studyTime}
                        onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, studyTime: parseInt(e.target.value) || 25 } }))}
                        className="mac-input w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase opacity-50">Break (min)</label>
                      <input 
                        type="number" 
                        value={state.settings.breakTime}
                        onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, breakTime: parseInt(e.target.value) || 5 } }))}
                        className="mac-input w-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <button 
                    onClick={resetData}
                    className="w-full py-3 rounded-macos bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={20} /> Reset All Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "sidebar-item",
        active && "sidebar-item-active"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatItem({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-medium text-slate-700 dark:text-white/60">{label}</span>
      </div>
      <span className="font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function SubjectCard({ subject, onDelete, onAddUnit, onToggleUnit }: { subject: Subject, onDelete: () => void, onAddUnit: (name: string) => void, onToggleUnit: (id: string) => void, key?: string }) {
  const completed = subject.units.filter(u => u.completed).length;
  const total = subject.units.length || 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="glass-card p-5 group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
          <h4 className="font-bold text-slate-800 dark:text-white">{subject.name}</h4>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="mb-4">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{subject.studyMinutes} mins studied</span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-xs font-bold opacity-70 uppercase tracking-wider">
          <span>Units</span>
          <span>{completed}/{subject.units.length}</span>
        </div>
        <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full"
            style={{ backgroundColor: subject.color }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {subject.units.slice(0, 2).map(unit => (
          <div key={unit.id} className="flex items-center gap-2 text-sm">
            {unit.completed ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} className="opacity-20" />}
            <span className={cn(unit.completed && "line-through opacity-40")}>{unit.name}</span>
          </div>
        ))}
        {subject.units.length > 2 && (
          <span className="text-xs opacity-40 font-bold">+{subject.units.length - 2} more</span>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete }: { note: Note, onUpdate: (title: string, content: string) => void, onDelete: () => void, key?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const handleSave = () => {
    onUpdate(title, content);
    setIsEditing(false);
  };

  return (
    <div className="glass-card p-6 flex flex-col h-64 group relative">
      {isEditing ? (
        <div className="flex flex-col h-full space-y-3">
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="mac-input font-bold"
          />
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            className="mac-input flex-1 resize-none text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-blue-500 text-white mac-button text-sm py-1">Save</button>
            <button onClick={() => setIsEditing(false)} className="mac-button text-sm py-1 bg-black/5 dark:bg-white/5">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold truncate pr-8 text-slate-800 dark:text-white">{note.title}</h4>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 right-6">
              <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:scale-110 transition-transform"><Edit3 size={16} /></button>
              <button onClick={onDelete} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16} /></button>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-white/60 line-clamp-6 flex-1">{note.content || 'No content...'}</p>
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest opacity-50">
            Updated {format(note.updatedAt, 'MMM d, h:mm a')}
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!enabled)}
      className={cn(
        "w-12 h-6 rounded-full p-1 transition-colors duration-200",
        enabled ? "bg-blue-600" : "bg-black/10 dark:bg-white/10"
      )}
    >
      <motion.div 
        animate={{ x: enabled ? 24 : 0 }}
        className="w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}
