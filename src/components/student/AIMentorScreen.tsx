import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { ASSETS } from '../../data/assets';
import { useEdu } from '../../context/EduContext';
import { SafeImage } from '../shared/SafeImage';
import {
  normalizeErrorClassification,
  prepareVoiceTranscript,
} from '../../lib/learnerModel';
import { AiApiError } from '../../services/aiClient';
import type {
  CanonicalErrorClassification,
  ExplainConceptResult,
  ExplanationMode,
} from '../../types/edu';

const CLASSIFICATION_STYLES: Record<
  CanonicalErrorClassification,
  {
    color: string;
    bg: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  'Correct conceptual understanding': {
    color: 'text-emerald-300',
    bg: 'border-emerald-400/35 bg-emerald-500/10',
    Icon: CheckCircle2,
  },
  'Conceptual misconception': {
    color: 'text-rose-300',
    bg: 'border-rose-400/35 bg-rose-500/10',
    Icon: AlertTriangle,
  },
  'Calculation or arithmetic error': {
    color: 'text-amber-300',
    bg: 'border-amber-400/35 bg-amber-500/10',
    Icon: Calculator,
  },
  'Incomplete reasoning': {
    color: 'text-indigo-300',
    bg: 'border-indigo-400/35 bg-indigo-500/10',
    Icon: Sparkles,
  },
  'Insufficient evidence': {
    color: 'text-sky-300',
    bg: 'border-sky-400/35 bg-sky-500/10',
    Icon: HelpCircle,
  },
};

const EXPLANATION_MODES: Array<{ id: ExplanationMode; label: string }> = [
  { id: 'simple', label: 'Simple' },
  { id: 'step-by-step', label: 'Step-by-Step' },
  { id: 'real-world', label: 'Real-World' },
  { id: 'analogy', label: 'Analogy' },
];

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const AIMentorScreen: React.FC = () => {
  const {
    activeMisconception,
    misconceptions,
    concepts,
    activeExperimentRec,
    orchestratorMode,
    setOrchestratorMode,
    analyzeMentorResponseAsync,
    explainConceptAsync,
    recommendExperimentAsync,
    navigate,
  } = useEdu();

  const [targetConceptId, setTargetConceptId] = useState<string>(
    activeMisconception.targetConceptId || 'resistance',
  );
  const [selectedQuestion, setSelectedQuestion] = useState<string>(
    activeMisconception.question,
  );
  const [answerDraft, setAnswerDraft] = useState<string>(
    activeMisconception.studentAnswer,
  );
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [rawVoiceTranscript, setRawVoiceTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Personalised AI Teaching state
  const [expMode, setExpMode] = useState<ExplanationMode>('simple');
  const [expResult, setExpResult] = useState<ExplainConceptResult | null>(null);
  const [expLoading, setExpLoading] = useState<boolean>(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Experiment Recommendation loading/error
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const latest = misconceptions[0] ?? activeMisconception;
  const classMeta =
    CLASSIFICATION_STYLES[normalizeErrorClassification(latest.classification)];
  const ClassIcon = classMeta.Icon;

  const voicePreview = rawVoiceTranscript
    ? prepareVoiceTranscript(rawVoiceTranscript)
    : null;

  const runAnalysis = async (preferGemini?: boolean) => {
    const textToSend = voiceMode
      ? rawVoiceTranscript.trim() || answerDraft.trim()
      : answerDraft.trim();
    if (!textToSend) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      await analyzeMentorResponseAsync({
        question: selectedQuestion,
        explanation: voiceMode ? undefined : textToSend,
        rawTranscript: voiceMode ? textToSend : undefined,
        conceptId: targetConceptId,
        preferGemini,
      });
    } catch (err) {
      setAnalyzeError(
        err instanceof AiApiError
          ? err.message
          : 'Unable to analyze reasoning with Gemini right now.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAnalysis();
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    setVoiceMode(true);

    if (!SpeechCtor) {
      // Browser lacks Web Speech API: open transcript input ready for Wispr Flow / pasted speech
      setAnalyzeError(null);
      if (!rawVoiceTranscript) {
        setRawVoiceTranscript(
          'Um, when resistance increases and uh voltage stays the same, I think current, like, drops because resistance opposes charge flow in I = V / R.',
        );
      }
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript ?? '';
        if (spoken) {
          setRawVoiceTranscript(spoken);
          setAnswerDraft(prepareVoiceTranscript(spoken).cleanedTranscript);
        }
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleExplainMode = async (
    mode: ExplanationMode,
    differentApproach = false,
    preferGemini?: boolean,
  ) => {
    setExpMode(mode);
    setExpLoading(true);
    setExpError(null);
    try {
      const res = await explainConceptAsync({
        conceptId: targetConceptId,
        mode,
        studentDifficulty: latest.possibleMisconception,
        differentApproach,
        previousExplanation: differentApproach ? expResult?.explanation : undefined,
        preferGemini,
      });
      setExpResult(res);
    } catch (err) {
      setExpError(
        err instanceof AiApiError
          ? err.message
          : 'Unable to generate personalised explanation.',
      );
    } finally {
      setExpLoading(false);
    }
  };

  const handleRequestExperimentRec = async (preferGemini?: boolean) => {
    setRecLoading(true);
    setRecError(null);
    try {
      await recommendExperimentAsync(
        targetConceptId,
        latest.possibleMisconception,
        preferGemini,
      );
    } catch (err) {
      setRecError(
        err instanceof AiApiError ? err.message : 'Unable to fetch experiment recommendation.',
      );
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
            <Brain className="h-4 w-4" />
            <span>
              {orchestratorMode === 'gemini'
                ? 'Gemini AI Reasoning Mentor'
                : '5-Agent Reasoning Mentor'}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Reasoning & Misconception Check
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

          <select
            aria-label="Target physics concept"
            value={targetConceptId}
            onChange={(e) => setTargetConceptId(e.target.value)}
            className="rounded-xl border border-white/15 bg-[#0D1733] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {concepts
              .filter((c) => c.status !== 'locked')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mastery}%)
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={() => navigate('lab', { conceptId: targetConceptId })}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="h-4 w-4" />
            <span>Open 3D Lab</span>
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Dialogue & Voice Transcript */}
        <section className="lg:col-span-6 rounded-2xl border border-white/15 bg-[#0D1733] p-6 space-y-5">
          <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
            <SafeImage
              src={ASSETS.mentorAvatar}
              alt="AI Physics Mentor"
              width={1024}
              height={1024}
              fallbackLabel="PN"
              className="h-11 w-11 rounded-xl object-cover border border-cyan-400/40 bg-slate-800 shrink-0"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Prof. Newton</h2>
              <p className="text-xs text-slate-400">
                Explain your physics reasoning in text or speech
              </p>
            </div>
          </div>

          {/* Question */}
          <div className="rounded-xl border border-cyan-400/25 bg-[#091228] p-4 space-y-1.5">
            <div className="text-xs font-semibold text-cyan-300">Question</div>
            <p className="text-base font-medium text-white leading-relaxed">
              {selectedQuestion}
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleAnalyze} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceMode(false)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    !voiceMode
                      ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/35'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Typed Explanation
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMode(true)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    voiceMode
                      ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/35'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Voice Transcript
                </button>
              </div>

              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isListening
                    ? 'border-rose-400/50 bg-rose-500/20 text-rose-200'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span>Stop Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Speak / Dictate</span>
                  </>
                )}
              </button>
            </div>

            {voiceMode ? (
              <div className="space-y-2.5">
                <label
                  htmlFor="mentor-voice-raw"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Original Speech Transcript (raw voice / Wispr Flow dictation)
                </label>
                <textarea
                  id="mentor-voice-raw"
                  rows={3}
                  value={rawVoiceTranscript}
                  onChange={(e) => setRawVoiceTranscript(e.target.value)}
                  placeholder="Speak with mic or paste spoken dictation (fillers like um, uh, like are preserved here and cleaned below)..."
                  className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                {voicePreview && voicePreview.cleanedTranscript && (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs space-y-1">
                    <div className="font-semibold text-emerald-300">
                      Cleaned Transcript Sent to Gemini
                    </div>
                    <p className="text-slate-100">{voicePreview.cleanedTranscript}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="mentor-answer"
                  className="sr-only"
                >
                  Your Explanation
                </label>
                <textarea
                  id="mentor-answer"
                  rows={4}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="Explain what happens to current and why..."
                  className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            )}

            {/* Quick Test Scenarios */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400">Test Cases:</span>
              <button
                type="button"
                onClick={() => {
                  setVoiceMode(false);
                  setAnswerDraft(
                    'Current increases because more resistance allows more electricity to pass.',
                  );
                }}
                className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20 cursor-pointer"
              >
                Misconception
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceMode(false);
                  setAnswerDraft(
                    'I know I = V / R, so for 12 V and 4 ohms I multiplied 12 * 4 = 48 A.',
                  );
                }}
                className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20 cursor-pointer"
              >
                Arithmetic Error
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceMode(false);
                  setAnswerDraft('Current goes down.');
                }}
                className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-200 hover:bg-indigo-500/20 cursor-pointer"
              >
                Incomplete
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceMode(false);
                  setAnswerDraft(
                    'Resistance opposes charge flow, so at constant voltage current decreases inversely because I = V/R.',
                  );
                }}
                className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/20 cursor-pointer"
              >
                Correct
              </button>
            </div>

            {analyzeError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-semibold text-rose-100">
                    Gemini Reasoning Analysis Unavailable
                  </div>
                  <p>{analyzeError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrchestratorMode('deterministic');
                      runAnalysis(false);
                    }}
                    className="rounded-lg border border-cyan-400/35 bg-cyan-400/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                  >
                    Use 5-Agent Engine (Local)
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {orchestratorMode === 'deterministic' && (
                <button
                  type="button"
                  disabled={
                    isAnalyzing ||
                    (voiceMode ? !rawVoiceTranscript.trim() : !answerDraft.trim())
                  }
                  onClick={() => runAnalysis(true)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                >
                  Test Live Gemini API
                </button>
              )}
              <button
                type="submit"
                disabled={
                  isAnalyzing ||
                  (voiceMode ? !rawVoiceTranscript.trim() : !answerDraft.trim())
                }
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>
                  {isAnalyzing
                    ? 'Analyzing...'
                    : orchestratorMode === 'gemini'
                      ? 'Check Reasoning'
                      : 'Check Reasoning (5-Agent)'}
                </span>
              </button>
            </div>
          </form>

          {/* Personalised AI Explanations */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Personalised AI Explanation</span>
              </div>
              {expResult && (
                <button
                  type="button"
                  disabled={expLoading}
                  onClick={() => handleExplainMode(expMode, true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-purple-200 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Try Another Way</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {EXPLANATION_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={expLoading}
                  onClick={() => handleExplainMode(m.id, false)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer disabled:opacity-50 ${
                    expMode === m.id && expResult
                      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
                      : 'border-white/10 bg-[#091228] text-slate-300 hover:border-white/25'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {expLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-300 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                <span>Generating syllabus-grounded explanation...</span>
              </div>
            )}

            {expError && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-2">
                <p>{expError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOrchestratorMode('deterministic');
                    handleExplainMode(expMode, false, false);
                  }}
                  className="rounded-lg border border-cyan-400/35 bg-cyan-400/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                >
                  Use 5-Agent Engine (Local)
                </button>
              </div>
            )}

            {expResult && !expLoading && (
              <div className="rounded-xl border border-cyan-400/20 bg-[#091228] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-cyan-300 font-semibold">
                  <span>Mode: {expResult.mode}</span>
                  {expResult.keyFormula && (
                    <span className="font-mono text-amber-300">{expResult.keyFormula}</span>
                  )}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {expResult.explanation}
                </p>
                <div className="pt-1 text-purple-200">
                  <strong>Quick check:</strong> {expResult.checkQuestion}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Analysis & Experiment Recommendation */}
        <section className="lg:col-span-6 rounded-2xl border border-white/15 bg-[#0D1733] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-white">Analysis</h2>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  latest.source === 'gemini'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : latest.source === 'orchestrator'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : 'bg-slate-700/60 text-slate-300 border border-white/10'
                }`}
              >
                {latest.source === 'gemini'
                  ? 'Live Gemini'
                  : latest.source === 'orchestrator'
                    ? '5-Agent Engine'
                    : 'Sample Demo Seed'}
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">
              {latest.confidence}% Confidence
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${classMeta.bg}`}>
            <div
              className={`flex items-center gap-2 font-display text-base font-bold ${classMeta.color}`}
            >
              <ClassIcon className="h-5 w-5 shrink-0" />
              <span>{latest.classification}</span>
            </div>
            <p className="mt-1 text-sm text-slate-200">{latest.possibleMisconception}</p>
          </div>

          {latest.originalTranscript && latest.cleanedTranscript && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-[#091228] p-3">
                <div className="text-slate-400 font-semibold mb-1">Original Speech</div>
                <p className="text-slate-300">{latest.originalTranscript}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-[#091228] p-3">
                <div className="text-emerald-300 font-semibold mb-1">Cleaned Transcript</div>
                <p className="text-white">{latest.cleanedTranscript}</p>
              </div>
            </div>
          )}

          <dl className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-[#091228] p-3.5">
              <dt className="text-xs text-slate-400">Concept</dt>
              <dd className="font-semibold text-white mt-0.5">{latest.detectedConcept}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#091228] p-3.5">
              <dt className="text-xs text-slate-400">Reasoning Evidence</dt>
              <dd className="text-slate-200 mt-0.5">{latest.reasoningEvidence}</dd>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <dt className="text-xs text-cyan-300">Recommended Next Step</dt>
                <dd className="font-semibold text-white mt-0.5">
                  {latest.recommendedAction}
                </dd>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(latest.recommendedView, { conceptId: latest.targetConceptId })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </dl>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <h3 className="text-xs font-semibold text-emerald-300">Explanation</h3>
              <p className="mt-1 text-sm text-slate-200 leading-relaxed">
                {latest.explanation}
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/25 bg-purple-500/10 p-4">
              <div className="text-xs font-semibold text-purple-300">Follow-Up Probe</div>
              <p className="mt-1 text-sm text-white">{latest.followUpQuestion}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedQuestion(latest.followUpQuestion);
                  setAnswerDraft('');
                  setRawVoiceTranscript('');
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-200 hover:text-white cursor-pointer"
              >
                <span>Answer follow-up</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Experiment Recommendation Card */}
            <div className="rounded-xl border border-white/10 bg-[#091228] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <FlaskConical className="h-4 w-4" />
                  <span>AI Experiment Recommendation</span>
                </div>
                <button
                  type="button"
                  disabled={recLoading}
                  onClick={() => handleRequestExperimentRec()}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer disabled:opacity-50"
                >
                  {recLoading ? 'Finding...' : 'Get Lab Plan'}
                </button>
              </div>

              {recError && (
                <div className="space-y-1.5 text-xs text-rose-300">
                  <p>{recError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrchestratorMode('deterministic');
                      handleRequestExperimentRec(false);
                    }}
                    className="rounded-lg border border-cyan-400/35 bg-cyan-400/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                  >
                    Use 5-Agent Engine (Local)
                  </button>
                </div>
              )}

              {activeExperimentRec ? (
                <div className="space-y-1.5 text-xs text-slate-200">
                  <div className="font-semibold text-white">{activeExperimentRec.title}</div>
                  <p>{activeExperimentRec.learningObjective}</p>
                  <div className="text-slate-400">
                    Variables: {activeExperimentRec.variablesToManipulate.join(' · ')}
                  </div>
                  <p className="text-emerald-300">
                    Expected: {activeExperimentRec.expectedObservation}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('lab', { conceptId: activeExperimentRec.targetConceptId })
                    }
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/15 border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                  >
                    <span>Launch in 3D Lab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Click “Get Lab Plan” or submit reasoning to receive a targeted 3D lab plan.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
