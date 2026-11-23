import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { QUESTION_BANK } from '../../data/mockData';
import { getDifficultyRecommendation, useEdu } from '../../context/EduContext';
import { normalizeErrorClassification } from '../../lib/learnerModel';
import type { DifficultyLevel, ErrorClassification } from '../../types/edu';

const DIFFICULTIES: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export const AdaptiveQuestionsScreen: React.FC = () => {
  const {
    concepts,
    weakestConcept,
    selectedConceptId,
    submitAdaptiveAnswer,
    openVerificationModal,
    navigate,
  } = useEdu();

  const initialConcept =
    concepts.find((c) => c.id === selectedConceptId) ?? weakestConcept;

  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    getDifficultyRecommendation(initialConcept.mastery),
  );
  const [conceptFilter, setConceptFilter] = useState<string>(initialConcept.id);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [result, setResult] = useState<{
    isCorrect: boolean;
    classification: string;
    masteryDelta: number;
    feedback: string;
  } | null>(null);

  const filteredQuestions = useMemo(() => {
    const exact = QUESTION_BANK.filter(
      (q) =>
        (conceptFilter === 'all' || q.conceptId === conceptFilter) &&
        q.difficulty === difficulty,
    );
    if (exact.length > 0) return exact;
    const byConcept = QUESTION_BANK.filter(
      (q) => conceptFilter === 'all' || q.conceptId === conceptFilter,
    );
    return byConcept.length > 0 ? byConcept : QUESTION_BANK;
  }, [conceptFilter, difficulty]);

  const currentQuestion = filteredQuestions[questionIdx % filteredQuestions.length];
  const activeConcept =
    concepts.find((c) => c.id === currentQuestion.conceptId) ?? weakestConcept;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = submitAdaptiveAnswer(currentQuestion, selectedOption, reasoning);
    setResult(res);
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption('');
    setReasoning('');
    setQuestionIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Adaptive Practice</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {activeConcept.name} ({activeConcept.mastery}%)
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Practice & Reasoning
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 self-start">
          <select
            aria-label="Filter by concept"
            value={conceptFilter}
            onChange={(e) => {
              setConceptFilter(e.target.value);
              setQuestionIdx(0);
              setResult(null);
              setSelectedOption('');
            }}
            className="rounded-xl border border-white/15 bg-[#0D1733] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            <option value="all">All Concepts</option>
            {concepts
              .filter((c) => c.status !== 'locked')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mastery}%)
                </option>
              ))}
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0D1733] p-1">
            {DIFFICULTIES.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setDifficulty(lvl);
                  setResult(null);
                  setSelectedOption('');
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  difficulty === lvl
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-cyan-300" />
            <span className="font-semibold text-white">{currentQuestion.conceptName}</span>
            <span aria-hidden="true">·</span>
            <span>{currentQuestion.difficulty}</span>
          </div>
          <span className="font-mono tabular-nums">
            {(questionIdx % filteredQuestions.length) + 1} / {filteredQuestions.length}
          </span>
        </div>

        <h2 className="font-display text-lg sm:text-xl font-semibold text-white leading-relaxed">
          {currentQuestion.prompt}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentQuestion.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={result !== null}
                    onClick={() => setSelectedOption(opt)}
                    className={`rounded-xl border p-4 text-left text-sm font-medium transition cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/15 text-white'
                        : 'border-white/15 bg-[#091228] text-slate-300 hover:border-white/30'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label
              htmlFor="adaptive-reasoning"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Explain Your Reasoning
            </label>
            <textarea
              id="adaptive-reasoning"
              rows={3}
              disabled={result !== null}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain the physics principle behind your answer..."
              className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {!result && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  currentQuestion.type === 'reasoning'
                    ? reasoning.trim().length < 8
                    : !selectedOption
                }
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
              >
                <span>Submit Answer</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>

        {result && (
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              result.isCorrect
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-rose-400/40 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className={`flex items-center gap-2 font-display text-base font-bold ${
                  result.isCorrect ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {result.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span>
                  {result.isCorrect ? 'Correct' : 'Review Needed'} ·{' '}
                  {result.classification}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-white tabular-nums">
                {result.masteryDelta >= 0 ? `+${result.masteryDelta}` : result.masteryDelta}%
                {' '}({activeConcept.mastery}%)
              </span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">{result.feedback}</p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setConceptFilter(weakestConcept.id);
                  setDifficulty(getDifficultyRecommendation(weakestConcept.mastery));
                  handleNext();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => openVerificationModal(currentQuestion.conceptId)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verify Understanding</span>
              </button>

              {!result.isCorrect && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('lab', { conceptId: currentQuestion.conceptId })}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />
                    <span>3D Lab</span>
                  </button>
                  {normalizeErrorClassification(
                    result.classification as ErrorClassification,
                  ) === 'Conceptual misconception' && (
                    <button
                      type="button"
                      onClick={() => navigate('mentor')}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 cursor-pointer"
                    >
                      <span>AI Mentor</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
