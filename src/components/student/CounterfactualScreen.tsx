import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Sparkles,
  Swords,
  XCircle,
} from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import { AiApiError } from '../../services/aiClient';

export const CounterfactualScreen: React.FC = () => {
  const {
    activeCounterfactual,
    generateCounterfactualAsync,
    counterfactualResult,
    submitCounterfactualAsync,
    orchestratorMode,
    setOrchestratorMode,
    concepts,
    navigate,
  } = useEdu();

  const [selectedChoice, setSelectedChoice] = useState<string>(
    counterfactualResult.selectedChoice || '',
  );
  const [explanation, setExplanation] = useState<string>(
    counterfactualResult.explanation || '',
  );
  const [generating, setGenerating] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastFailedOp, setLastFailedOp] = useState<'generate' | 'submit'>('submit');

  const ohmsConcept = concepts.find((c) => c.id === 'ohms-law');
  const resConcept = concepts.find((c) => c.id === 'resistance');

  const handleGenerateNew = async (preferGemini?: boolean) => {
    setGenerating(true);
    setAiError(null);
    try {
      await generateCounterfactualAsync('ohms-law', preferGemini);
      setSelectedChoice('');
      setExplanation('');
    } catch (err) {
      setLastFailedOp('generate');
      setAiError(
        err instanceof AiApiError
          ? err.message
          : 'Unable to generate a new counterfactual challenge.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const runSubmit = async (preferGemini?: boolean) => {
    if (!selectedChoice || !explanation.trim()) return;
    setEvaluating(true);
    setAiError(null);
    try {
      await submitCounterfactualAsync(selectedChoice, explanation, preferGemini);
    } catch (err) {
      setLastFailedOp('submit');
      setAiError(
        err instanceof AiApiError
          ? err.message
          : 'Unable to evaluate your prediction with Gemini.',
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSubmit();
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
            <Swords className="h-4 w-4" />
            <span>Challenge Arena</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Condition Flip
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <div
            role="group"
            aria-label="AI Engine Mode"
            className="flex items-center rounded-xl border border-white/15 bg-[#0D1733] p-0.5 text-[11px] font-semibold"
          >
            <button
              type="button"
              onClick={() => setOrchestratorMode('deterministic')}
              className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                orchestratorMode === 'deterministic'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              5-Agent Engine
            </button>
            <button
              type="button"
              onClick={() => setOrchestratorMode('gemini')}
              className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                orchestratorMode === 'gemini'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Live Gemini
            </button>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateNew()}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/15 px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>
              {generating
                ? 'Generating...'
                : orchestratorMode === 'gemini'
                  ? 'New Gemini Scenario'
                  : 'New Adaptive Scenario'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('lab')}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="h-4 w-4" />
            <span>Verify in 3D Lab</span>
          </button>
        </div>
      </div>

      {/* Prompt Card */}
      <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-6 sm:p-8 space-y-6">
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-300">
              Scenario · {activeCounterfactual.changedCondition}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                activeCounterfactual.source === 'gemini'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : activeCounterfactual.source === 'orchestrator'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-300'
              }`}
            >
              {activeCounterfactual.source === 'gemini'
                ? 'Live Gemini'
                : activeCounterfactual.source === 'orchestrator'
                  ? '5-Agent Engine'
                  : 'Starter Seed'}
            </span>
          </div>
          <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
            “{activeCounterfactual.scenario}”
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-3">Your Prediction</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeCounterfactual.choices.map((choice) => {
                const selected = selectedChoice === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setSelectedChoice(choice)}
                    className={`rounded-xl border p-4 text-left text-sm font-medium transition cursor-pointer ${
                      selected
                        ? 'border-cyan-400 bg-cyan-400/15 text-white'
                        : 'border-white/15 bg-[#091228] text-slate-300 hover:border-white/30'
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="cf-explanation"
              className="block text-xs font-semibold text-slate-300 mb-2"
            >
              Explain Why ({orchestratorMode === 'gemini' ? 'Evaluated by Gemini' : 'Evaluated by Reasoning Agent'})
            </label>
            <textarea
              id="cf-explanation"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain using I = V / R..."
              className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
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
                      if (lastFailedOp === 'generate') {
                        handleGenerateNew(false);
                      } else {
                        runSubmit(false);
                      }
                    }}
                    className="rounded-lg border border-cyan-400/35 bg-cyan-400/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                  >
                    Use 5-Agent Engine (Local)
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setExplanation(
                  'With resistance held constant, potential difference V is directly proportional to current (I = V / R), so higher voltage pushes more charge per second.',
                )
              }
              className="text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              Fill sample
            </button>

            <button
              type="submit"
              disabled={evaluating || !selectedChoice || !explanation.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>
                {evaluating
                  ? 'Evaluating...'
                  : orchestratorMode === 'gemini'
                    ? 'Check Answer with Gemini'
                    : 'Check Answer (5-Agent)'}
              </span>
            </button>
          </div>
        </form>

        {/* Evaluation Result */}
        {counterfactualResult.completed && (
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              counterfactualResult.passed
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-amber-400/40 bg-amber-500/10'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div
                className={`flex items-center gap-2 font-display text-lg font-bold ${
                  counterfactualResult.passed ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {counterfactualResult.passed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span>
                  {counterfactualResult.passed ? 'Transfer Verified' : 'Refine Reasoning'}
                  {counterfactualResult.classification
                    ? ` · ${counterfactualResult.classification}`
                    : ''}
                </span>
              </div>

              <div className="text-xs font-mono text-white tabular-nums">
                Resistance {resConcept?.mastery ?? 0}% · Ohm’s Law {ohmsConcept?.mastery ?? 0}%
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {counterfactualResult.feedback}
            </p>

            {counterfactualResult.passed && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('mastery-gate')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Next: Mastery Gate</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
