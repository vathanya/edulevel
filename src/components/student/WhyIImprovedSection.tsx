import React from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import { VERIFICATION_STATUS_STYLE } from './VerificationModal';

export const WhyIImprovedSection: React.FC = () => {
  const {
    whyIImprovedInsights,
    learningTimeline,
    openVerificationModal,
    navigate,
  } = useEdu();

  const improvedCount = whyIImprovedInsights.filter((i) => i.delta > 0).length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#0E1D42] to-[#0D1733] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Lightbulb className="h-4 w-4" />
            <span>Personal Evidence &amp; Growth Log</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Why I Improved
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Every mastery gain is traced back to the exact misconception fixed, lab experiment or AI mentor check completed, and verified causal explanation.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center shrink-0">
          <div className="font-display text-2xl font-bold text-emerald-300 tabular-nums">
            {improvedCount} Concepts
          </div>
          <div className="text-[11px] text-slate-300">Measured gain vs initial</div>
        </div>
      </div>

      {/* Per-Concept Why I Improved Cards */}
      {whyIImprovedInsights.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0D1733] p-8 text-center text-sm text-slate-400">
          Complete a 3D Lab experiment, adaptive quiz, or verification check to generate personalized improvement insights.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {whyIImprovedInsights.map((item) => {
            const statusStyle = VERIFICATION_STATUS_STYLE[item.verificationOutcome];
            return (
              <article
                key={item.conceptId}
                className="rounded-2xl border border-white/15 bg-[#0D1733] p-5 sm:p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Card Top: Concept + Delta */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        {item.conceptName}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{item.verificationOutcome}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 font-mono text-sm font-bold tabular-nums">
                        <span className="text-slate-400">{item.initialMastery}%</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-white">{item.currentMastery}%</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums ${
                          item.delta > 0
                            ? 'text-emerald-300'
                            : item.delta < 0
                              ? 'text-rose-300'
                              : 'text-slate-400'
                        }`}
                      >
                        <TrendingUp className="h-3 w-3" />
                        <span>
                          {item.delta > 0 ? `+${item.delta}% gain` : item.delta === 0 ? 'Baseline' : `${item.delta}%`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Initial vs Current Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-slate-500/70 rounded-full"
                        style={{ width: `${item.initialMastery}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full opacity-85 transition-all duration-300"
                        style={{ width: `${item.currentMastery}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Initial: {item.initialMastery}%</span>
                      <span>Current: {item.currentMastery}%</span>
                    </div>
                  </div>

                  {/* Structured Insight Rows */}
                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
                      <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5" />
                        <span>Initial Barrier / Misconception</span>
                      </div>
                      <p className="mt-1 text-slate-200">{item.initialMisconception}</p>
                    </div>

                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                      <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Activity / AI Intervention That Helped</span>
                      </div>
                      <p className="mt-1 text-slate-200">{item.interventionUsed}</p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                      <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>What You Can Now Explain Correctly</span>
                      </div>
                      <p className="mt-1 text-slate-200">{item.canNowExplain}</p>
                    </div>
                  </div>
                </div>

                {/* Recommended Next Step Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Next: </span>
                    <span className="font-medium text-white">{item.recommendedNextStep}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openVerificationModal(item.conceptId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 cursor-pointer whitespace-nowrap"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(item.recommendedView, { conceptId: item.conceptId })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Chronological Learning Timeline */}
      <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-300" />
            <span>Learning Journey Timeline</span>
          </h3>
          <span className="text-xs text-slate-400 tabular-nums">
            {learningTimeline.length} recorded milestones
          </span>
        </div>

        <div className="space-y-3">
          {learningTimeline.slice(0, 8).map((evt) => {
            const delta = evt.masteryAfter - evt.masteryBefore;
            return (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#091228] p-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-cyan-300">{evt.conceptName}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-400">{evt.timestamp}</span>
                  </div>
                  <div className="font-medium text-sm text-white">{evt.title}</div>
                  <p className="text-xs text-slate-300">{evt.summary}</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs shrink-0 tabular-nums">
                  <span className="text-slate-400">{evt.masteryBefore}%</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="font-bold text-white">{evt.masteryAfter}%</span>
                  {delta !== 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-semibold ${
                        delta > 0
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
