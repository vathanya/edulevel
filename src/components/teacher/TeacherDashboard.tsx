import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCheck,
  CheckCircle2,
  Compass,
  Filter,
  LogOut,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ASSETS } from '../../data/assets';
import { CLASS_PROGRESS_TIMELINE } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import type { TeacherStudentRecord } from '../../types/edu';
import { AgentActivityPanel } from '../shared/AgentActivityPanel';
import { SafeImage } from '../shared/SafeImage';
import { TeacherInsightsSection } from './TeacherInsightsSection';

const TRACKED_CONCEPTS = [
  { id: 'electric-current', label: 'Electric Current' },
  { id: 'potential-difference', label: 'Potential Diff.' },
  { id: 'resistance', label: 'Resistance' },
  { id: 'ohms-law', label: "Ohm's Law" },
  { id: 'series-parallel', label: 'Series & Parallel' },
  { id: 'magnetic-fields', label: 'Magnetic Fields' },
  { id: 'reflection-mirrors', label: 'Spherical Mirrors' },
];

export const TeacherDashboard: React.FC = () => {
  const {
    setRole,
    teacherInterventions,
    toggleInterventionAssigned,
    teacherInsights,
    teacherNotifications,
    markTeacherNotificationRead,
    markAllTeacherNotificationsRead,
    toastMessage,
  } = useEdu();

  const [selectedConceptId, setSelectedConceptId] = useState<string>('resistance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'support' | 'on-track'>('all');
  const [inspectedStudent, setInspectedStudent] =
    useState<TeacherStudentRecord | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifOpen]);

  const unreadAlerts = teacherNotifications.filter((n) => !n.read).length;
  const cohortStudents = teacherInsights.students;

  const avgClassMastery = useMemo(() => {
    const sum = cohortStudents.reduce((acc, s) => acc + s.overallMastery, 0);
    return Math.round(sum / cohortStudents.length);
  }, [cohortStudents]);

  const supportCount = useMemo(
    () => cohortStudents.filter((s) => s.supportNeeded).length,
    [cohortStudents],
  );

  const conceptAverages = useMemo(() => {
    return TRACKED_CONCEPTS.map((c) => {
      const avg = Math.round(
        cohortStudents.reduce(
          (sum, s) => sum + (s.conceptMastery[c.id] ?? 0),
          0,
        ) / cohortStudents.length,
      );
      const struggling = cohortStudents.filter(
        (s) => (s.conceptMastery[c.id] ?? 0) < 55,
      ).length;
      return { ...c, avg, struggling };
    });
  }, [cohortStudents]);

  const lowestConcept = useMemo(
    () => [...conceptAverages].sort((a, b) => a.avg - b.avg)[0],
    [conceptAverages],
  );

  const strugglingForConcept = useMemo(() => {
    return cohortStudents.filter(
      (s) => (s.conceptMastery[selectedConceptId] ?? 0) < 55,
    ).sort(
      (a, b) =>
        (a.conceptMastery[selectedConceptId] ?? 0) -
        (b.conceptMastery[selectedConceptId] ?? 0),
    );
  }, [cohortStudents, selectedConceptId]);

  const filteredStudents = useMemo(() => {
    return cohortStudents.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'support'
            ? s.supportNeeded
            : !s.supportNeeded;
      return matchesSearch && matchesStatus;
    });
  }, [cohortStudents, searchQuery, statusFilter]);

  const selectedConceptLabel =
    TRACKED_CONCEPTS.find((c) => c.id === selectedConceptId)?.label ?? 'Resistance';

  const getHeatCellClass = (val: number) => {
    if (val >= 75) return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30';
    if (val >= 55) return 'bg-sky-500/15 text-sky-200 border-sky-500/25';
    if (val >= 42) return 'bg-amber-500/20 text-amber-200 border-amber-500/30';
    return 'bg-rose-500/25 text-rose-200 border-rose-500/35';
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col">
      {/* Top Analytical Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B1222]/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold text-white whitespace-nowrap">
                EduLevel Teacher
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                Class 10A · 30 Students
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Teacher Notification Centre */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Teacher Notifications"
                aria-expanded={notifOpen}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums">
                    {unreadAlerts}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-[#0F172A] p-4 shadow-2xl z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-display text-sm font-bold text-white">
                      Classroom Alerts
                    </h3>
                    <button
                      type="button"
                      onClick={markAllTeacherNotificationsRead}
                      className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 cursor-pointer"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Mark read</span>
                    </button>
                  </div>
                  <div className="mt-2 max-h-80 overflow-y-auto space-y-2">
                    {teacherNotifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          markTeacherNotificationRead(n.id);
                          if (n.conceptId) setSelectedConceptId(n.conceptId);
                          setNotifOpen(false);
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                          n.read
                            ? 'border-slate-800 bg-[#0B1222]/60 text-slate-400'
                            : 'border-indigo-400/35 bg-indigo-500/10 text-slate-100'
                        } hover:border-indigo-400/60`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{n.title}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {n.timeLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{n.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setRole('student')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 cursor-pointer whitespace-nowrap"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Student View</span>
            </button>

            <button
              type="button"
              onClick={() => setRole(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>

            <SafeImage
              src={ASSETS.teacherAvatar}
              alt="Educator Profile"
              width={1024}
              height={1024}
              fallbackLabel="ED"
              className="hidden sm:block h-9 w-9 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Summary KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="text-xs text-slate-400">Students</div>
            <div className="font-display text-3xl font-bold text-white mt-1 tabular-nums flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>{cohortStudents.length}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="text-xs text-slate-400">Class Avg Mastery</div>
            <div className="font-display text-3xl font-bold text-cyan-300 mt-1 tabular-nums">
              {avgClassMastery}%
            </div>
            <div className="text-xs text-emerald-400 mt-1">+6% (2 wks)</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="text-xs text-slate-400">Lowest Concept</div>
            <div className="font-display text-xl font-bold text-amber-300 mt-1.5">
              {lowestConcept.label} ({lowestConcept.avg}%)
            </div>
            <button
              type="button"
              onClick={() => setSelectedConceptId(lowestConcept.id)}
              className="text-xs text-cyan-300 hover:text-cyan-200 mt-1 cursor-pointer"
            >
              Inspect {lowestConcept.struggling} students →
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="text-xs text-slate-400">Needs Support</div>
            <div className="font-display text-3xl font-bold text-rose-300 mt-1 tabular-nums">
              {supportCount}
            </div>
          </div>
        </section>

        {/* Charts Row: Class Progress Over Time + Concept Mastery Comparison */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">
                Class Progress
              </h2>
              <span className="text-xs text-slate-400">8 weeks</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={CLASS_PROGRESS_TIMELINE}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="week" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1222',
                      borderColor: '#334155',
                      borderRadius: 10,
                      color: '#F8FAFC',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mastery"
                    name="Class Mastery %"
                    stroke="#38BDF8"
                    fill="#38BDF8"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="reasoning"
                    name="Reasoning Score %"
                    stroke="#818CF8"
                    fill="#818CF8"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="mb-4">
              <h2 className="font-display text-base font-bold text-white">
                Mastery by Concept
              </h2>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={conceptAverages}
                  margin={{ top: 8, right: 12, left: -16, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1222',
                      borderColor: '#334155',
                      borderRadius: 10,
                      color: '#F8FAFC',
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="avg"
                    name="Class Avg %"
                    fill="#6366F1"
                    radius={[5, 5, 0, 0]}
                    onClick={(data) => {
                      if (data && data.id) setSelectedConceptId(String(data.id));
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Concept Drill-Down & Recommended Teaching Interventions */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  {selectedConceptLabel} Drill-Down
                </h2>
                <p className="text-xs text-slate-400">
                  {strugglingForConcept.length} below 55%
                </p>
              </div>

              {/* Concept Selector Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {TRACKED_CONCEPTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConceptId(c.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedConceptId === c.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {strugglingForConcept.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                All 30 students are currently at or above 55% mastery in {selectedConceptLabel}.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-lg">
                {strugglingForConcept.map((stu) => (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setInspectedStudent(stu)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {stu.name}{' '}
                        <span className="font-mono text-xs text-slate-400">
                          ({stu.rollNo})
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {stu.primaryMisconception}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-rose-300 tabular-nums shrink-0">
                      {stu.conceptMastery[selectedConceptId]}%
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Most Common Misconceptions + Recommended Teaching Interventions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Common Misconceptions</span>
              </h2>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-200">
                    Believes higher resistance increases current at fixed V
                  </span>
                  <span className="font-mono font-semibold text-rose-300 tabular-nums shrink-0 ml-2">
                    10 students
                  </span>
                </li>
                <li className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-200">
                    Inverts Ohm’s Law rearrangement (R = I / V)
                  </span>
                  <span className="font-mono font-semibold text-amber-300 tabular-nums shrink-0 ml-2">
                    8 students
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-200">
                    Confuses series current with parallel voltage drops
                  </span>
                  <span className="font-mono font-semibold text-sky-300 tabular-nums shrink-0 ml-2">
                    7 students
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-white">
                Interventions
              </h2>
              <div className="space-y-2.5">
                {teacherInterventions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-800 bg-[#0B1222] p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-indigo-300">
                          {item.conceptName} · {item.targetCount} students
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5">
                          {item.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleInterventionAssigned(item.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                          item.assigned
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-indigo-500 text-white hover:bg-indigo-400'
                        }`}
                      >
                        {item.assigned ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Assigned</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Assign</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Concept Mastery Heatmap (All 30 Students × 7 Concepts) */}
        <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-white">
              Class Heatmap
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or roll..."
                  className="rounded-lg border border-slate-700 bg-[#0B1222] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="inline-flex items-center rounded-lg border border-slate-700 bg-[#0B1222] p-0.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400 mx-2" />
                {(
                  [
                    { id: 'all', label: 'All (30)' },
                    { id: 'support', label: `Needs Support (${supportCount})` },
                    { id: 'on-track', label: 'On Track' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-md px-2.5 py-1 font-medium cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Roll</th>
                  <th className="py-2.5 pr-3 font-medium">Student</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Overall</th>
                  {TRACKED_CONCEPTS.map((c) => (
                    <th key={c.id} className="py-2.5 px-1.5 text-center font-medium">
                      <button
                        type="button"
                        onClick={() => setSelectedConceptId(c.id)}
                        className={`hover:text-white cursor-pointer whitespace-nowrap ${
                          selectedConceptId === c.id ? 'text-indigo-300 underline' : ''
                        }`}
                      >
                        {c.label}
                      </button>
                    </th>
                  ))}
                  <th className="py-2.5 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TRACKED_CONCEPTS.length + 4}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      <p>No students match the current search or support filter.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="mt-3 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => (
                    <tr
                      key={stu.id}
                      onClick={() => setInspectedStudent(stu)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2 pr-3 font-mono text-slate-400 tabular-nums">
                        {stu.rollNo}
                      </td>
                      <td className="py-2 pr-3 font-medium text-white whitespace-nowrap">
                        {stu.name}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono font-semibold text-white tabular-nums">
                        {stu.overallMastery}%
                      </td>
                      {TRACKED_CONCEPTS.map((c) => {
                        const val = stu.conceptMastery[c.id] ?? 0;
                        return (
                          <td key={c.id} className="py-1.5 px-1 text-center">
                            <span
                              className={`inline-block w-11 rounded border py-0.5 font-mono text-[11px] tabular-nums ${getHeatCellClass(val)}`}
                            >
                              {val}%
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 whitespace-nowrap">
                        <span
                          className={
                            stu.supportNeeded ? 'text-rose-300 font-medium' : 'text-emerald-300'
                          }
                        >
                          {stu.supportNeeded ? 'Needs Support' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Supplementary Teacher Progress & Verification Insights */}
        <TeacherInsightsSection
          onInspectStudent={(stu) => setInspectedStudent(stu)}
          onSelectConcept={(cid) => setSelectedConceptId(cid)}
        />

        <AgentActivityPanel variant="teacher" />
      </main>

      {/* Individual Student Learner Profile Modal */}
      {inspectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0F172A] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-indigo-300">
                  {inspectedStudent.rollNo} · Active {inspectedStudent.lastActive}
                </div>
                <h3 className="font-display text-xl font-bold text-white mt-0.5">
                  {inspectedStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close student details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-800 bg-[#0B1222] p-3">
                <div className="text-[11px] text-slate-400">Overall</div>
                <div className="font-mono text-lg font-bold text-cyan-300 tabular-nums">
                  {inspectedStudent.overallMastery}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0B1222] p-3">
                <div className="text-[11px] text-slate-400">Reasoning</div>
                <div className="font-mono text-lg font-bold text-indigo-300 tabular-nums">
                  {inspectedStudent.reasoningScore}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0B1222] p-3">
                <div className="text-[11px] text-slate-400">Streak</div>
                <div className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                  {inspectedStudent.streakDays}d
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B1222] p-3.5 text-xs">
              <div className="text-slate-400">Primary Misconception</div>
              <div className="text-slate-100 font-medium mt-1">
                {inspectedStudent.primaryMisconception}
              </div>
            </div>

            <div className="space-y-2">
              {TRACKED_CONCEPTS.map((c) => {
                const v = inspectedStudent.conceptMastery[c.id] ?? 0;
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{c.label}</span>
                      <span className="font-mono text-white tabular-nums">{v}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${v}%`,
                          backgroundColor:
                            v >= 75 ? '#34D399' : v >= 55 ? '#38BDF8' : '#FB7185',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl border border-indigo-400/40 bg-[#0F172A] px-4 py-3 text-sm font-medium text-indigo-100 shadow-2xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
