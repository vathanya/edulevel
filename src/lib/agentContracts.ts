import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_BASELINE_MASTERY,
  INITIAL_CONCEPTS,
  INITIAL_HISTORY,
  INITIAL_INTERVENTIONS,
  INITIAL_LEARNING_TIMELINE,
  INITIAL_MISCONCEPTION,
  INITIAL_NOTIFICATIONS,
  INITIAL_VERIFICATION_RECORDS,
} from '../data/mockData';
import type {
  AgentActivityEntry,
  AgentId,
  CanonicalErrorClassification,
  CounterfactualChallenge,
  CounterfactualResult,
  DifficultyLevel,
  ExperimentId,
  LabExperimentResult,
  OrchestratedLearnerState,
  ScopedAgentContext,
  StudentProfile,
  StudentView,
} from '../types/edu';

export const DEFAULT_STUDENT_ID = 'stu-aanya-verma';

export const DEFAULT_PROFILE: StudentProfile = {
  name: 'Aanya Verma',
  grade: 'Class 10 · Science Explorer',
  level: 7,
  xp: 1840,
  streak: 7,
  dailyGoalMinutes: 25,
  soundEffects: true,
  adaptiveHints: true,
};

export const DEFAULT_LAB_RESULT: LabExperimentResult = {
  voltage: 12,
  resistance: 6,
  current: 2,
  power: 24,
  observationsCount: 1,
  completed: false,
};

export const DEFAULT_COUNTERFACTUAL: CounterfactualResult = {
  completed: false,
  passed: false,
  selectedChoice: '',
  explanation: '',
  feedback: '',
};

export const DEFAULT_COUNTERFACTUAL_CHALLENGE: CounterfactualChallenge = {
  id: 'cf-seed-ohms-1',
  basedOnExperiment: 'Measured current I = V / R across changing resistor and voltage values',
  targetConceptId: 'ohms-law',
  scenario:
    'If resistance stays constant at 6 Ω and battery voltage increases from 6 V to 18 V, what happens to the circuit current?',
  changedCondition: 'Voltage tripled (6 V → 18 V), Resistance fixed (6 Ω)',
  choices: [
    'Current increases proportionally',
    'Current drops to zero',
    'Current stays unchanged',
    'Resistance rises automatically',
  ],
  expectedChoice: 'Current increases proportionally',
  evaluationCriteria:
    'Explain that with resistance constant, current is directly proportional to potential difference (I = V / R).',
  source: 'seed',
};

export const SEED_AGENT_ACTIVITY: AgentActivityEntry[] = [
  {
    id: 'act-seed-5',
    agentId: 'revision-insights',
    agentName: 'Revision & Insights Agent',
    stepNumber: 11,
    status: 'completed',
    message: 'Next revision scheduled.',
    conceptId: 'potential-difference',
    timestamp: '45m ago',
    isoTimestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
    source: 'deterministic',
  },
  {
    id: 'act-seed-4',
    agentId: 'adaptive',
    agentName: 'Adaptive Learning Agent',
    stepNumber: 6,
    status: 'active',
    message: 'Personalised experiment recommended.',
    conceptId: 'resistance',
    timestamp: '22m ago',
    isoTimestamp: new Date(Date.now() - 22 * 60_000).toISOString(),
    source: 'deterministic',
  },
  {
    id: 'act-seed-3',
    agentId: 'reasoning',
    agentName: 'Reasoning Agent',
    stepNumber: 4,
    status: 'attention',
    message: 'Possible misconception identified.',
    conceptId: 'resistance',
    timestamp: '20m ago',
    isoTimestamp: new Date(Date.now() - 20 * 60_000).toISOString(),
    source: 'deterministic',
  },
  {
    id: 'act-seed-2',
    agentId: 'learner-model',
    agentName: 'Learner Model Agent',
    stepNumber: 2,
    status: 'completed',
    message: 'Concept mastery updated.',
    conceptId: 'ohms-law',
    timestamp: '18m ago',
    isoTimestamp: new Date(Date.now() - 18 * 60_000).toISOString(),
    source: 'deterministic',
  },
  {
    id: 'act-seed-1',
    agentId: 'diagnostic',
    agentName: 'Diagnostic Agent',
    stepNumber: 1,
    status: 'completed',
    message: 'Initial assessment completed.',
    conceptId: 'electric-current',
    timestamp: '1h ago',
    isoTimestamp: new Date(Date.now() - 60 * 60_000).toISOString(),
    source: 'deterministic',
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createInitialOrchestratedState(
  studentId = DEFAULT_STUDENT_ID,
): OrchestratedLearnerState {
  return {
    studentId,
    profile: clone(DEFAULT_PROFILE),
    concepts: clone(INITIAL_CONCEPTS),
    baselineMastery: clone(INITIAL_BASELINE_MASTERY),
    misconceptions: clone([INITIAL_MISCONCEPTION]),
    history: clone(INITIAL_HISTORY),
    achievements: clone(INITIAL_ACHIEVEMENTS),
    notifications: clone(INITIAL_NOTIFICATIONS),
    teacherInterventions: clone(INITIAL_INTERVENTIONS),
    labResult: clone(DEFAULT_LAB_RESULT),
    counterfactualResult: clone(DEFAULT_COUNTERFACTUAL),
    activeCounterfactual: clone(DEFAULT_COUNTERFACTUAL_CHALLENGE),
    activeExperimentRec: null,
    masteryGateUnlocked: false,
    diagnosticCompleted: false,
    verificationRecords: clone(INITIAL_VERIFICATION_RECORDS),
    learningTimeline: clone(INITIAL_LEARNING_TIMELINE),
    readTeacherNotifIds: [],
    appliedSuggestionIds: [],
    agentActivity: clone(SEED_AGENT_ACTIVITY),
    orchestratorMode: 'deterministic',
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// SCOPED AGENT CONTEXT BUILDERS
// Each agent receives ONLY the minimal scoped fields it needs + consistent IDs.
// ============================================================================

export function buildScopedAgentContext(
  state: OrchestratedLearnerState,
  conceptId: string,
  extras?: {
    answer?: string;
    reasoning?: string;
    misconceptionEvidence?: string;
    recommendedActivity?: string;
  },
): ScopedAgentContext {
  const targetConcept = state.concepts.find((c) => c.id === conceptId);
  const previousAttempts = state.history
    .filter((h) => h.conceptId === conceptId)
    .slice(0, 5)
    .map((h) => ({
      title: h.title,
      classification: h.classification,
      scorePercent: h.scorePercent,
    }));

  return {
    studentId: state.studentId,
    conceptId,
    currentMastery: targetConcept?.mastery ?? 45,
    previousAttempts,
    verificationStatus: state.verificationRecords[conceptId]?.status,
    ...(extras?.answer !== undefined ? { answer: extras.answer } : {}),
    ...(extras?.reasoning !== undefined ? { reasoning: extras.reasoning } : {}),
    ...(extras?.misconceptionEvidence !== undefined
      ? { misconceptionEvidence: extras.misconceptionEvidence }
      : {}),
    ...(extras?.recommendedActivity !== undefined
      ? { recommendedActivity: extras.recommendedActivity }
      : {}),
  };
}

export function assertScopedContext(
  ctx: ScopedAgentContext,
  expectedStudentId: string,
): ScopedAgentContext {
  if (!ctx.studentId || ctx.studentId !== expectedStudentId) {
    throw new Error(
      `Scoped context studentId mismatch: expected "${expectedStudentId}", got "${ctx.studentId}".`,
    );
  }
  if (!ctx.conceptId || typeof ctx.conceptId !== 'string') {
    throw new Error('Scoped context requires a non-empty conceptId.');
  }
  if (
    typeof ctx.currentMastery !== 'number' ||
    Number.isNaN(ctx.currentMastery) ||
    ctx.currentMastery < 0 ||
    ctx.currentMastery > 100
  ) {
    throw new Error('Scoped context currentMastery must be between 0 and 100.');
  }
  return ctx;
}

// ============================================================================
// VALIDATED AGENT JSON OUTPUT CONTRACTS
// ============================================================================

export interface DiagnosticAgentOutput {
  agentId: 'diagnostic';
  studentId: string;
  assessedConcepts: Array<{
    conceptId: string;
    initialMastery: number;
    confidence: number;
    retention: number;
    strengthCategory: 'strong' | 'moderate' | 'weak';
  }>;
  strongConceptIds: string[];
  weakConceptIds: string[];
  summary: string;
}

export interface ReasoningAgentOutput {
  agentId: 'reasoning';
  studentId: string;
  conceptId: string;
  classification: CanonicalErrorClassification;
  misconceptionIdentified: boolean;
  misconceptionCorrected: boolean;
  specificMisconception: string;
  reasoningEvidence: string;
  confidence: number;
  followUpQuestion: string;
  shortExplanation: string;
  recommendedExperimentId: ExperimentId;
  detectedConcept: string;
  originalTranscript?: string;
  cleanedTranscript?: string;
  source: 'gemini' | 'deterministic';
}

export interface AdaptiveAgentOutput {
  agentId: 'adaptive';
  studentId: string;
  conceptId: string;
  recommendedDifficulty: DifficultyLevel;
  recommendedActivity: string;
  recommendedView: StudentView;
  recommendedExperimentId: ExperimentId;
  needsVerificationCheck: boolean;
  reason: string;
}

export interface LearnerModelAgentOutput {
  agentId: 'learner-model';
  studentId: string;
  conceptId: string;
  masteryBefore: number;
  masteryAfter: number;
  masteryDelta: number;
  verificationStatus: string;
  unlockedBadgeIds: string[];
}

export interface RevisionInsightsAgentOutput {
  agentId: 'revision-insights';
  studentId: string;
  conceptId: string;
  revisionUrgency: string;
  nextRevisionDate: string;
  strugglingCount: number;
  improvedCount: number;
  unverifiedCount: number;
  emittedNotifications: number;
}

const VALID_CANONICAL: readonly CanonicalErrorClassification[] = [
  'Correct conceptual understanding',
  'Conceptual misconception',
  'Calculation or arithmetic error',
  'Incomplete reasoning',
  'Insufficient evidence',
];

export function validateReasoningAgentOutput(
  payload: unknown,
  expectedStudentId: string,
): ReasoningAgentOutput {
  const rec = payload as Partial<ReasoningAgentOutput> | null;
  if (!rec || rec.agentId !== 'reasoning' || rec.studentId !== expectedStudentId) {
    throw new Error('Invalid ReasoningAgentOutput: studentId or agentId mismatch.');
  }
  if (!rec.conceptId || !VALID_CANONICAL.includes(rec.classification as CanonicalErrorClassification)) {
    throw new Error('Invalid ReasoningAgentOutput: classification or conceptId invalid.');
  }
  if (typeof rec.confidence !== 'number' || rec.confidence < 0 || rec.confidence > 100) {
    throw new Error('Invalid ReasoningAgentOutput: confidence out of bounds.');
  }
  return rec as ReasoningAgentOutput;
}

export function validateAdaptiveAgentOutput(
  payload: unknown,
  expectedStudentId: string,
): AdaptiveAgentOutput {
  const rec = payload as Partial<AdaptiveAgentOutput> | null;
  if (!rec || rec.agentId !== 'adaptive' || rec.studentId !== expectedStudentId) {
    throw new Error('Invalid AdaptiveAgentOutput: studentId or agentId mismatch.');
  }
  if (!rec.conceptId || !rec.recommendedActivity || !rec.recommendedView) {
    throw new Error('Invalid AdaptiveAgentOutput: missing recommended activity/view.');
  }
  return rec as AdaptiveAgentOutput;
}

export function validateLearnerModelAgentOutput(
  payload: unknown,
  expectedStudentId: string,
): LearnerModelAgentOutput {
  const rec = payload as Partial<LearnerModelAgentOutput> | null;
  if (!rec || rec.agentId !== 'learner-model' || rec.studentId !== expectedStudentId) {
    throw new Error('Invalid LearnerModelAgentOutput: studentId or agentId mismatch.');
  }
  if (typeof rec.masteryBefore !== 'number' || typeof rec.masteryAfter !== 'number') {
    throw new Error('Invalid LearnerModelAgentOutput: mastery numbers required.');
  }
  return rec as LearnerModelAgentOutput;
}

export function formatAgentLabel(agentId: AgentId): string {
  switch (agentId) {
    case 'diagnostic':
      return 'Diagnostic Agent';
    case 'learner-model':
      return 'Learner Model Agent';
    case 'reasoning':
      return 'Reasoning Agent';
    case 'adaptive':
      return 'Adaptive Learning Agent';
    case 'revision-insights':
      return 'Revision & Insights Agent';
  }
}
