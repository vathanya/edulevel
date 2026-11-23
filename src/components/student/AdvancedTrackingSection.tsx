import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Flame,
  Layers,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ISLANDS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import { VERIFICATION_STATUS_STYLE } from './VerificationModal';

export const AdvancedTrackingSection: React.FC = () => {
  const {
    concepts,
    trackingMetrics,
    verificationRecords,
    openVerificationModal,
    navigate,
  } = useEdu();

  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  const trendData =
    timeframe === 'weekly'
      ? trackingMetrics.weeklyTrend
      : trackingMetrics.monthlyTrend;

  const comparisonData = trackingMetrics.masteryComparison.map((m) => ({
    name: m.name.length > 13 ? `${m.name.slice(0, 12)}…` : m.name,
    fullName: m.name,
    initial: m.initialMastery,
    current: m.currentMastery,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Questions Attempted</span>
            <Target className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
            {trackingMetrics.questionsAttempted}
          </div>
          <div className="text-xs text-cyan-300 mt-1 tabular-nums">
            {trackingMetrics.accuracyPercent}% accuracy ({trackingMetrics.correctAttempts} strong)
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Chapters Completed</span>
            <Layers className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="font-display text-3xl font-bold text-emerald-300 mt-1 tabular-nums">
            {trackingMetrics.completedChapters.length} / {ISLANDS.length - 1}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {trackingMetrics.pendingConcepts.length} concepts pending mastery
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Streak &amp; Consistency</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <div className="font-display text-3xl font-bold text-orange-300 mt-1 tabular-nums">
            {trackingMetrics.streakDays} days
          </div>
          <div className="text-xs text-slate-300 mt-1 tabular-nums">
            {trackingMetrics.consistencyPercent}% weekly consistency
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified Concepts</span>
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="font-display text-3xl font-bold text-cyan-300 mt-1 tabular-nums">
            {trackingMetrics.verifiedCount} / {concepts.length}
          </div>
          <div className="text-xs text-emerald-300 mt-1 tabular-nums">
            {trackingMetrics.masteredCount} Mastery Achieved
          </div>
        </div>
      </div>

      {/* Graphs Row: Weekly/Monthly Trend + Initial vs Current Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-2xl border border-white/15 bg-[#0D1733] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-300" />
                <span>Learning Improvement Over Time</span>
              </h2>
              <p className="text-xs text-slate-400">
                Updates dynamically with assessments and verification attempts
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 bg-[#091228] p-1 text-xs">
              <button
                type="button"
                onClick={() => setTimeframe('weekly')}
                className={`rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                  timeframe === 'weekly'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('monthly')}
                className={`rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                  timeframe === 'monthly'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#091228',
                    borderColor: 'rgba(56,189,248,0.35)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="mastery"
                  name="Mastery %"
                  stroke="#38BDF8"
                  fill="#38BDF8"
                  fillOpacity={0.2}
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy %"
                  stroke="#34D399"
                  fill="#34D399"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-2xl border border-white/15 bg-[#0D1733] p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-300" />
              <span>Initial vs Current Mastery</span>
            </h2>
            <p className="text-xs text-slate-400">
              Baseline diagnostic mastery compared with latest evidence
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 10, right: 12, left: -16, bottom: 26 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={56}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#091228',
                    borderColor: 'rgba(56,189,248,0.35)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="initial" name="Initial %" fill="#64748B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="Current %" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Completed Chapters, Pending Concepts & Understanding Verification Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 rounded-2xl border border-white/15 bg-[#0D1733] p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-white">
            Chapter &amp; Concept Status
          </h3>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-emerald-300">Completed Chapters</div>
            {trackingMetrics.completedChapters.length === 0 ? (
              <p className="text-xs text-slate-400">
                Complete all concepts on an island at ≥75% mastery to finish a chapter.
              </p>
            ) : (
              trackingMetrics.completedChapters.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{ch.name}</span>
                  </span>
                  <span className="font-mono text-emerald-300 tabular-nums">{ch.mastery}%</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs font-semibold text-amber-300">
              Pending Concepts ({trackingMetrics.pendingConcepts.length})
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {trackingMetrics.pendingConcepts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#091228] px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{c.status}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('questions', { conceptId: c.id })}
                    className="font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer tabular-nums"
                  >
                    {c.mastery}% →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-white/15 bg-[#0D1733] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                <span>Concept Verification Status</span>
              </h3>
              <p className="text-xs text-slate-400">
                Verify conceptual reasoning in 2 distinct situations — never from a single answer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {concepts
              .filter((c) => c.status !== 'locked')
              .map((c) => {
                const rec = verificationRecords[c.id];
                const status = rec?.status ?? 'Learning in Progress';
                const checks = rec?.verifiedChecksCount ?? 0;
                const style = VERIFICATION_STATUS_STYLE[status];

                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-[#091228] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold text-white">
                          {c.name}
                        </span>
                        <span className="font-mono text-xs text-slate-300 tabular-nums">
                          {c.mastery}%
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          <span>{status}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {checks}/2 verified
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] text-slate-400 truncate">
                        {rec?.lastFeedback
                          ? rec.lastFeedback
                          : 'Explain 2 new situations to verify.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openVerificationModal(c.id)}
                        className="shrink-0 rounded-lg bg-cyan-400/15 border border-cyan-400/35 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer whitespace-nowrap"
                      >
                        {checks >= 2 ? 'Re-verify' : 'Verify'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
};
