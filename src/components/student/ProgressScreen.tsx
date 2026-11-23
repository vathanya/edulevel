import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  LineChart,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEdu } from '../../context/EduContext';
import { AgentActivityPanel } from '../shared/AgentActivityPanel';
import { AdvancedTrackingSection } from './AdvancedTrackingSection';
import { WhyIImprovedSection } from './WhyIImprovedSection';

export const ProgressScreen: React.FC = () => {
  const {
    concepts,
    overallMastery,
    weakestConcept,
    misconceptions,
    history,
    openVerificationModal,
    navigate,
  } = useEdu();
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'insights'>('overview');

  const strongConcepts = concepts.filter((c) => c.mastery >= 75);
  const weakConcepts = concepts.filter((c) => c.mastery < 55 && c.status !== 'locked');
  const avgConfidence = Math.round(
    concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length,
  );
  const avgRetention = Math.round(
    concepts.reduce((sum, c) => sum + c.retention, 0) / concepts.length,
  );

  const chartData = concepts.map((c) => ({
    name: c.name.length > 15 ? `${c.name.slice(0, 14)}…` : c.name,
    fullName: c.name,
    mastery: c.mastery,
    retention: c.retention,
  }));

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-cyan-300">Class 10 Physics</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Concept Progress
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={() => openVerificationModal(weakestConcept.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20 cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verify Understanding</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('questions')}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
          >
            <span>Practice Weakest</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Progress sections"
        className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-cyan-400 text-slate-950'
              : 'border border-white/10 bg-[#0D1733] text-slate-300 hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tracking'}
          onClick={() => setActiveTab('tracking')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'tracking'
              ? 'bg-cyan-400 text-slate-950'
              : 'border border-white/10 bg-[#0D1733] text-slate-300 hover:text-white'
          }`}
        >
          <LineChart className="h-4 w-4" />
          <span>Learning Tracking &amp; Verification</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'insights'
              ? 'bg-cyan-400 text-slate-950'
              : 'border border-white/10 bg-[#0D1733] text-slate-300 hover:text-white'
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          <span>Why I Improved</span>
        </button>
      </div>

      {activeTab === 'tracking' && <AdvancedTrackingSection />}
      {activeTab === 'insights' && <WhyIImprovedSection />}

      {activeTab === 'overview' && (
        <>
          {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Overall Mastery</div>
          <div className="font-display text-3xl font-bold text-cyan-300 mt-1 tabular-nums">
            {overallMastery}%
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Confidence</div>
          <div className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
            {avgConfidence}%
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Retention</div>
          <div className="font-display text-3xl font-bold text-emerald-300 mt-1 tabular-nums">
            {avgRetention}%
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Misconceptions</div>
          <div className="font-display text-3xl font-bold text-rose-300 mt-1 tabular-nums">
            {misconceptions.filter((m) => !m.resolved).length}
          </div>
        </div>
      </div>

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-white/15 bg-[#0D1733] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-white">
              Mastery Breakdown
            </h2>
            <TrendingUp className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 12, left: -16, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  interval={0}
                  angle={-22}
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
                <Bar dataKey="mastery" name="Mastery %" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.mastery >= 75
                          ? '#34D399'
                          : entry.mastery >= 45
                            ? '#38BDF8'
                            : '#F59E0B'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Strong vs Weak + Misconceptions */}
        <section className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-emerald-400/25 bg-[#0D1733] p-5">
            <h3 className="font-display text-base font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Strong</span>
            </h3>
            <div className="mt-3 space-y-2">
              {strongConcepts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-white">{c.name}</span>
                  <span className="font-mono text-xs text-emerald-300 tabular-nums">
                    {c.mastery}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-[#0D1733] p-5">
            <h3 className="font-display text-base font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Needs Focus</span>
            </h3>
            <div className="mt-3 space-y-2.5">
              {weakConcepts.length > 0 ? (
                weakConcepts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="text-white font-medium">{c.name}</div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        {c.mastery}% mastery
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('lab', { conceptId: c.id })}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/25 cursor-pointer whitespace-nowrap"
                    >
                      <FlaskConical className="h-3 w-3" />
                      <span>Lab</span>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No unlocked concepts below 55%.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-400/25 bg-[#0D1733] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-rose-300 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Misconceptions</span>
              </h3>
              <button
                type="button"
                onClick={() => navigate('mentor')}
                className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                Open Mentor
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {misconceptions.slice(0, 2).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-[#091228] p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{m.detectedConcept}</span>
                    <span className={m.resolved ? 'text-emerald-300' : 'text-rose-300'}>
                      {m.resolved ? 'Resolved' : m.classification}
                    </span>
                  </div>
                  <p className="text-slate-300">{m.possibleMisconception}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity Table */}
      <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4">
          Recent Activity
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Activity</th>
                <th className="py-2.5 pr-4 font-medium">Concept</th>
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 pr-4 font-medium">Reasoning</th>
                <th className="py-2.5 pr-4 font-medium">Diagnosis</th>
                <th className="py-2.5 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-white">{item.title}</td>
                  <td className="py-3 pr-4 text-slate-300">{item.conceptName}</td>
                  <td className="py-3 pr-4 text-slate-400">{item.dateLabel}</td>
                  <td className="py-3 pr-4 text-cyan-300">{item.reasoningQuality}</td>
                  <td className="py-3 pr-4 text-slate-300">{item.classification}</td>
                  <td className="py-3 text-right font-mono font-semibold text-white tabular-nums">
                    {item.scorePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AgentActivityPanel variant="student" />
        </>
      )}
    </div>
  );
};
