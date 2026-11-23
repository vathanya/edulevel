import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { DIAGNOSTIC_QUESTIONS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';

export const DiagnosticScreen: React.FC = () => {
  const { applyDiagnosticResults, concepts, navigate } = useEdu();

  const [step, setStep] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(3);
  const [reasoning, setReasoning] = useState<string>('');
  const [answers, setAnswers] = useState<
    Array<{
      conceptId: string;
      conceptName: string;
      correct: boolean;
      confidence: number;
      reasoning: string;
    }>
  >([]);
  const [completed, setCompleted] = useState<boolean>(false);

  const currentQ = DIAGNOSTIC_QUESTIONS[step];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    const entry = {
      conceptId: currentQ.conceptId,
      conceptName: currentQ.conceptName,
      correct: selectedOption === currentQ.correctOption,
      confidence,
      reasoning,
    };
    const nextAnswers = [...answers, entry];
    setAnswers(nextAnswers);
    setSelectedOption('');
    setConfidence(3);
    setReasoning('');

    if (step + 1 < DIAGNOSTIC_QUESTIONS.length) {
      setStep(step + 1);
    } else {
      applyDiagnosticResults(nextAnswers);
      setCompleted(true);
    }
  };

  if (completed) {
    const weakPath = concepts
      .filter((c) => c.mastery < 70)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3);

    return (
      <div className="mx-auto w-full max-w-[960px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <div className="rounded-3xl border border-cyan-400/30 bg-[#0D1733] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Diagnostic Complete</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Initial Mastery Report
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {answers.map((ans) => {
              const liveConcept = concepts.find((c) => c.id === ans.conceptId);
              return (
                <div
                  key={ans.conceptId}
                  className="rounded-2xl border border-white/10 bg-[#091228] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Confidence {ans.confidence}/5</span>
                    <span className={ans.correct ? 'text-emerald-300' : 'text-rose-300'}>
                      {ans.correct ? 'Correct' : 'Review'}
                    </span>
                  </div>
                  <div className="font-display text-base font-bold text-white">
                    {ans.conceptName}
                  </div>
                  <div className="font-mono text-xl font-bold text-cyan-300 tabular-nums">
                    {liveConcept?.mastery ?? 50}%
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5 space-y-3">
            <div className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-cyan-300" />
              <span>Recommended Path</span>
            </div>
            <ol className="space-y-2 text-sm text-slate-200">
              {weakPath.map((c, idx) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span>
                    <strong className="font-mono text-cyan-300 mr-2">
                      0{idx + 1}.
                    </strong>
                    {c.name} ({c.mastery}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('lab', { conceptId: c.id })}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer whitespace-nowrap"
                  >
                    Open Lab →
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('world')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <span>Enter World</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('lab')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 cursor-pointer"
            >
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              <span>3D Lab</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Diagnostic</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Concept Check
          </h1>
        </div>
        <span className="font-mono text-sm text-cyan-300 tabular-nums">
          {step + 1} / {DIAGNOSTIC_QUESTIONS.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-all duration-300"
          style={{
            width: `${((step + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%`,
          }}
        />
      </div>

      <form
        onSubmit={handleNext}
        className="rounded-2xl border border-white/15 bg-[#0D1733] p-6 sm:p-8 space-y-6"
      >
        <div>
          <div className="text-xs font-semibold text-cyan-300">{currentQ.conceptName}</div>
          <h2 className="font-display text-xl font-semibold text-white mt-1 leading-relaxed">
            {currentQ.prompt}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQ.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSelectedOption(opt)}
              className={`rounded-xl border p-4 text-left text-sm font-medium transition cursor-pointer ${
                selectedOption === opt
                  ? 'border-cyan-400 bg-cyan-400/15 text-white'
                  : 'border-white/15 bg-[#091228] text-slate-300 hover:border-white/30'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Confidence Rating */}
        <div className="rounded-xl border border-white/10 bg-[#091228] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Confidence</span>
            <span className="font-mono text-cyan-300 tabular-nums">{confidence} / 5</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setConfidence(num)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                  confidence === num
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="diag-reason"
            className="block text-xs font-semibold text-slate-300 mb-1.5"
          >
            Reasoning (Optional)
          </label>
          <textarea
            id="diag-reason"
            rows={2}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Why did you pick this option?"
            className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedOption}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
          >
            <span>
              {step + 1 < DIAGNOSTIC_QUESTIONS.length ? 'Next' : 'Finish'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
