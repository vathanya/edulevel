import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  FlaskConical,
  Loader2,
  LockOpen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import { AiApiError } from '../../services/aiClient';

export const MasteryGateScreen: React.FC = () => {
  const {
    concepts,
    history,
    labResult,
    counterfactualResult,
    masteryGateUnlocked,
    orchestratorMode,
    setOrchestratorMode,
    completeMasteryGateAsync,
    navigate,
  } = useEdu();

  const [summary, setSummary] = useState<string>(
    counterfactualResult.passed
      ? 'At constant temperature, current is directly proportional to potential difference and inversely proportional to resistance (I = V / R). Increasing resistance lowers current if voltage stays fixed.'
      : '',
  );
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalFeedback, setEvalFeedback] = useState<{
    passed: boolean;
    message: string;
    classification?: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const ohmsConcept = concepts.find((c) => c.id === 'ohms-law');
  const nextConcept = concepts.find((c) => c.id === 'series-parallel');
  const answeredCount = history.length;
  const reasoningQuality = counterfactualResult.passed
    ? 'Strong'
    : history.some((h) => h.reasoningQuality === 'Strong')
      ? 'Developing'
      : 'Needs Review';

  const runUnlock = async (preferGemini?: boolean) => {
    if (!summary.trim()) return;
    setEvaluating(true);
    setAiError(null);
    setEvalFeedback(null);
    try {
      const res = await completeMasteryGateAsync(summary, preferGemini);
      setEvalFeedback({
        passed: res.passed,
        message: res.feedback,
        classification: res.classification,
      });
    } catch (err) {
      setAiError(
        err instanceof AiApiError
          ? err.message
          : 'Unable to evaluate Mastery Gate synthesis via Gemini.',
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    await runUnlock();
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#0E1C3F] via-[#0B1530] to-[#0A1124] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Mastery Gate</span>
              <span aria-hidden="true">·</span>
              <span>Electricity Island</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              {masteryGateUnlocked ? 'Gate Cleared' : 'Explain to Unlock'}
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 self-start">
            <Award className="h-4 w-4 text-amber-300" />
            <span className="font-mono tabular-nums">
              {masteryGateUnlocked ? '+160 XP Earned' : '+160 XP'}
            </span>
          </div>
        </div>

        {/* Evidence Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#091228] p-4">
            <div className="text-xs text-slate-400">Assessments</div>
            <div className="font-display text-xl font-bold text-white mt-1 tabular-nums">
              {answeredCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#091228] p-4">
            <div className="text-xs text-slate-400">Reasoning</div>
            <div className="font-display text-xl font-bold text-cyan-300 mt-1">
              {reasoningQuality}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#091228] p-4">
            <div className="text-xs text-slate-400">3D Lab</div>
            <div
              className={`font-display text-base font-bold mt-1.5 flex items-center gap-1.5 ${
                labResult.completed ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {labResult.completed ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('lab')}
                  className="inline-flex items-center gap-1.5 underline hover:text-amber-200 cursor-pointer"
                >
                  <FlaskConical className="h-4 w-4" />
                  <span>Open Lab</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#091228] p-4">
            <div className="text-xs text-slate-400">Ohm’s Law</div>
            <div className="font-mono text-xl font-bold text-emerald-300 mt-1 tabular-nums">
              {ohmsConcept?.mastery ?? 44}%
            </div>
          </div>
        </div>

        {/* Unlock Target */}
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <LockOpen className="h-4 w-4 text-cyan-300 shrink-0" />
            <span>Unlocks: {nextConcept?.name ?? 'Series and Parallel Circuits'}</span>
          </div>
          {!counterfactualResult.passed && (
            <button
              type="button"
              onClick={() => navigate('counterfactual')}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer whitespace-nowrap"
            >
              Try Transfer Trial →
            </button>
          )}
        </div>

        {/* Synthesis Prompt */}
        {!masteryGateUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-4 pt-2 border-t border-white/10">
            <div>
              <label
                htmlFor="gate-summary"
                className="block text-sm font-semibold text-white"
              >
                Explain how V, R, and I relate in your own words
              </label>
              <textarea
                id="gate-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summarize the relationship between voltage, resistance, and current..."
                className="mt-2.5 w-full rounded-xl border border-white/15 bg-[#080F22] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {aiError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <span>{aiError}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setOrchestratorMode('deterministic');
                        runUnlock(false);
                      }}
                      className="rounded-lg border border-cyan-400/35 bg-cyan-400/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                    >
                      Verify with 5-Agent Engine
                    </button>
                  </div>
                </div>
              </div>
            )}

            {evalFeedback && !evalFeedback.passed && (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-xs text-amber-100 space-y-1">
                <div className="font-semibold text-amber-300">
                  Not unlocked yet · {evalFeedback.classification}
                </div>
                <p>{evalFeedback.message}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setSummary(
                    'Current is directly proportional to potential difference V and inversely proportional to resistance R (I = V/R). Raising R restricts charge flow while raising V pushes more current.',
                  )
                }
                className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                Fill sample
              </button>

              <button
                type="submit"
                disabled={evaluating || !summary.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 cursor-pointer"
              >
                {evaluating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {evaluating
                    ? 'Evaluating...'
                    : orchestratorMode === 'gemini'
                      ? 'Verify with Gemini & Unlock'
                      : 'Verify with 5-Agent Engine & Unlock'}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display text-lg font-bold text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span>Series and Parallel Circuits Unlocked</span>
              </div>
              {evalFeedback && (
                <p className="text-xs text-emerald-100">{evalFeedback.message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate('island-detail', { islandId: 'electricity' })}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
              >
                <span>Electricity Island</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('progress')}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer whitespace-nowrap"
              >
                Progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
