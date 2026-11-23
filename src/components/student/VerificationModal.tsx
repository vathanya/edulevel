import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { VERIFICATION_SCENARIOS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import type { VerificationStatus } from '../../types/edu';
import type { VerificationEvaluationResult } from '../../utils/learningEngine';

export const VERIFICATION_STATUS_STYLE: Record<
  VerificationStatus,
  { badge: string; dot: string }
> = {
  'Learning in Progress': {
    badge: 'border-sky-400/35 bg-sky-500/15 text-sky-200',
    dot: 'bg-sky-400',
  },
  'Needs More Practice': {
    badge: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
    dot: 'bg-amber-400',
  },
  'Understanding Verified': {
    badge: 'border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
    dot: 'bg-cyan-400',
  },
  'Mastery Achieved': {
    badge: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
    dot: 'bg-emerald-400',
  },
};

export const VerificationModal: React.FC = () => {
  const {
    activeVerificationConceptId,
    closeVerificationModal,
    concepts,
    verificationRecords,
    submitVerificationAttempt,
    navigate,
  } = useEdu();

  const concept = concepts.find((c) => c.id === activeVerificationConceptId);
  const scenarios = useMemo(
    () =>
      VERIFICATION_SCENARIOS.filter(
        (s) => s.conceptId === activeVerificationConceptId,
      ),
    [activeVerificationConceptId],
  );

  const record = activeVerificationConceptId
    ? verificationRecords[activeVerificationConceptId]
    : undefined;

  const [scenarioIdx, setScenarioIdx] = useState<number>(() => {
    if (!record || scenarios.length === 0) return 0;
    const uncompleted = scenarios.findIndex(
      (s) => !record.completedScenarioIds.includes(s.id),
    );
    return uncompleted >= 0 ? uncompleted : 0;
  });
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [evaluation, setEvaluation] =
    useState<VerificationEvaluationResult | null>(null);

  useEffect(() => {
    if (!activeVerificationConceptId) return;
    const uncompleted = scenarios.findIndex(
      (s) => !(record?.completedScenarioIds ?? []).includes(s.id),
    );
    setScenarioIdx(uncompleted >= 0 ? uncompleted : 0);
    setSelectedOption('');
    setReasoning('');
    setValidationError('');
    setEvaluation(null);
  }, [activeVerificationConceptId]);

  if (!activeVerificationConceptId || !concept || scenarios.length === 0) {
    return null;
  }

  const currentScenario = scenarios[scenarioIdx % scenarios.length];
  const currentStatus: VerificationStatus =
    evaluation?.statusAfter ?? record?.status ?? 'Learning in Progress';
  const verifiedChecks =
    evaluation?.updatedRecord.verifiedChecksCount ??
    record?.verifiedChecksCount ??
    0;
  const completedIds =
    evaluation?.updatedRecord.completedScenarioIds ??
    record?.completedScenarioIds ??
    [];
  const style = VERIFICATION_STATUS_STYLE[currentStatus];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      setValidationError('Choose one scenario outcome before submitting.');
      return;
    }
    if (!reasoning.trim()) {
      setValidationError('Explain your physics reasoning in your own words.');
      return;
    }
    setValidationError('');
    const res = submitVerificationAttempt(
      concept.id,
      currentScenario,
      selectedOption,
      reasoning,
    );
    setEvaluation(res);
  };

  const handleNextSituation = () => {
    const nextIdx = scenarios.findIndex(
      (s, i) => i !== scenarioIdx % scenarios.length && !completedIds.includes(s.id),
    );
    setScenarioIdx(nextIdx >= 0 ? nextIdx : (scenarioIdx + 1) % scenarios.length);
    setSelectedOption('');
    setReasoning('');
    setValidationError('');
    setEvaluation(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="flex min-h-full items-center justify-center py-2">
        <div className="w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-[#0E1730] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Understanding Verification</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <span>{currentStatus}</span>
              </span>
            </div>
            <h2
              id="verification-modal-title"
              className="font-display text-xl sm:text-2xl font-bold text-white"
            >
              {concept.name} ({concept.mastery}%)
            </h2>
          </div>
          <button
            type="button"
            onClick={closeVerificationModal}
            aria-label="Close verification"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-situation progress strip */}
        <div className="grid grid-cols-2 gap-3">
          {scenarios.map((sc, idx) => {
            const done = completedIds.includes(sc.id);
            const active = idx === scenarioIdx % scenarios.length;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setScenarioIdx(idx);
                  setSelectedOption('');
                  setReasoning('');
                  setValidationError('');
                  setEvaluation(null);
                }}
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : done
                      ? 'border-emerald-400/35 bg-emerald-500/10'
                      : 'border-white/10 bg-[#091228] hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">
                    Situation {idx + 1} of {scenarios.length}
                  </span>
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-slate-400">{active ? 'Active' : 'Pending'}</span>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold text-white truncate">
                  {sc.situationTitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scenario Prompt */}
        <div className="rounded-2xl border border-white/10 bg-[#091228] p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
            <span>New Situation: {currentScenario.situationTitle}</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {verifiedChecks}/2 Verified
            </span>
          </div>
          <p className="text-sm sm:text-base text-white leading-relaxed">
            {currentScenario.prompt}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-2.5">
            {currentScenario.options.map((opt) => {
              const selected = selectedOption === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={evaluation !== null && evaluation.passed}
                  onClick={() => {
                    setSelectedOption(opt);
                    setValidationError('');
                  }}
                  className={`rounded-xl border p-3.5 text-left text-xs sm:text-sm font-medium transition cursor-pointer ${
                    selected
                      ? 'border-cyan-400 bg-cyan-400/15 text-white'
                      : 'border-white/15 bg-[#091228] text-slate-300 hover:border-white/30'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="verification-reasoning-input"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              Explain Your Reasoning (Cause &amp; Effect — avoid formula-only answers)
            </label>
            <textarea
              id="verification-reasoning-input"
              rows={3}
              value={reasoning}
              onChange={(e) => {
                setReasoning(e.target.value);
                setValidationError('');
              }}
              placeholder="Explain what physical mechanism causes this result in your own words..."
              className="w-full rounded-xl border border-white/15 bg-[#070E20] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            {validationError && (
              <p className="mt-1.5 text-xs text-rose-300">{validationError}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Requires genuine reasoning across 2 distinct situations.
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Check Understanding</span>
            </button>
          </div>
        </form>

        {/* Evaluation Feedback */}
        {evaluation && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
              evaluation.passed
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-amber-400/40 bg-amber-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className={`flex items-center gap-2 font-display text-sm sm:text-base font-bold ${
                  evaluation.passed ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {evaluation.passed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <span>
                  {evaluation.passed
                    ? `Genuine Understanding (${evaluation.statusAfter})`
                    : evaluation.issueType === 'guessing'
                      ? 'Guessing Detected'
                      : evaluation.issueType === 'memorization'
                        ? 'Formula Memorization Detected'
                        : evaluation.issueType === 'incomplete'
                          ? 'Incomplete Explanation'
                          : 'Conceptual Misalignment'}
                </span>
              </div>
              <span className="font-mono text-xs text-white tabular-nums">
                {evaluation.updatedRecord.verifiedChecksCount}/2 Situations
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {evaluation.feedback}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {evaluation.passed && evaluation.updatedRecord.verifiedChecksCount < 2 && (
                <button
                  type="button"
                  onClick={handleNextSituation}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
                >
                  <span>Next New Situation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {!evaluation.passed && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      closeVerificationModal();
                      navigate(evaluation.recommendedView, { conceptId: concept.id });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 cursor-pointer"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>{evaluation.recommendedAction}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluation(null);
                      setReasoning('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Revise Explanation</span>
                  </button>
                </>
              )}

              {evaluation.passed && evaluation.updatedRecord.verifiedChecksCount >= 2 && (
                <button
                  type="button"
                  onClick={closeVerificationModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Done</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
