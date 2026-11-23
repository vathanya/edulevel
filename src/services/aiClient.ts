import type {
  CounterfactualChallenge,
  DifficultyLevel,
  ErrorClassification,
  ExperimentId,
  ExperimentRecommendation,
  ExplainConceptResult,
  ExplanationMode,
  QuestionItem,
  TeacherInsightsResult,
  TeacherStudentRecord,
} from '../types/edu';
import { buildAnonymizedClassroomSummary } from '../lib/learnerModel';

export class AiApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `AI request failed (${res.status})`;
    const code = typeof data.code === 'string' ? data.code : 'AI_REQUEST_FAILED';
    throw new AiApiError(msg, res.status, code);
  }
  return data as T;
}

export async function fetchAiHealth(): Promise<{
  ok: boolean;
  configured: boolean;
  model: string;
}> {
  const res = await fetch('/api/ai/health');
  if (!res.ok) {
    throw new AiApiError('Unable to check AI service status.', res.status, 'HEALTH_FAILED');
  }
  return res.json();
}

export interface AnalyzeReasoningPayload {
  question: string;
  selectedAnswer?: string;
  explanation?: string;
  rawTranscript?: string;
  expectedAnswer?: string;
  conceptId?: string;
  conceptName?: string;
  learningHistory?: Array<{
    conceptName: string;
    classification: string;
    scorePercent: number;
  }>;
}

export interface AnalyzeReasoningResponse {
  classification: ErrorClassification;
  misconceptionIdentified: boolean;
  specificMisconception: string;
  confidence: number;
  reasoningEvidence: string;
  shortExplanation: string;
  followUpQuestion: string;
  recommendedAction: string;
  recommendedExperimentId: ExperimentId;
  detectedConcept: string;
  targetConceptId: string;
  originalTranscript?: string;
  cleanedTranscript?: string;
}

export function requestReasoningAnalysis(
  payload: AnalyzeReasoningPayload,
): Promise<AnalyzeReasoningResponse> {
  return postJson<AnalyzeReasoningResponse>('/api/ai/analyze-reasoning', payload);
}

export function requestAdaptiveQuestion(payload: {
  conceptId: string;
  masteryLevel: number;
  previousMistakes?: string[];
  difficulty: DifficultyLevel;
  questionType: 'multiple-choice' | 'numerical' | 'conceptual' | 'reasoning';
  previousPrompts?: string[];
}): Promise<QuestionItem> {
  return postJson<QuestionItem>('/api/ai/generate-question', payload);
}

export function requestConceptExplanation(payload: {
  conceptId: string;
  mode: ExplanationMode;
  studentDifficulty?: string;
  differentApproach?: boolean;
  previousExplanation?: string;
}): Promise<ExplainConceptResult> {
  return postJson<ExplainConceptResult>('/api/ai/explain-concept', payload);
}

export function requestExperimentRecommendation(payload: {
  conceptId: string;
  detectedMisconception?: string;
  masteryLevel?: number;
}): Promise<ExperimentRecommendation> {
  return postJson<ExperimentRecommendation>('/api/ai/recommend-experiment', payload);
}

export function requestCounterfactualChallenge(payload: {
  conceptId: string;
  lastExperimentSummary: string;
  voltage?: number;
  resistance?: number;
}): Promise<CounterfactualChallenge> {
  return postJson<CounterfactualChallenge>('/api/ai/counterfactual-challenge', payload);
}

export function requestEvaluateUnderstanding(payload: {
  contextType: 'counterfactual' | 'mastery-gate';
  conceptId: string;
  scenarioOrPrompt: string;
  selectedChoice?: string;
  expectedChoice?: string;
  evaluationCriteria?: string;
  studentExplanation: string;
}): Promise<{
  passed: boolean;
  classification: ErrorClassification;
  confidence: number;
  feedback: string;
  missingElement?: string;
}> {
  return postJson('/api/ai/evaluate-understanding', payload);
}

export function requestTeacherInsights(
  students: TeacherStudentRecord[],
): Promise<TeacherInsightsResult> {
  // Always strip PII client-side as well before transmission
  const anonymized = buildAnonymizedClassroomSummary(students);
  return postJson<TeacherInsightsResult>('/api/ai/teacher-insights', anonymized);
}
