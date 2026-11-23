import { EXPERIMENT_CATALOG } from '../../server/syllabus';
import {
  buildScopedAgentContext,
  assertScopedContext,
  type AdaptiveAgentOutput,
  type DiagnosticAgentOutput,
  type LearnerModelAgentOutput,
  type ReasoningAgentOutput,
  type RevisionInsightsAgentOutput,
  validateAdaptiveAgentOutput,
  validateLearnerModelAgentOutput,
  validateReasoningAgentOutput,
} from './agentContracts';
import {
  calculateOhmsLaw,
  computeNextRevision,
  normalizeErrorClassification,
  prepareVoiceTranscript,
  updateBktMastery,
} from './learnerModel';
import {
  buildTeacherInsights,
  evaluateSmartAchievements,
  evaluateVerificationResponse,
  type VerificationEvaluationResult,
} from '../utils/learningEngine';
import type {
  AchievementBadge,
  AgentActivityEntry,
  AgentActivityStatus,
  AgentId,
  AssessmentHistoryItem,
  CanonicalErrorClassification,
  ConceptNode,
  CounterfactualChallenge,
  CounterfactualResult,
  DifficultyLevel,
  ExperimentId,
  ExperimentRecommendation,
  LearningStatus,
  LearningTimelineEvent,
  MisconceptionAnalysis,
  NotificationCategory,
  NotificationItem,
  OrchestratedLearnerState,
  OrchestratorWorkflowAction,
  QuestionItem,
  ScopedAgentContext,
  StudentView,
} from '../types/edu';

export interface OrchestratorGeminiAdapters {
  analyzeReasoning?: (payload: {
    question: string;
    selectedAnswer?: string;
    explanation?: string;
    rawTranscript?: string;
    conceptId?: string;
    learningHistory?: Array<{
      conceptName: string;
      classification: string;
      scorePercent: number;
    }>;
  }) => Promise<{
    classification: CanonicalErrorClassification;
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
  }>;
  recommendExperiment?: (payload: {
    conceptId: string;
    detectedMisconception?: string;
    masteryLevel?: number;
  }) => Promise<ExperimentRecommendation>;
  generateCounterfactual?: (payload: {
    conceptId: string;
    lastExperimentSummary: string;
    voltage?: number;
    resistance?: number;
  }) => Promise<CounterfactualChallenge>;
  evaluateUnderstanding?: (payload: {
    contextType: 'counterfactual' | 'mastery-gate';
    conceptId: string;
    scenarioOrPrompt: string;
    selectedChoice?: string;
    expectedChoice?: string;
    evaluationCriteria?: string;
    studentExplanation: string;
  }) => Promise<{
    passed: boolean;
    classification: CanonicalErrorClassification;
    confidence: number;
    feedback: string;
    missingElement?: string;
  }>;
}

export interface OrchestratorRunResult {
  nextState: OrchestratedLearnerState;
  agentLogs: AgentActivityEntry[];
  actionResult: Record<string, unknown>;
}

function nowTimeLabel(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function makeActivity(params: {
  agentId: AgentId;
  agentName: string;
  stepNumber: number;
  status: AgentActivityStatus;
  message: string;
  conceptId?: string;
  source?: 'gemini' | 'deterministic';
}): AgentActivityEntry {
  return {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    agentId: params.agentId,
    agentName: params.agentName,
    stepNumber: params.stepNumber,
    status: params.status,
    message: params.message,
    conceptId: params.conceptId,
    timestamp: 'Just now',
    isoTimestamp: new Date().toISOString(),
    source: params.source ?? 'deterministic',
  };
}

function appendNotification(
  list: NotificationItem[],
  input: {
    title: string;
    detail: string;
    targetView: StudentView;
    category: NotificationCategory;
    conceptId?: string;
  },
): NotificationItem[] {
  const duplicate = list.some(
    (n) => !n.read && n.title === input.title && n.category === input.category,
  );
  if (duplicate) return list;
  const item: NotificationItem = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    title: input.title,
    detail: input.detail,
    timeLabel: 'Just now',
    read: false,
    targetView: input.targetView,
    category: input.category,
    conceptId: input.conceptId,
  };
  return [item, ...list].slice(0, 18);
}

function appendTimeline(
  list: LearningTimelineEvent[],
  evt: Omit<LearningTimelineEvent, 'id' | 'timestamp'>,
): LearningTimelineEvent[] {
  return [
    {
      ...evt,
      id: `tl-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: 'Just now',
    },
    ...list,
  ].slice(0, 40);
}

function getDifficultyForMastery(mastery: number): DifficultyLevel {
  if (mastery < 45) return 'Beginner';
  if (mastery < 75) return 'Intermediate';
  return 'Advanced';
}

function pickExperimentForConcept(
  conceptId: string,
  misconception?: string,
): ExperimentRecommendation {
  const exp =
    EXPERIMENT_CATALOG.find((e) => e.conceptIds.includes(conceptId)) ??
    EXPERIMENT_CATALOG[0];
  return {
    experimentId: exp.experimentId,
    title: exp.title,
    targetConceptId: conceptId,
    learningObjective: misconception
      ? `Test and overturn misconception ("${misconception}") empirically using live bench parameters.`
      : exp.defaultObjective,
    variablesToManipulate: exp.variables,
    expectedObservation:
      conceptId === 'resistance'
        ? 'As rheostat resistance increases at constant battery voltage, circuit current decreases proportionally (I = V / R).'
        : 'Current changes linearly with voltage when conductor resistance stays constant.',
    followUpQuestion: `After recording 3 readings in ${exp.title}, explain why the meter changed in your own words.`,
  };
}

// ============================================================================
// AGENT 1: DIAGNOSTIC AGENT
// ============================================================================

export const DiagnosticAgent = {
  evaluateDiagnostic(
    ctx: ScopedAgentContext,
    results: Array<{
      conceptId: string;
      correct: boolean;
      confidence: number;
      reasoning: string;
    }>,
  ): DiagnosticAgentOutput {
    assertScopedContext(ctx, ctx.studentId);
    const assessedConcepts = results.map((res) => {
      const reasoningBonus = res.reasoning.trim().length > 18 ? 10 : 0;
      const initialMastery = res.correct
        ? Math.min(92, 68 + res.confidence * 3 + reasoningBonus)
        : Math.max(24, 42 - res.confidence * 2);
      const strengthCategory: 'strong' | 'moderate' | 'weak' =
        initialMastery >= 75 ? 'strong' : initialMastery >= 50 ? 'moderate' : 'weak';
      return {
        conceptId: res.conceptId,
        initialMastery,
        confidence: Math.min(96, Math.max(20, res.confidence * 18)),
        retention: res.correct ? 78 : 42,
        strengthCategory,
      };
    });

    return {
      agentId: 'diagnostic',
      studentId: ctx.studentId,
      assessedConcepts,
      strongConceptIds: assessedConcepts
        .filter((a) => a.strengthCategory === 'strong')
        .map((a) => a.conceptId),
      weakConceptIds: assessedConcepts
        .filter((a) => a.strengthCategory === 'weak')
        .map((a) => a.conceptId),
      summary: `Assessed ${assessedConcepts.length} concepts: ${assessedConcepts.filter((a) => a.strengthCategory === 'strong').length} strong, ${assessedConcepts.filter((a) => a.strengthCategory === 'weak').length} weak.`,
    };
  },
};

// ============================================================================
// AGENT 3: REASONING AND MISCONCEPTION AGENT
// ============================================================================

export const ReasoningMisconceptionAgent = {
  evaluateMentorExplanationDeterministic(
    ctx: ScopedAgentContext,
    params: {
      question: string;
      explanation?: string;
      rawTranscript?: string;
      previousMisconception?: string;
      conceptName: string;
    },
  ): ReasoningAgentOutput {
    assertScopedContext(ctx, ctx.studentId);
    const voiceData = params.rawTranscript
      ? prepareVoiceTranscript(params.rawTranscript)
      : null;
    const text = (voiceData ? voiceData.cleanedTranscript : params.explanation ?? '').trim();
    const lower = text.toLowerCase();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    let classification: CanonicalErrorClassification = 'Insufficient evidence';
    let misconceptionIdentified = false;
    let specificMisconception = 'Explanation is too brief to verify.';
    let reasoningEvidence = 'Explain how resistance affects charge flow at fixed voltage.';
    let confidence = 64;
    let shortExplanation =
      'Connect cause and effect using I = V / R: hold V constant, vary R, and explain what happens to current.';
    let recommendedExperimentId: ExperimentId = 'resistance-rheostat';

    if (text.length < 16 || wordCount < 4) {
      classification = 'Insufficient evidence';
      confidence = 62;
      specificMisconception = 'Insufficient reasoning provided to diagnose understanding.';
      reasoningEvidence = `Only ${wordCount} words supplied.`;
    } else if (
      (lower.includes('increase') || lower.includes('more') || lower.includes('higher')) &&
      (lower.includes('more electricity') ||
        lower.includes('more current') ||
        lower.includes('allows more'))
    ) {
      classification = 'Conceptual misconception';
      misconceptionIdentified = true;
      confidence = 91;
      specificMisconception = 'Assumes higher resistance increases current at constant voltage';
      reasoningEvidence = 'States resistance increases current rather than opposing charge flow.';
      shortExplanation =
        'Resistance opposes charge flow. At constant voltage, higher resistance lowers current because I = V / R.';
      recommendedExperimentId = 'resistance-rheostat';
    } else if (
      /\b(multiply|v\s*\*\s*r|v\s*x\s*r|24|96|48|subtract|minus)\b/.test(lower) &&
      !lower.includes('divide')
    ) {
      classification = 'Calculation or arithmetic error';
      misconceptionIdentified = false;
      confidence = 87;
      specificMisconception =
        'No conceptual misconception; multiplied V × R instead of dividing V / R';
      reasoningEvidence = 'Recognizes variables V and R but inverted the division step I = V / R.';
      shortExplanation = 'Check formula rearrangement: divide Voltage by Resistance (I = V ÷ R).';
      recommendedExperimentId = 'ohms-law-bench';
    } else if (
      (lower.includes('decrease') ||
        lower.includes('drop') ||
        lower.includes('smaller') ||
        lower.includes('less') ||
        lower.includes('halve') ||
        lower.includes('invers') ||
        lower.includes('oppos')) &&
      (lower.includes('oppos') ||
        lower.includes('i = v/r') ||
        lower.includes('i=v/r') ||
        lower.includes('i = v / r') ||
        lower.includes('divide') ||
        lower.includes('constant') ||
        lower.includes('invers') ||
        lower.includes('flow'))
    ) {
      classification = 'Correct conceptual understanding';
      misconceptionIdentified = false;
      confidence = 94;
      specificMisconception = 'No confirmed misconception';
      reasoningEvidence = 'Links opposition to charge flow with inverse proportionality I = V / R.';
      shortExplanation =
        'Clear causal reasoning — you connected higher resistance to lower current at fixed voltage.';
      recommendedExperimentId = 'ohms-law-bench';
    } else if (
      lower.includes('decrease') ||
      lower.includes('drop') ||
      lower.includes('less') ||
      lower.includes('smaller')
    ) {
      classification = 'Incomplete reasoning';
      misconceptionIdentified = false;
      confidence = 72;
      specificMisconception = 'Direction stated without physical causal mechanism';
      reasoningEvidence = 'Predicted lower current, but did not explain why via opposition or I = V / R.';
      shortExplanation =
        'Your direction is plausible — add why (e.g., resistance opposes drifting charges so I = V / R drops).';
      recommendedExperimentId = 'resistance-rheostat';
    } else {
      classification = 'Conceptual misconception';
      misconceptionIdentified = true;
      confidence = 79;
      specificMisconception = 'Unclear causal link between V, R, and I';
      reasoningEvidence = 'Does not establish inverse proportionality between R and I.';
      recommendedExperimentId = 'resistance-rheostat';
    }

    const misconceptionCorrected =
      classification === 'Correct conceptual understanding' &&
      Boolean(params.previousMisconception);

    const followUpQuestion =
      classification === 'Correct conceptual understanding'
        ? 'Now suppose resistance stays constant and voltage doubles from 6 V to 12 V. How will bulb brightness and current respond?'
        : 'Look at I = V / R: if V = 12 V stays fixed and R rises from 4 Ω to 12 Ω, does 12 / R become larger or smaller?';

    return validateReasoningAgentOutput(
      {
        agentId: 'reasoning',
        studentId: ctx.studentId,
        conceptId: ctx.conceptId,
        classification,
        misconceptionIdentified,
        misconceptionCorrected,
        specificMisconception,
        reasoningEvidence,
        confidence,
        followUpQuestion,
        shortExplanation,
        recommendedExperimentId,
        detectedConcept: params.conceptName,
        ...(voiceData
          ? {
              originalTranscript: voiceData.originalTranscript,
              cleanedTranscript: voiceData.cleanedTranscript,
            }
          : {}),
        source: 'deterministic',
      } satisfies ReasoningAgentOutput,
      ctx.studentId,
    );
  },

  async evaluateMentorExplanation(
    ctx: ScopedAgentContext,
    params: {
      question: string;
      explanation?: string;
      rawTranscript?: string;
      previousMisconception?: string;
      conceptName: string;
      learningHistory: Array<{
        conceptName: string;
        classification: string;
        scorePercent: number;
      }>;
    },
    geminiAnalyzer?: OrchestratorGeminiAdapters['analyzeReasoning'],
  ): Promise<ReasoningAgentOutput> {
    assertScopedContext(ctx, ctx.studentId);

    if (geminiAnalyzer) {
      try {
        const aiRes = await geminiAnalyzer({
          question: params.question,
          explanation: params.explanation,
          rawTranscript: params.rawTranscript,
          conceptId: ctx.conceptId,
          learningHistory: params.learningHistory,
        });
        const classification = normalizeErrorClassification(aiRes.classification);
        const misconceptionCorrected =
          classification === 'Correct conceptual understanding' &&
          Boolean(params.previousMisconception);

        return validateReasoningAgentOutput(
          {
            agentId: 'reasoning',
            studentId: ctx.studentId,
            conceptId: ctx.conceptId,
            classification,
            misconceptionIdentified: aiRes.misconceptionIdentified,
            misconceptionCorrected,
            specificMisconception: aiRes.specificMisconception,
            reasoningEvidence: aiRes.reasoningEvidence,
            confidence: aiRes.confidence,
            followUpQuestion: aiRes.followUpQuestion,
            shortExplanation: aiRes.shortExplanation,
            recommendedExperimentId: aiRes.recommendedExperimentId,
            detectedConcept: aiRes.detectedConcept,
            originalTranscript: aiRes.originalTranscript,
            cleanedTranscript: aiRes.cleanedTranscript,
            source: 'gemini',
          } satisfies ReasoningAgentOutput,
          ctx.studentId,
        );
      } catch {
        // Fall through cleanly to deterministic Reasoning Agent if live Gemini is unavailable
      }
    }

    return ReasoningMisconceptionAgent.evaluateMentorExplanationDeterministic(ctx, params);
  },

  evaluateAdaptiveAttempt(
    ctx: ScopedAgentContext,
    question: QuestionItem,
    selectedAnswer: string,
    reasoningText: string,
  ): ReasoningAgentOutput & { isCorrect: boolean; scorePercent: number } {
    assertScopedContext(ctx, ctx.studentId);
    const trimmed = reasoningText.trim();
    const lower = trimmed.toLowerCase();
    const hasCausal =
      trimmed.length >= 16 &&
      /(collision|resist|temperature|heat|length|oppos|inverse|proportion|divide|parallel|solenoid|v\/r|v \/ r|i =|work|charge|second|conservation)/.test(
        lower,
      );

    const isCorrect =
      question.type === 'reasoning' ? hasCausal : selectedAnswer === question.correctAnswer;

    let classification: CanonicalErrorClassification = 'Correct conceptual understanding';
    let specificMisconception = 'No confirmed misconception';
    let misconceptionIdentified = false;
    let confidence = 90;

    if (!isCorrect) {
      if (question.type === 'reasoning' && trimmed.length < 14) {
        classification = 'Insufficient evidence';
        specificMisconception = 'Explanation too brief to evaluate.';
        confidence = 58;
      } else if (
        question.arithmeticOptions?.includes(selectedAnswer) ||
        (question.type === 'numerical' &&
          !question.misconceptionOptions?.includes(selectedAnswer) &&
          question.arithmeticHint)
      ) {
        classification = 'Calculation or arithmetic error';
        specificMisconception = question.arithmeticHint ?? 'Arithmetic or unit conversion slip.';
        confidence = 86;
      } else {
        classification = 'Conceptual misconception';
        misconceptionIdentified = true;
        specificMisconception =
          question.conceptTrap ?? `Conceptual confusion in ${question.conceptName}`;
        confidence = 89;
      }
    } else if (trimmed.length < 12) {
      classification = 'Incomplete reasoning';
      specificMisconception = 'Answer selected accurately; explain causal step to verify.';
      confidence = 72;
    }

    const output = validateReasoningAgentOutput(
      {
        agentId: 'reasoning',
        studentId: ctx.studentId,
        conceptId: question.conceptId,
        classification,
        misconceptionIdentified,
        misconceptionCorrected:
          classification === 'Correct conceptual understanding' &&
          Boolean(ctx.misconceptionEvidence),
        specificMisconception,
        reasoningEvidence: isCorrect
          ? trimmed || 'Selected conceptually valid outcome.'
          : `Selected "${selectedAnswer}" instead of "${question.correctAnswer}"${trimmed ? ` — "${trimmed}"` : ''}.`,
        confidence,
        followUpQuestion: `Why does ${question.conceptName} follow "${question.correctAnswer}"?`,
        shortExplanation: question.explanation,
        recommendedExperimentId:
          question.conceptId === 'resistance' ? 'resistance-rheostat' : 'ohms-law-bench',
        detectedConcept: question.conceptName,
        source: 'deterministic',
      } satisfies ReasoningAgentOutput,
      ctx.studentId,
    );

    const scorePercent = isCorrect
      ? 100
      : classification === 'Calculation or arithmetic error'
        ? 45
        : classification === 'Insufficient evidence'
          ? 30
          : 15;

    return { ...output, isCorrect, scorePercent };
  },
};

// ============================================================================
// AGENT 4: ADAPTIVE LEARNING AGENT
// ============================================================================

export const AdaptiveLearningAgent = {
  recommendNext(
    ctx: ScopedAgentContext,
    classification: CanonicalErrorClassification,
    misconceptionText?: string,
  ): AdaptiveAgentOutput {
    assertScopedContext(ctx, ctx.studentId);
    const difficulty = getDifficultyForMastery(ctx.currentMastery);
    const exp = pickExperimentForConcept(ctx.conceptId, misconceptionText);

    let recommendedActivity = 'Practice adaptive questions';
    let recommendedView: StudentView = 'questions';
    let needsVerificationCheck = false;
    let reason = `Adjusted next activity difficulty to ${difficulty} based on ${ctx.currentMastery}% mastery.`;

    if (classification === 'Conceptual misconception' || ctx.currentMastery < 52) {
      recommendedActivity = `Run ${exp.title}`;
      recommendedView = ctx.conceptId === 'resistance' || ctx.conceptId === 'ohms-law' ? 'lab' : 'mentor';
      reason = `Misconception evidence detected on ${ctx.conceptId}; hands-on interactive experiment prescribed before re-testing.`;
    } else if (classification === 'Calculation or arithmetic error') {
      recommendedActivity = `Formula & ratio drills (${difficulty})`;
      recommendedView = 'questions';
      reason = 'Conceptual model intact; targeted calculation drills assigned without heavy mastery penalty.';
    } else if (
      classification === 'Incomplete reasoning' ||
      classification === 'Insufficient evidence'
    ) {
      recommendedActivity = 'Socratic causal reasoning check';
      recommendedView = 'mentor';
      reason = 'Prompting deeper cause-and-effect explanation before advancing difficulty.';
    } else if (
      ctx.verificationStatus !== 'Understanding Verified' &&
      ctx.verificationStatus !== 'Mastery Achieved'
    ) {
      recommendedActivity = '2-Situation Understanding Verification';
      recommendedView = 'progress';
      needsVerificationCheck = true;
      reason = 'Concept answer accurate; multi-situation transfer check needed to verify understanding.';
    } else {
      recommendedActivity = 'Challenge Arena Counterfactual';
      recommendedView = 'counterfactual';
      reason = `Mastery verified at ${ctx.currentMastery}%; advancing to transfer challenge.`;
    }

    return validateAdaptiveAgentOutput(
      {
        agentId: 'adaptive',
        studentId: ctx.studentId,
        conceptId: ctx.conceptId,
        recommendedDifficulty: difficulty,
        recommendedActivity,
        recommendedView,
        recommendedExperimentId: exp.experimentId,
        needsVerificationCheck,
        reason,
      } satisfies AdaptiveAgentOutput,
      ctx.studentId,
    );
  },
};

// ============================================================================
// AGENT 2: LEARNER MODEL AGENT (SINGLE AUTHORITATIVE PROFILE/MASTERY WRITER)
// ============================================================================

export const LearnerModelAgent = {
  applyDiagnosticBaselines(
    state: OrchestratedLearnerState,
    diagOut: DiagnosticAgentOutput,
  ): {
    nextState: OrchestratedLearnerState;
    modelOut: LearnerModelAgentOutput;
  } {
    const updatedBaselines = { ...state.baselineMastery };
    const assessedMap = new Map(diagOut.assessedConcepts.map((a) => [a.conceptId, a]));

    const nextConcepts = state.concepts.map((c) => {
      const match = assessedMap.get(c.id);
      if (!match) {
        return c.islandId === 'human-eye' ? { ...c, status: 'available' as LearningStatus } : c;
      }
      updatedBaselines[c.id] = Math.min(
        updatedBaselines[c.id] ?? match.initialMastery,
        match.initialMastery,
      );
      const schedule = computeNextRevision(
        match.initialMastery,
        match.retention,
        match.strengthCategory === 'weak'
          ? 'Conceptual misconception'
          : 'Correct conceptual understanding',
      );
      return {
        ...c,
        mastery: match.initialMastery,
        confidence: match.confidence,
        retention: match.retention,
        status: (match.initialMastery >= 75 ? 'completed' : 'in-progress') as LearningStatus,
        lastPracticedLabel: 'Diagnostic just now',
        revisionUrgency: schedule.urgency,
        nextRevisionDate: schedule.label,
      };
    });

    const nextXp = state.profile.xp + 100;
    const nextProfile = {
      ...state.profile,
      xp: nextXp,
      level: Math.max(1, Math.floor(nextXp / 300) + 1),
    };

    const weakestId = diagOut.weakConceptIds[0] ?? diagOut.assessedConcepts[0]?.conceptId ?? 'resistance';
    const baseTimeline = appendTimeline(state.learningTimeline, {
      conceptId: weakestId,
      conceptName: nextConcepts.find((c) => c.id === weakestId)?.name ?? 'Physics',
      eventType: 'diagnostic',
      title: 'Diagnostic Baseline Calibrated',
      summary: diagOut.summary,
      masteryBefore: state.concepts.find((c) => c.id === weakestId)?.mastery ?? 40,
      masteryAfter: nextConcepts.find((c) => c.id === weakestId)?.mastery ?? 40,
    });

    const intermediate: OrchestratedLearnerState = {
      ...state,
      concepts: nextConcepts,
      baselineMastery: updatedBaselines,
      diagnosticCompleted: true,
      profile: nextProfile,
      learningTimeline: baseTimeline,
      updatedAt: new Date().toISOString(),
    };

    const { nextState, unlockedIds } = applySmartAchievements(intermediate);
    const focusBefore = state.concepts.find((c) => c.id === weakestId)?.mastery ?? 40;
    const focusAfter = nextState.concepts.find((c) => c.id === weakestId)?.mastery ?? 40;

    return {
      nextState,
      modelOut: validateLearnerModelAgentOutput(
        {
          agentId: 'learner-model',
          studentId: state.studentId,
          conceptId: weakestId,
          masteryBefore: focusBefore,
          masteryAfter: focusAfter,
          masteryDelta: focusAfter - focusBefore,
          verificationStatus:
            nextState.verificationRecords[weakestId]?.status ?? 'Learning in Progress',
          unlockedBadgeIds: unlockedIds,
        },
        state.studentId,
      ),
    };
  },

  applyReasoningEvidence(
    state: OrchestratedLearnerState,
    params: {
      conceptId: string;
      classification: CanonicalErrorClassification;
      confidence: number;
      difficulty?: DifficultyLevel;
      xpAward?: number;
      timelineEvent?: Omit<LearningTimelineEvent, 'id' | 'timestamp'>;
      historyItem?: AssessmentHistoryItem;
      misconceptionRecord?: MisconceptionAnalysis;
      resolveConceptMisconceptions?: boolean;
      markLabCompleted?: boolean;
      markPracticeCompleted?: boolean;
      markGateCompleted?: boolean;
    },
  ): {
    nextState: OrchestratedLearnerState;
    modelOut: LearnerModelAgentOutput;
  } {
    const target = state.concepts.find((c) => c.id === params.conceptId);
    const beforeMastery = target?.mastery ?? 45;

    const bkt = updateBktMastery({
      currentMastery: beforeMastery,
      currentConfidence: target?.confidence ?? 50,
      currentRetention: target?.retention ?? 50,
      classification: params.classification,
      aiConfidence: params.confidence,
      difficulty: params.difficulty,
    });

    const nextConcepts: ConceptNode[] = state.concepts.map((c) => {
      if (c.id !== params.conceptId) return c;
      const unlockedStatus: LearningStatus =
        bkt.mastery >= 75
          ? 'completed'
          : c.status === 'locked' && !params.markGateCompleted
            ? 'locked'
            : 'in-progress';
      return {
        ...c,
        mastery: bkt.mastery,
        confidence: bkt.confidence,
        retention: bkt.retention,
        status: unlockedStatus,
        lastPracticedLabel: 'Just now',
        revisionUrgency: bkt.revisionUrgency,
        nextRevisionDate: bkt.nextRevisionDate,
        activities: c.activities.map((a) => {
          if (params.markLabCompleted && a.type === 'lab') return { ...a, completed: true };
          if (params.markPracticeCompleted && a.type === 'practice') return { ...a, completed: true };
          if (params.markGateCompleted && a.type === 'gate') return { ...a, completed: true };
          return a;
        }),
      };
    });

    let nextMisconceptions = state.misconceptions;
    if (params.misconceptionRecord) {
      nextMisconceptions = [params.misconceptionRecord, ...nextMisconceptions].slice(0, 20);
    }
    if (params.resolveConceptMisconceptions) {
      nextMisconceptions = nextMisconceptions.map((m) =>
        m.targetConceptId === params.conceptId ? { ...m, resolved: true } : m,
      );
    }

    const nextHistory = params.historyItem
      ? [params.historyItem, ...state.history].slice(0, 30)
      : state.history;

    const nextTimeline = params.timelineEvent
      ? appendTimeline(state.learningTimeline, {
          ...params.timelineEvent,
          masteryBefore: beforeMastery,
          masteryAfter: bkt.mastery,
        })
      : state.learningTimeline;

    const gainedXp = params.xpAward ?? 0;
    const nextXp = state.profile.xp + gainedXp;
    const nextProfile = {
      ...state.profile,
      xp: nextXp,
      level: Math.max(1, Math.floor(nextXp / 300) + 1),
    };

    const intermediate: OrchestratedLearnerState = {
      ...state,
      concepts: nextConcepts,
      misconceptions: nextMisconceptions,
      history: nextHistory,
      learningTimeline: nextTimeline,
      profile: nextProfile,
      updatedAt: new Date().toISOString(),
    };

    const { nextState, unlockedIds } = applySmartAchievements(intermediate);

    return {
      nextState,
      modelOut: validateLearnerModelAgentOutput(
        {
          agentId: 'learner-model',
          studentId: state.studentId,
          conceptId: params.conceptId,
          masteryBefore: beforeMastery,
          masteryAfter: bkt.mastery,
          masteryDelta: bkt.masteryDelta,
          verificationStatus:
            nextState.verificationRecords[params.conceptId]?.status ?? 'Learning in Progress',
          unlockedBadgeIds: unlockedIds,
        },
        state.studentId,
      ),
    };
  },
};

function applySmartAchievements(state: OrchestratedLearnerState): {
  nextState: OrchestratedLearnerState;
  unlockedIds: string[];
} {
  const newlyUnlocked = evaluateSmartAchievements({
    achievements: state.achievements,
    concepts: state.concepts,
    baselineMastery: state.baselineMastery,
    verificationRecords: state.verificationRecords,
    misconceptions: state.misconceptions,
    labResult: state.labResult,
    counterfactualResult: state.counterfactualResult,
    masteryGateUnlocked: state.masteryGateUnlocked,
    streakDays: state.profile.streak,
  });

  if (newlyUnlocked.length === 0) {
    return { nextState: state, unlockedIds: [] };
  }

  const unlockMap = new Map(newlyUnlocked.map((u) => [u.badgeId, u.reason]));
  let bonusXp = 0;
  let nextNotifications = state.notifications;
  const unlockedIds: string[] = [];

  const nextAchievements: AchievementBadge[] = state.achievements.map((badge) => {
    const reason = unlockMap.get(badge.id);
    if (!reason || badge.unlocked) return badge;
    bonusXp += badge.xpBonus;
    unlockedIds.push(badge.id);
    nextNotifications = appendNotification(nextNotifications, {
      title: `Achievement Unlocked: ${badge.title}`,
      detail: `${reason} (+${badge.xpBonus} XP)`,
      targetView: 'rewards',
      category: 'achievement',
    });
    return {
      ...badge,
      unlocked: true,
      unlockedAt: 'Just now',
      unlockReason: reason,
    };
  });

  const nextXp = state.profile.xp + bonusXp;
  return {
    unlockedIds,
    nextState: {
      ...state,
      achievements: nextAchievements,
      notifications: nextNotifications,
      profile: {
        ...state.profile,
        xp: nextXp,
        level: Math.max(1, Math.floor(nextXp / 300) + 1),
      },
    },
  };
}

// ============================================================================
// AGENT 5: REVISION AND TEACHER INSIGHTS AGENT
// ============================================================================

export const RevisionTeacherInsightsAgent = {
  scheduleAndRefreshInsights(
    state: OrchestratedLearnerState,
    conceptId: string,
    classification: CanonicalErrorClassification,
  ): {
    nextState: OrchestratedLearnerState;
    output: RevisionInsightsAgentOutput;
  } {
    const concept = state.concepts.find((c) => c.id === conceptId);
    const schedule = computeNextRevision(
      concept?.mastery ?? 50,
      concept?.retention ?? 50,
      classification,
    );

    const nextConcepts = state.concepts.map((c) =>
      c.id === conceptId
        ? {
            ...c,
            revisionUrgency: schedule.urgency,
            nextRevisionDate: schedule.label,
          }
        : c,
    );

    let nextNotifications = state.notifications;
    let emittedNotifications = 0;

    if (schedule.urgency === 'overdue') {
      const beforeLen = nextNotifications.length;
      nextNotifications = appendNotification(nextNotifications, {
        title: `Revision due now: ${concept?.name ?? conceptId}`,
        detail: 'Spaced repetition flagged immediate recall review to prevent misconception relapse.',
        targetView: 'revision',
        category: 'revision',
        conceptId,
      });
      if (nextNotifications.length > beforeLen) emittedNotifications++;
    }

    const teacherInsights = buildTeacherInsights({
      liveStudentName: state.profile.name,
      liveConcepts: nextConcepts,
      liveVerificationRecords: state.verificationRecords,
      liveStreak: state.profile.streak,
      liveBaseline: state.baselineMastery,
    });

    return {
      nextState: {
        ...state,
        concepts: nextConcepts,
        notifications: nextNotifications,
        updatedAt: new Date().toISOString(),
      },
      output: {
        agentId: 'revision-insights',
        studentId: state.studentId,
        conceptId,
        revisionUrgency: schedule.urgency,
        nextRevisionDate: schedule.label,
        strugglingCount: teacherInsights.repeatedlyStruggling.length,
        improvedCount: teacherInsights.significantlyImproved.length,
        unverifiedCount: teacherInsights.unverifiedUnderstanding.length,
        emittedNotifications,
      },
    };
  },
};

// ============================================================================
// ORCHESTRATOR: 11-STEP COORDINATED WORKFLOW ENGINE
// ============================================================================

export async function runOrchestratorWorkflow(
  currentState: OrchestratedLearnerState,
  action: OrchestratorWorkflowAction,
  adapters?: OrchestratorGeminiAdapters,
): Promise<OrchestratorRunResult> {
  const newLogs: AgentActivityEntry[] = [];
  let state = currentState;

  switch (action.type) {
    case 'diagnostic_submit': {
      const firstId = action.results[0]?.conceptId ?? 'resistance';
      const diagCtx = buildScopedAgentContext(state, firstId);
      const diagOut = DiagnosticAgent.evaluateDiagnostic(diagCtx, action.results);
      newLogs.push(
        makeActivity({
          agentId: 'diagnostic',
          agentName: 'Diagnostic Agent',
          stepNumber: 1,
          status: 'completed',
          message: `Initial assessment completed (${diagOut.strongConceptIds.length} strong, ${diagOut.weakConceptIds.length} weak).`,
          conceptId: firstId,
        }),
      );

      const { nextState, modelOut } = LearnerModelAgent.applyDiagnosticBaselines(state, diagOut);
      state = nextState;
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 2,
          status: 'completed',
          message: 'Baseline concept mastery stored.',
          conceptId: modelOut.conceptId,
        }),
      );

      const weakId = diagOut.weakConceptIds[0] ?? 'resistance';
      const adapCtx = buildScopedAgentContext(state, weakId);
      const adapOut = AdaptiveLearningAgent.recommendNext(
        adapCtx,
        'Conceptual misconception',
      );
      state = {
        ...state,
        activeExperimentRec: pickExperimentForConcept(weakId),
      };
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 3,
          status: 'active',
          message: `Personalised path set: ${adapOut.recommendedActivity}.`,
          conceptId: weakId,
        }),
      );

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        weakId,
        'Conceptual misconception',
      );
      state = {
        ...revRes.nextState,
        notifications: appendNotification(revRes.nextState.notifications, {
          title: 'Human Eye Island Unlocked via Diagnostic',
          detail: 'All islands calibrated from your diagnostic profile (+100 XP)',
          targetView: 'world',
          category: 'unlock',
        }),
      };
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: weakId,
        }),
      );

      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { diagOut, modelOut, adapOut },
      };
    }

    case 'adaptive_submit': {
      const q = action.question;
      const reasonCtx = buildScopedAgentContext(state, q.conceptId, {
        answer: action.selectedAnswer,
        reasoning: action.reasoningText,
        misconceptionEvidence: state.misconceptions.find(
          (m) => m.targetConceptId === q.conceptId && !m.resolved,
        )?.possibleMisconception,
      });

      const evalOut = ReasoningMisconceptionAgent.evaluateAdaptiveAttempt(
        reasonCtx,
        q,
        action.selectedAnswer,
        action.reasoningText,
      );

      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 4,
          status: evalOut.misconceptionIdentified ? 'attention' : 'completed',
          message: evalOut.misconceptionIdentified
            ? 'Possible misconception identified.'
            : evalOut.misconceptionCorrected
              ? 'Misconception corrected through clear reasoning.'
              : `Reasoning evaluated (${evalOut.classification}).`,
          conceptId: q.conceptId,
        }),
      );

      const misconceptionRecord: MisconceptionAnalysis | undefined =
        evalOut.classification === 'Conceptual misconception'
          ? {
              id: `mis-quiz-${Date.now()}`,
              timestamp: 'Just now',
              question: q.prompt,
              studentAnswer:
                action.selectedAnswer +
                (action.reasoningText.trim() ? ` — "${action.reasoningText.trim()}"` : ''),
              detectedConcept: q.conceptName,
              targetConceptId: q.conceptId,
              classification: evalOut.classification,
              possibleMisconception: evalOut.specificMisconception,
              reasoningEvidence: evalOut.reasoningEvidence,
              confidence: evalOut.confidence,
              recommendedAction:
                q.conceptId === 'resistance' || q.conceptId === 'ohms-law'
                  ? 'Run the 3D Ohm’s Law Resistance Experiment'
                  : `Review ${q.conceptName} in Revision Notes`,
              recommendedView:
                q.conceptId === 'resistance' || q.conceptId === 'ohms-law' ? 'lab' : 'revision',
              followUpQuestion: evalOut.followUpQuestion,
              explanation: q.explanation,
              resolved: false,
              source: 'orchestrator',
            }
          : undefined;

      const historyItem: AssessmentHistoryItem = {
        id: `hist-${Date.now()}`,
        title: `${q.conceptName} (${q.difficulty})`,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        dateLabel: 'Today',
        scorePercent: evalOut.scorePercent,
        reasoningQuality:
          evalOut.classification === 'Correct conceptual understanding'
            ? 'Strong'
            : evalOut.classification === 'Calculation or arithmetic error' || evalOut.isCorrect
              ? 'Developing'
              : 'Needs Review',
        classification: evalOut.classification,
      };

      const xpAward = evalOut.isCorrect ? (q.difficulty === 'Advanced' ? 55 : 35) : 0;
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: q.conceptId,
        classification: evalOut.classification,
        confidence: evalOut.confidence,
        difficulty: q.difficulty,
        xpAward,
        historyItem,
        misconceptionRecord,
        resolveConceptMisconceptions:
          evalOut.isCorrect && evalOut.classification === 'Correct conceptual understanding',
        markPracticeCompleted: evalOut.isCorrect,
        timelineEvent: {
          conceptId: q.conceptId,
          conceptName: q.conceptName,
          eventType: 'practice',
          title: `${q.difficulty} Practice: ${evalOut.isCorrect ? 'Causal Answer Verified' : evalOut.classification}`,
          summary: evalOut.isCorrect
            ? `Answered correctly (${evalOut.classification}). Verify understanding in a new situation.`
            : `Flagged ${evalOut.classification} during practice; follow-up recommended.`,
          masteryBefore: reasonCtx.currentMastery,
          masteryAfter: reasonCtx.currentMastery,
          misconceptionAddressed: evalOut.isCorrect ? undefined : q.conceptTrap,
        },
      });
      state = modelState;

      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: q.conceptId,
        }),
      );

      const adapCtx = buildScopedAgentContext(state, q.conceptId, {
        misconceptionEvidence: evalOut.specificMisconception,
      });
      const adapOut = AdaptiveLearningAgent.recommendNext(
        adapCtx,
        evalOut.classification,
        evalOut.specificMisconception,
      );
      if (evalOut.misconceptionIdentified) {
        state = {
          ...state,
          activeExperimentRec: pickExperimentForConcept(q.conceptId, evalOut.specificMisconception),
        };
      }
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `${adapOut.recommendedActivity} recommended.`,
          conceptId: q.conceptId,
        }),
      );

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        q.conceptId,
        evalOut.classification,
      );
      let nextNotifs = revRes.nextState.notifications;
      if (evalOut.misconceptionIdentified) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Weak concept flagged: ${q.conceptName}`,
          detail: `${evalOut.specificMisconception} — Review before advancing`,
          targetView: adapOut.recommendedView,
          category: 'weak-concept',
          conceptId: q.conceptId,
        });
      } else if (modelOut.masteryBefore < 75 && modelOut.masteryAfter >= 75) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Concept Mastery Milestone: ${q.conceptName}`,
          detail: `Reached ${modelOut.masteryAfter}% mastery! Verify across 2 new situations.`,
          targetView: 'progress',
          category: 'mastery',
          conceptId: q.conceptId,
        });
      }
      state = {
        ...revRes.nextState,
        notifications: nextNotifs,
      };
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: q.conceptId,
        }),
      );
      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...currentState.agentActivity].slice(0, 24),
      };

      const deltaText =
        modelOut.masteryDelta >= 0 ? `+${modelOut.masteryDelta}` : `${modelOut.masteryDelta}`;
      const feedback = evalOut.isCorrect
        ? `${q.explanation} (${deltaText}% mastery)`
        : evalOut.classification === 'Calculation or arithmetic error'
          ? `Formula/arithmetic error: ${q.arithmeticHint ?? q.explanation}`
          : q.explanation;

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: {
          isCorrect: evalOut.isCorrect,
          classification: evalOut.classification,
          masteryDelta: modelOut.masteryDelta,
          feedback,
          adapOut,
        },
      };
    }

    case 'mentor_analyze': {
      const targetConcept =
        state.concepts.find((c) => c.id === action.conceptId) ?? state.concepts[2];
      const priorMisc = state.misconceptions.find(
        (m) => m.targetConceptId === targetConcept.id && !m.resolved,
      )?.possibleMisconception;

      const reasonCtx = buildScopedAgentContext(state, targetConcept.id, {
        answer: action.explanation ?? action.rawTranscript ?? '',
        reasoning: action.explanation ?? action.rawTranscript ?? '',
        misconceptionEvidence: priorMisc,
      });

      const evalOut = await ReasoningMisconceptionAgent.evaluateMentorExplanation(
        reasonCtx,
        {
          question: action.question,
          explanation: action.explanation,
          rawTranscript: action.rawTranscript,
          previousMisconception: priorMisc,
          conceptName: targetConcept.name,
          learningHistory: state.history.slice(0, 6).map((h) => ({
            conceptName: h.conceptName,
            classification: h.classification,
            scorePercent: h.scorePercent,
          })),
        },
        action.preferGemini ? adapters?.analyzeReasoning : undefined,
      );

      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 4,
          status: evalOut.misconceptionIdentified ? 'attention' : 'completed',
          message: evalOut.misconceptionIdentified
            ? 'Possible misconception identified.'
            : evalOut.misconceptionCorrected
              ? 'Previous misconception corrected via causal reasoning.'
              : `Evaluated explanation: ${evalOut.classification}.`,
          conceptId: targetConcept.id,
          source: evalOut.source,
        }),
      );

      const adapCtxPreview = buildScopedAgentContext(state, targetConcept.id, {
        misconceptionEvidence: evalOut.specificMisconception,
      });
      const adapPreview = AdaptiveLearningAgent.recommendNext(
        adapCtxPreview,
        evalOut.classification,
        evalOut.specificMisconception,
      );

      const analysisRecord: MisconceptionAnalysis = {
        id: `mis-${Date.now()}`,
        timestamp: 'Just now',
        question: action.question,
        studentAnswer:
          evalOut.cleanedTranscript ??
          action.explanation?.trim() ??
          action.rawTranscript?.trim() ??
          '',
        detectedConcept: evalOut.detectedConcept,
        targetConceptId: targetConcept.id,
        classification: evalOut.classification,
        possibleMisconception: evalOut.specificMisconception,
        reasoningEvidence: evalOut.reasoningEvidence,
        confidence: evalOut.confidence,
        recommendedAction: adapPreview.recommendedActivity,
        recommendedView: adapPreview.recommendedView,
        followUpQuestion: evalOut.followUpQuestion,
        explanation: evalOut.shortExplanation,
        resolved: evalOut.classification === 'Correct conceptual understanding',
        source: evalOut.source === 'gemini' ? 'gemini' : 'orchestrator',
        originalTranscript: evalOut.originalTranscript,
        cleanedTranscript: evalOut.cleanedTranscript,
      };

      const isSound = evalOut.classification === 'Correct conceptual understanding';
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: targetConcept.id,
        classification: evalOut.classification,
        confidence: evalOut.confidence,
        xpAward: isSound ? 60 : 10,
        misconceptionRecord: analysisRecord,
        resolveConceptMisconceptions: isSound,
        timelineEvent: isSound
          ? {
              conceptId: targetConcept.id,
              conceptName: targetConcept.name,
              eventType: 'mentor',
              title: 'AI Mentor Socratic Reasoning Resolved',
              summary: 'Explained causal physics mechanism clearly in own words.',
              masteryBefore: reasonCtx.currentMastery,
              masteryAfter: reasonCtx.currentMastery,
              misconceptionAddressed: priorMisc,
            }
          : undefined,
      });
      state = modelState;

      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: targetConcept.id,
          source: evalOut.source,
        }),
      );

      let expRec: ExperimentRecommendation | null = null;
      if (action.preferGemini && adapters?.recommendExperiment) {
        try {
          expRec = await adapters.recommendExperiment({
            conceptId: targetConcept.id,
            detectedMisconception: evalOut.specificMisconception,
            masteryLevel: modelOut.masteryAfter,
          });
        } catch {
          expRec = pickExperimentForConcept(targetConcept.id, evalOut.specificMisconception);
        }
      } else {
        expRec = pickExperimentForConcept(targetConcept.id, evalOut.specificMisconception);
      }

      state = {
        ...state,
        activeExperimentRec: expRec,
      };

      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Personalised experiment recommended.',
          conceptId: targetConcept.id,
          source: evalOut.source,
        }),
      );

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        targetConcept.id,
        evalOut.classification,
      );
      let notifs = revRes.nextState.notifications;
      if (isSound) {
        notifs = appendNotification(notifs, {
          title: 'Personalized Challenge Ready',
          detail: `Verify ${targetConcept.name} across 2 new situations to lock mastery`,
          targetView: 'progress',
          category: 'challenge',
          conceptId: targetConcept.id,
        });
      } else if (evalOut.misconceptionIdentified) {
        notifs = appendNotification(notifs, {
          title: `Weak concept flagged: ${targetConcept.name}`,
          detail: `${evalOut.specificMisconception} — Test in 3D Lab`,
          targetView: 'lab',
          category: 'weak-concept',
          conceptId: targetConcept.id,
        });
      }

      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: targetConcept.id,
          source: evalOut.source,
        }),
      );

      state = {
        ...revRes.nextState,
        notifications: notifs,
        orchestratorMode: evalOut.source === 'gemini' ? 'gemini' : state.orchestratorMode,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: {
          record: analysisRecord,
          experimentRec: expRec,
          modelOut,
        },
      };
    }

    case 'recommend_experiment': {
      const target =
        state.concepts.find((c) => c.id === action.conceptId) ?? state.concepts[2];
      let rec: ExperimentRecommendation;
      let source: 'gemini' | 'deterministic' = 'deterministic';

      if (action.preferGemini && adapters?.recommendExperiment) {
        try {
          rec = await adapters.recommendExperiment({
            conceptId: target.id,
            detectedMisconception: action.detectedMisconception,
            masteryLevel: target.mastery,
          });
          source = 'gemini';
        } catch {
          rec = pickExperimentForConcept(target.id, action.detectedMisconception);
        }
      } else {
        rec = pickExperimentForConcept(target.id, action.detectedMisconception);
      }

      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `Personalised experiment recommended (${rec.title}).`,
          conceptId: target.id,
          source,
        }),
      );

      state = {
        ...state,
        activeExperimentRec: rec,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { recommendation: rec },
      };
    }

    case 'lab_observe': {
      const { current, power } = calculateOhmsLaw(action.voltage, action.resistance, true);
      state = {
        ...state,
        labResult: {
          ...state.labResult,
          voltage: action.voltage,
          resistance: action.resistance,
          current,
          power,
          observationsCount: state.labResult.observationsCount + 1,
        },
        updatedAt: new Date().toISOString(),
      };
      return {
        nextState: state,
        agentLogs: [],
        actionResult: { labResult: state.labResult },
      };
    }

    case 'lab_complete': {
      const { current, power } = calculateOhmsLaw(action.voltage, action.resistance, true);
      state = {
        ...state,
        labResult: {
          voltage: action.voltage,
          resistance: action.resistance,
          current,
          power,
          observationsCount: Math.max(state.labResult.observationsCount, 3),
          completed: true,
        },
      };

      const resResult = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: 'resistance',
        classification: 'Correct conceptual understanding',
        confidence: 88,
        difficulty: 'Intermediate',
        xpAward: 50,
        markLabCompleted: true,
        timelineEvent: {
          conceptId: 'resistance',
          conceptName: 'Resistance',
          eventType: 'lab',
          title: '3D Circuit Lab Evidence Collected',
          summary: `Measured V = ${action.voltage} V, R = ${action.resistance} Ω → I = ${current.toFixed(2)} A live in 3D bench.`,
          masteryBefore: 0,
          masteryAfter: 0,
          misconceptionAddressed: 'Observed current dropping inversely as rheostat resistance rose',
        },
      });
      state = resResult.nextState;

      const ohmResult = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: 'ohms-law',
        classification: 'Correct conceptual understanding',
        confidence: 88,
        difficulty: 'Intermediate',
        xpAward: 40,
        markLabCompleted: true,
        timelineEvent: {
          conceptId: 'ohms-law',
          conceptName: "Ohm's Law",
          eventType: 'lab',
          title: 'Ohm’s Law Bench Verification Ready',
          summary: `Logged live I = V / R observations (${current.toFixed(2)} A at ${action.voltage} V).`,
          masteryBefore: 0,
          masteryAfter: 0,
        },
      });
      state = ohmResult.nextState;

      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `3D Lab evidence updated Resistance (${resResult.modelOut.masteryAfter}%) & Ohm's Law (${ohmResult.modelOut.masteryAfter}%).`,
          conceptId: 'resistance',
        }),
      );

      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, 'ohms-law'),
        'Correct conceptual understanding',
      );
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Verification & condition-flip transfer challenge ready.',
          conceptId: 'ohms-law',
        }),
      );

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        'resistance',
        'Correct conceptual understanding',
      );
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: 'resistance',
        }),
      );

      state = {
        ...revRes.nextState,
        notifications: appendNotification(revRes.nextState.notifications, {
          title: 'Experiment Completed · Verify Understanding',
          detail: 'Test your Resistance & Ohm’s Law grasp in a new situation',
          targetView: 'progress',
          category: 'verification',
          conceptId: 'resistance',
        }),
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { labResult: state.labResult, adapOut },
      };
    }

    case 'lab_reset': {
      state = {
        ...state,
        labResult: {
          voltage: 12,
          resistance: 6,
          current: 2,
          power: 24,
          observationsCount: 1,
          completed: false,
        },
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { labResult: state.labResult } };
    }

    case 'counterfactual_generate': {
      let challenge: CounterfactualChallenge;
      let source: 'gemini' | 'deterministic' = 'deterministic';

      if (action.preferGemini && adapters?.generateCounterfactual) {
        try {
          challenge = await adapters.generateCounterfactual({
            conceptId: action.conceptId,
            lastExperimentSummary: `Measured V=${state.labResult.voltage} V, R=${state.labResult.resistance} Ω, I=${state.labResult.current} A`,
            voltage: state.labResult.voltage,
            resistance: state.labResult.resistance,
          });
          source = 'gemini';
        } catch {
          challenge = buildDeterministicCounterfactual(action.conceptId, state.labResult.resistance);
        }
      } else {
        challenge = buildDeterministicCounterfactual(action.conceptId, state.labResult.resistance);
      }

      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Counterfactual transfer challenge generated.',
          conceptId: action.conceptId,
          source,
        }),
      );

      state = {
        ...state,
        activeCounterfactual: challenge,
        counterfactualResult: {
          completed: false,
          passed: false,
          selectedChoice: '',
          explanation: '',
          feedback: '',
        },
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { challenge } };
    }

    case 'counterfactual_submit': {
      const activeCf = state.activeCounterfactual;
      let passed = false;
      let classification: CanonicalErrorClassification = 'Incomplete reasoning';
      let confidence = 78;
      let feedback = '';
      let source: 'gemini' | 'deterministic' = 'deterministic';

      if (action.preferGemini && adapters?.evaluateUnderstanding) {
        try {
          const aiEval = await adapters.evaluateUnderstanding({
            contextType: 'counterfactual',
            conceptId: activeCf.targetConceptId,
            scenarioOrPrompt: activeCf.scenario,
            selectedChoice: action.choice,
            expectedChoice: activeCf.expectedChoice,
            evaluationCriteria: activeCf.evaluationCriteria,
            studentExplanation: action.explanation,
          });
          passed = aiEval.passed;
          classification = normalizeErrorClassification(aiEval.classification);
          confidence = aiEval.confidence;
          feedback = aiEval.feedback;
          source = 'gemini';
        } catch {
          // fall back cleanly below
        }
      }

      if (source === 'deterministic') {
        const lowerExp = action.explanation.toLowerCase();
        const isChoiceCorrect = action.choice === activeCf.expectedChoice;
        const hasReason =
          action.explanation.trim().length >= 18 &&
          /(direct|proportion|v\/r|v \/ r|numerator|push|potential|higher voltage|doubles|triples|inverse|resistance)/.test(
            lowerExp,
          );
        passed = isChoiceCorrect && hasReason;
        classification = passed
          ? 'Correct conceptual understanding'
          : !isChoiceCorrect
            ? 'Conceptual misconception'
            : 'Incomplete reasoning';
        confidence = passed ? 92 : 76;
        feedback = !isChoiceCorrect
          ? `With condition "${activeCf.changedCondition}", review I = V / R: expected "${activeCf.expectedChoice}".`
          : !hasReason
            ? 'Prediction is right. Add causal physics reasoning (e.g., how V or R changes I in I = V / R).'
            : 'Transfer verified — you connected the altered physical condition to proportional current change.';
      }

      const result: CounterfactualResult = {
        completed: true,
        passed,
        selectedChoice: action.choice,
        explanation: action.explanation,
        feedback,
        classification,
      };
      state = { ...state, counterfactualResult: result };

      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: passed ? 'completed' : 'attention',
          message: passed
            ? 'Counterfactual transfer reasoning verified.'
            : 'Counterfactual reasoning needs deeper causal link.',
          conceptId: activeCf.targetConceptId,
          source,
        }),
      );

      if (passed) {
        const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
          conceptId: activeCf.targetConceptId,
          classification,
          confidence,
          difficulty: 'Advanced',
          xpAward: 120,
          resolveConceptMisconceptions: true,
          markPracticeCompleted: true,
          timelineEvent: {
            conceptId: activeCf.targetConceptId,
            conceptName:
              state.concepts.find((c) => c.id === activeCf.targetConceptId)?.name ?? "Ohm's Law",
            eventType: 'counterfactual',
            title: 'Condition Flip Transfer Challenge Passed',
            summary: 'Predicted proportional current change under modified circuit condition.',
            masteryBefore: 0,
            masteryAfter: 0,
          },
        });
        state = modelState;

        newLogs.push(
          makeActivity({
            agentId: 'learner-model',
            agentName: 'Learner Model Agent',
            stepNumber: 8,
            status: 'completed',
            message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
            conceptId: activeCf.targetConceptId,
            source,
          }),
        );

        const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
          state,
          activeCf.targetConceptId,
          classification,
        );
        state = {
          ...revRes.nextState,
          notifications: appendNotification(revRes.nextState.notifications, {
            title: 'Concept Mastery Milestone: Ohm’s Law',
            detail: `Reached ${modelOut.masteryAfter}% mastery — Mastery Gate is ready to unlock Series & Parallel`,
            targetView: 'mastery-gate',
            category: 'mastery',
            conceptId: activeCf.targetConceptId,
          }),
        };
        newLogs.push(
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
            conceptId: activeCf.targetConceptId,
            source,
          }),
        );
      }

      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { result } };
    }

    case 'mastery_gate_submit': {
      const trimmed = action.studentSummary.trim();
      let passed = false;
      let classification: CanonicalErrorClassification = 'Incomplete reasoning';
      let confidence = 75;
      let feedback = '';
      let source: 'gemini' | 'deterministic' = 'deterministic';

      if (action.preferGemini && adapters?.evaluateUnderstanding) {
        try {
          const aiEval = await adapters.evaluateUnderstanding({
            contextType: 'mastery-gate',
            conceptId: 'ohms-law',
            scenarioOrPrompt: 'Explain how potential difference V, resistance R, and current I relate in a conductor.',
            evaluationCriteria:
              'Must explain direct proportionality between V and I and inverse proportionality between R and I at constant temperature.',
            studentExplanation: trimmed,
          });
          passed = aiEval.passed;
          classification = normalizeErrorClassification(aiEval.classification);
          confidence = aiEval.confidence;
          feedback = aiEval.feedback;
          source = 'gemini';
        } catch {
          // deterministic fallback below
        }
      }

      if (source === 'deterministic') {
        const lower = trimmed.toLowerCase();
        passed =
          trimmed.length >= 20 &&
          /(direct|proportion)/.test(lower) &&
          /(inverse|oppos|restrict|resist)/.test(lower);
        classification = passed ? 'Correct conceptual understanding' : 'Incomplete reasoning';
        confidence = passed ? 93 : 68;
        feedback = passed
          ? 'Mastery Gate passed! You synthesized direct proportionality with V and inverse proportionality with R.'
          : 'Mention both direct proportionality (V ∝ I) and inverse opposition from resistance (I = V / R) to unlock.';
      }

      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: passed ? 'completed' : 'attention',
          message: passed
            ? 'Mastery Gate causal synthesis verified.'
            : 'Mastery Gate explanation needs clearer proportionality.',
          conceptId: 'ohms-law',
          source,
        }),
      );

      if (passed) {
        state = {
          ...state,
          masteryGateUnlocked: true,
          concepts: state.concepts.map((c) =>
            c.id === 'series-parallel'
              ? { ...c, status: 'available', mastery: Math.max(c.mastery, 24), nextRevisionDate: 'Nov 23' }
              : c,
          ),
        };

        const gateRes = LearnerModelAgent.applyReasoningEvidence(state, {
          conceptId: 'ohms-law',
          classification,
          confidence,
          difficulty: 'Advanced',
          xpAward: 160,
          markGateCompleted: true,
          timelineEvent: {
            conceptId: 'series-parallel',
            conceptName: 'Series and Parallel Circuits',
            eventType: 'mastery-gate',
            title: 'Mastery Gate Passed · Chapter Branch Unlocked',
            summary: 'Synthesized V, I, and R relationships to unlock Series & Parallel Circuits.',
            masteryBefore: 18,
            masteryAfter: 24,
          },
        });
        state = gateRes.nextState;

        newLogs.push(
          makeActivity({
            agentId: 'learner-model',
            agentName: 'Learner Model Agent',
            stepNumber: 8,
            status: 'completed',
            message: 'Series & Parallel Circuits unlocked and mastery updated.',
            conceptId: 'series-parallel',
            source,
          }),
        );

        const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
          state,
          'ohms-law',
          classification,
        );
        state = {
          ...revRes.nextState,
          notifications: appendNotification(revRes.nextState.notifications, {
            title: 'Chapter Node Unlocked: Series & Parallel Circuits',
            detail: 'Mastery Gate passed (+160 XP) — Begin circuit branch exploration',
            targetView: 'island-detail',
            category: 'unlock',
            conceptId: 'series-parallel',
          }),
        };

        newLogs.push(
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
            conceptId: 'ohms-law',
            source,
          }),
        );
      }

      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { passed, classification, feedback },
      };
    }

    case 'verification_submit': {
      const target = state.concepts.find((c) => c.id === action.conceptId);
      const currentMastery = target?.mastery ?? 45;
      const evalResult: VerificationEvaluationResult = evaluateVerificationResponse({
        scenario: action.scenario,
        selectedOption: action.selectedOption,
        reasoning: action.reasoning,
        existingRecord: state.verificationRecords[action.conceptId],
        conceptMastery: currentMastery,
        nowLabel: 'Just now',
      });

      const classification: CanonicalErrorClassification = evalResult.passed
        ? 'Correct conceptual understanding'
        : evalResult.issueType === 'misconception'
          ? 'Conceptual misconception'
          : evalResult.issueType === 'incomplete'
            ? 'Incomplete reasoning'
            : 'Insufficient evidence';

      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: evalResult.passed ? 'completed' : 'attention',
          message: evalResult.passed
            ? `Verification check passed (${evalResult.updatedRecord.verifiedChecksCount}/2 situations).`
            : `Verification flagged ${evalResult.issueType} reasoning.`,
          conceptId: action.conceptId,
        }),
      );

      state = {
        ...state,
        verificationRecords: {
          ...state.verificationRecords,
          [action.conceptId]: evalResult.updatedRecord,
        },
      };

      const isFullyVerified =
        evalResult.passed &&
        (evalResult.statusAfter === 'Understanding Verified' ||
          evalResult.statusAfter === 'Mastery Achieved');

      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: action.conceptId,
        classification,
        confidence: evalResult.passed ? 92 : 70,
        difficulty: 'Intermediate',
        xpAward: isFullyVerified ? 110 : evalResult.passed ? 45 : 0,
        resolveConceptMisconceptions: isFullyVerified,
        timelineEvent: {
          conceptId: action.conceptId,
          conceptName: action.scenario.conceptName,
          eventType: 'verification',
          title: `Verification (${action.scenario.situationTitle}): ${evalResult.statusAfter}`,
          summary: evalResult.feedback,
          masteryBefore: currentMastery,
          masteryAfter: currentMastery,
          misconceptionAddressed: evalResult.passed
            ? undefined
            : `Verification issue: ${evalResult.issueType}`,
        },
      });
      state = modelState;

      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 8,
          status: 'completed',
          message: `Verification status: ${evalResult.statusAfter} (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: action.conceptId,
        }),
      );

      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, action.conceptId),
        classification,
      );
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `Next step: ${adapOut.recommendedActivity}.`,
          conceptId: action.conceptId,
        }),
      );

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        action.conceptId,
        classification,
      );

      let nextNotifs = revRes.nextState.notifications;
      if (isFullyVerified) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Verification Completed: ${action.scenario.conceptName}`,
          detail: `Status updated to "${evalResult.statusAfter}" across 2 distinct situations.`,
          targetView: 'progress',
          category: 'verification',
          conceptId: action.conceptId,
        });
      } else if (!evalResult.passed) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Practice recommended: ${action.scenario.conceptName}`,
          detail: `${evalResult.recommendedAction} before re-verifying`,
          targetView: evalResult.recommendedView,
          category: 'weak-concept',
          conceptId: action.conceptId,
        });
      }

      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: action.conceptId,
        }),
      );

      state = {
        ...revRes.nextState,
        notifications: nextNotifs,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { evalResult, modelOut, adapOut },
      };
    }

    case 'revision_check': {
      const target = state.concepts.find((c) => c.id === action.conceptId);
      const classification: CanonicalErrorClassification = action.success
        ? 'Correct conceptual understanding'
        : 'Incomplete reasoning';

      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: action.conceptId,
        classification,
        confidence: action.success ? 88 : 65,
        difficulty: 'Intermediate',
        xpAward: action.success ? 45 : 20,
        timelineEvent: {
          conceptId: action.conceptId,
          conceptName: target?.name ?? action.conceptId,
          eventType: 'revision',
          title: action.success ? 'Spaced Revision Recall Confirmed' : 'Revision Scheduled for Retry',
          summary: action.success
            ? 'Boosted retention and mastery through active recall.'
            : 'Marked for follow-up spaced-repetition review.',
          masteryBefore: 0,
          masteryAfter: 0,
        },
      });
      state = modelState;

      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        action.conceptId,
        classification,
      );

      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: action.conceptId,
        }),
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: action.conceptId,
        }),
      );

      state = {
        ...revRes.nextState,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };

      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { modelOut, revision: revRes.output },
      };
    }

    case 'teacher_toggle_intervention': {
      const nextInterventions = state.teacherInterventions.map((item) =>
        item.id === action.id ? { ...item, assigned: !item.assigned } : item,
      );
      const toggled = nextInterventions.find((i) => i.id === action.id);
      if (toggled) {
        newLogs.push(
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: toggled.assigned
              ? `Teacher intervention assigned (${toggled.title}).`
              : `Teacher intervention removed (${toggled.title}).`,
            conceptId: toggled.conceptId,
          }),
        );
      }
      state = {
        ...state,
        teacherInterventions: nextInterventions,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { toggled } };
    }

    case 'teacher_toggle_suggestion': {
      const exists = state.appliedSuggestionIds.includes(action.id);
      const nextApplied = exists
        ? state.appliedSuggestionIds.filter((x) => x !== action.id)
        : [...state.appliedSuggestionIds, action.id];

      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: exists
            ? 'Teaching action unmarked from class queue.'
            : 'Teacher intervention insight queued for next lesson.',
        }),
      );

      state = {
        ...state,
        appliedSuggestionIds: nextApplied,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { appliedSuggestionIds: nextApplied } };
    }

    case 'profile_update': {
      state = {
        ...state,
        profile: { ...state.profile, ...action.patch },
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { profile: state.profile } };
    }

    case 'misconception_resolve': {
      state = {
        ...state,
        misconceptions: state.misconceptions.map((m) =>
          m.id === action.id ? { ...m, resolved: true } : m,
        ),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { resolvedId: action.id } };
    }
  }
}

function buildDeterministicCounterfactual(
  conceptId: string,
  resistance: number,
): CounterfactualChallenge {
  if (conceptId === 'resistance') {
    return {
      id: `cf-det-res-${Date.now()}`,
      basedOnExperiment: `Rheostat sweep starting from R = ${resistance} Ω`,
      targetConceptId: 'resistance',
      scenario: `You hold battery voltage fixed at 12 V and double circuit resistance from ${resistance} Ω to ${resistance * 2} Ω. What happens to current?`,
      changedCondition: `Resistance doubled (${resistance} Ω → ${resistance * 2} Ω), Voltage fixed (12 V)`,
      choices: [
        'Current decreases to half',
        'Current doubles proportionally',
        'Current stays exactly the same',
        'Battery voltage doubles automatically',
      ],
      expectedChoice: 'Current decreases to half',
      evaluationCriteria:
        'Explain inverse proportionality in I = V / R when potential difference V is constant.',
      source: 'orchestrator',
    };
  }
  return {
    id: `cf-det-ohm-${Date.now()}`,
    basedOnExperiment: `Ohm's Law bench at R = ${resistance} Ω`,
    targetConceptId: conceptId,
    scenario: `Keeping resistance constant at ${resistance} Ω, you double battery voltage from 6 V to 12 V. How does current respond?`,
    changedCondition: `Voltage doubled (6 V → 12 V), Resistance fixed (${resistance} Ω)`,
    choices: [
      'Current increases proportionally',
      'Current drops to zero',
      'Current stays unchanged',
      'Resistance doubles automatically',
    ],
    expectedChoice: 'Current increases proportionally',
    evaluationCriteria:
      'Explain direct proportionality I ∝ V when resistance stays constant (I = V / R).',
    source: 'orchestrator',
  };
}

export function runOrchestratorWorkflowSync(
  currentState: OrchestratedLearnerState,
  action: OrchestratorWorkflowAction,
): OrchestratorRunResult {
  const newLogs: AgentActivityEntry[] = [];
  let state = currentState;

  switch (action.type) {
    case 'mentor_analyze': {
      const targetConcept =
        state.concepts.find((c) => c.id === action.conceptId) ?? state.concepts[2];
      const priorMisc = state.misconceptions.find(
        (m) => m.targetConceptId === targetConcept.id && !m.resolved,
      )?.possibleMisconception;
      const reasonCtx = buildScopedAgentContext(state, targetConcept.id, {
        answer: action.explanation ?? action.rawTranscript ?? '',
        reasoning: action.explanation ?? action.rawTranscript ?? '',
        misconceptionEvidence: priorMisc,
      });
      const evalOut = ReasoningMisconceptionAgent.evaluateMentorExplanationDeterministic(
        reasonCtx,
        {
          question: action.question,
          explanation: action.explanation,
          rawTranscript: action.rawTranscript,
          previousMisconception: priorMisc,
          conceptName: targetConcept.name,
        },
      );
      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 4,
          status: evalOut.misconceptionIdentified ? 'attention' : 'completed',
          message: evalOut.misconceptionIdentified
            ? 'Possible misconception identified.'
            : evalOut.misconceptionCorrected
              ? 'Previous misconception corrected via causal reasoning.'
              : `Evaluated explanation: ${evalOut.classification}.`,
          conceptId: targetConcept.id,
          source: 'deterministic',
        }),
      );
      const adapPreview = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, targetConcept.id, {
          misconceptionEvidence: evalOut.specificMisconception,
        }),
        evalOut.classification,
        evalOut.specificMisconception,
      );
      const analysisRecord: MisconceptionAnalysis = {
        id: `mis-${Date.now()}`,
        timestamp: 'Just now',
        question: action.question,
        studentAnswer:
          evalOut.cleanedTranscript ??
          action.explanation?.trim() ??
          action.rawTranscript?.trim() ??
          '',
        detectedConcept: evalOut.detectedConcept,
        targetConceptId: targetConcept.id,
        classification: evalOut.classification,
        possibleMisconception: evalOut.specificMisconception,
        reasoningEvidence: evalOut.reasoningEvidence,
        confidence: evalOut.confidence,
        recommendedAction: adapPreview.recommendedActivity,
        recommendedView: adapPreview.recommendedView,
        followUpQuestion: evalOut.followUpQuestion,
        explanation: evalOut.shortExplanation,
        resolved: evalOut.classification === 'Correct conceptual understanding',
        source: 'orchestrator',
        originalTranscript: evalOut.originalTranscript,
        cleanedTranscript: evalOut.cleanedTranscript,
      };
      const isSound = evalOut.classification === 'Correct conceptual understanding';
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: targetConcept.id,
        classification: evalOut.classification,
        confidence: evalOut.confidence,
        xpAward: isSound ? 60 : 10,
        misconceptionRecord: analysisRecord,
        resolveConceptMisconceptions: isSound,
        timelineEvent: isSound
          ? {
              conceptId: targetConcept.id,
              conceptName: targetConcept.name,
              eventType: 'mentor',
              title: 'AI Mentor Socratic Reasoning Resolved',
              summary: 'Explained causal physics mechanism clearly in own words.',
              masteryBefore: reasonCtx.currentMastery,
              masteryAfter: reasonCtx.currentMastery,
              misconceptionAddressed: priorMisc,
            }
          : undefined,
      });
      state = modelState;
      const expRec = pickExperimentForConcept(targetConcept.id, evalOut.specificMisconception);
      state = { ...state, activeExperimentRec: expRec };
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        targetConcept.id,
        evalOut.classification,
      );
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: targetConcept.id,
        }),
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Personalised experiment recommended.',
          conceptId: targetConcept.id,
        }),
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: targetConcept.id,
        }),
      );
      state = {
        ...revRes.nextState,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: { record: analysisRecord, experimentRec: expRec, modelOut },
      };
    }

    case 'recommend_experiment': {
      const target =
        state.concepts.find((c) => c.id === action.conceptId) ?? state.concepts[2];
      const rec = pickExperimentForConcept(target.id, action.detectedMisconception);
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `Personalised experiment recommended (${rec.title}).`,
          conceptId: target.id,
        }),
      );
      state = {
        ...state,
        activeExperimentRec: rec,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { recommendation: rec } };
    }

    case 'counterfactual_generate': {
      const challenge = buildDeterministicCounterfactual(
        action.conceptId,
        state.labResult.resistance,
      );
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Counterfactual transfer challenge generated.',
          conceptId: action.conceptId,
        }),
      );
      state = {
        ...state,
        activeCounterfactual: challenge,
        counterfactualResult: {
          completed: false,
          passed: false,
          selectedChoice: '',
          explanation: '',
          feedback: '',
        },
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { challenge } };
    }

    case 'counterfactual_submit': {
      const activeCf = state.activeCounterfactual;
      const lowerExp = action.explanation.toLowerCase();
      const isChoiceCorrect = action.choice === activeCf.expectedChoice;
      const hasReason =
        action.explanation.trim().length >= 18 &&
        /(direct|proportion|v\/r|v \/ r|numerator|push|potential|higher voltage|doubles|triples|inverse|resistance)/.test(
          lowerExp,
        );
      const passed = isChoiceCorrect && hasReason;
      const classification: CanonicalErrorClassification = passed
        ? 'Correct conceptual understanding'
        : !isChoiceCorrect
          ? 'Conceptual misconception'
          : 'Incomplete reasoning';
      const feedback = !isChoiceCorrect
        ? `With condition "${activeCf.changedCondition}", review I = V / R: expected "${activeCf.expectedChoice}".`
        : !hasReason
          ? 'Prediction is right. Add causal physics reasoning (e.g., how V or R changes I in I = V / R).'
          : 'Transfer verified — you connected the altered physical condition to proportional current change.';
      const result: CounterfactualResult = {
        completed: true,
        passed,
        selectedChoice: action.choice,
        explanation: action.explanation,
        feedback,
        classification,
      };
      state = { ...state, counterfactualResult: result };
      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: passed ? 'completed' : 'attention',
          message: passed
            ? 'Counterfactual transfer reasoning verified.'
            : 'Counterfactual reasoning needs deeper causal link.',
          conceptId: activeCf.targetConceptId,
        }),
      );
      if (passed) {
        const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
          conceptId: activeCf.targetConceptId,
          classification,
          confidence: 92,
          difficulty: 'Advanced',
          xpAward: 120,
          resolveConceptMisconceptions: true,
          markPracticeCompleted: true,
          timelineEvent: {
            conceptId: activeCf.targetConceptId,
            conceptName:
              state.concepts.find((c) => c.id === activeCf.targetConceptId)?.name ?? "Ohm's Law",
            eventType: 'counterfactual',
            title: 'Condition Flip Transfer Challenge Passed',
            summary: 'Predicted proportional current change under modified circuit condition.',
            masteryBefore: 0,
            masteryAfter: 0,
          },
        });
        state = modelState;
        const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
          state,
          activeCf.targetConceptId,
          classification,
        );
        state = {
          ...revRes.nextState,
          notifications: appendNotification(revRes.nextState.notifications, {
            title: 'Concept Mastery Milestone: Ohm’s Law',
            detail: `Reached ${modelOut.masteryAfter}% mastery — Mastery Gate is ready to unlock Series & Parallel`,
            targetView: 'mastery-gate',
            category: 'mastery',
            conceptId: activeCf.targetConceptId,
          }),
        };
        newLogs.push(
          makeActivity({
            agentId: 'learner-model',
            agentName: 'Learner Model Agent',
            stepNumber: 8,
            status: 'completed',
            message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
            conceptId: activeCf.targetConceptId,
          }),
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
            conceptId: activeCf.targetConceptId,
          }),
        );
      }
      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { result } };
    }

    case 'mastery_gate_submit': {
      const trimmed = action.studentSummary.trim();
      const lower = trimmed.toLowerCase();
      const passed =
        trimmed.length >= 20 &&
        /(direct|proportion)/.test(lower) &&
        /(inverse|oppos|restrict|resist)/.test(lower);
      const classification: CanonicalErrorClassification = passed
        ? 'Correct conceptual understanding'
        : 'Incomplete reasoning';
      const feedback = passed
        ? 'Mastery Gate passed! You synthesized direct proportionality with V and inverse proportionality with R.'
        : 'Mention both direct proportionality (V ∝ I) and inverse opposition from resistance (I = V / R) to unlock.';
      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: passed ? 'completed' : 'attention',
          message: passed
            ? 'Mastery Gate causal synthesis verified.'
            : 'Mastery Gate explanation needs clearer proportionality.',
          conceptId: 'ohms-law',
        }),
      );
      if (passed) {
        state = {
          ...state,
          masteryGateUnlocked: true,
          concepts: state.concepts.map((c) =>
            c.id === 'series-parallel'
              ? { ...c, status: 'available', mastery: Math.max(c.mastery, 24), nextRevisionDate: 'Nov 23' }
              : c,
          ),
        };
        const gateRes = LearnerModelAgent.applyReasoningEvidence(state, {
          conceptId: 'ohms-law',
          classification,
          confidence: 93,
          difficulty: 'Advanced',
          xpAward: 160,
          markGateCompleted: true,
          timelineEvent: {
            conceptId: 'series-parallel',
            conceptName: 'Series and Parallel Circuits',
            eventType: 'mastery-gate',
            title: 'Mastery Gate Passed · Chapter Branch Unlocked',
            summary: 'Synthesized V, I, and R relationships to unlock Series & Parallel Circuits.',
            masteryBefore: 18,
            masteryAfter: 24,
          },
        });
        state = gateRes.nextState;
        const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
          state,
          'ohms-law',
          classification,
        );
        state = {
          ...revRes.nextState,
          notifications: appendNotification(revRes.nextState.notifications, {
            title: 'Chapter Node Unlocked: Series & Parallel Circuits',
            detail: 'Mastery Gate passed (+160 XP) — Begin circuit branch exploration',
            targetView: 'island-detail',
            category: 'unlock',
            conceptId: 'series-parallel',
          }),
        };
        newLogs.push(
          makeActivity({
            agentId: 'learner-model',
            agentName: 'Learner Model Agent',
            stepNumber: 8,
            status: 'completed',
            message: 'Series & Parallel Circuits unlocked and mastery updated.',
            conceptId: 'series-parallel',
          }),
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
            conceptId: 'ohms-law',
          }),
        );
      }
      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { passed, classification, feedback } };
    }

    default: {
      // All remaining actions (diagnostic_submit, adaptive_submit, lab_*, verification_submit, revision_check, teacher_*, profile_update, misconception_resolve) are synchronous!
      const syncHandler = runSyncCase(currentState, action);
      return syncHandler;
    }
  }
}

function runSyncCase(
  currentState: OrchestratedLearnerState,
  action: OrchestratorWorkflowAction,
): OrchestratorRunResult {
  const newLogs: AgentActivityEntry[] = [];
  let state = currentState;

  switch (action.type) {
    case 'diagnostic_submit': {
      const firstId = action.results[0]?.conceptId ?? 'resistance';
      const diagCtx = buildScopedAgentContext(state, firstId);
      const diagOut = DiagnosticAgent.evaluateDiagnostic(diagCtx, action.results);
      newLogs.push(
        makeActivity({
          agentId: 'diagnostic',
          agentName: 'Diagnostic Agent',
          stepNumber: 1,
          status: 'completed',
          message: `Initial assessment completed (${diagOut.strongConceptIds.length} strong, ${diagOut.weakConceptIds.length} weak).`,
          conceptId: firstId,
        }),
      );
      const { nextState, modelOut } = LearnerModelAgent.applyDiagnosticBaselines(state, diagOut);
      state = nextState;
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 2,
          status: 'completed',
          message: 'Baseline concept mastery stored.',
          conceptId: modelOut.conceptId,
        }),
      );
      const weakId = diagOut.weakConceptIds[0] ?? 'resistance';
      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, weakId),
        'Conceptual misconception',
      );
      state = { ...state, activeExperimentRec: pickExperimentForConcept(weakId) };
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 3,
          status: 'active',
          message: `Personalised path set: ${adapOut.recommendedActivity}.`,
          conceptId: weakId,
        }),
      );
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        weakId,
        'Conceptual misconception',
      );
      state = {
        ...revRes.nextState,
        notifications: appendNotification(revRes.nextState.notifications, {
          title: 'Human Eye Island Unlocked via Diagnostic',
          detail: 'All islands calibrated from your diagnostic profile (+100 XP)',
          targetView: 'world',
          category: 'unlock',
        }),
      };
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: weakId,
        }),
      );
      state = {
        ...state,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { diagOut, modelOut, adapOut } };
    }

    case 'adaptive_submit': {
      const q = action.question;
      const reasonCtx = buildScopedAgentContext(state, q.conceptId, {
        answer: action.selectedAnswer,
        reasoning: action.reasoningText,
        misconceptionEvidence: state.misconceptions.find(
          (m) => m.targetConceptId === q.conceptId && !m.resolved,
        )?.possibleMisconception,
      });
      const evalOut = ReasoningMisconceptionAgent.evaluateAdaptiveAttempt(
        reasonCtx,
        q,
        action.selectedAnswer,
        action.reasoningText,
      );
      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 4,
          status: evalOut.misconceptionIdentified ? 'attention' : 'completed',
          message: evalOut.misconceptionIdentified
            ? 'Possible misconception identified.'
            : evalOut.misconceptionCorrected
              ? 'Misconception corrected through clear reasoning.'
              : `Reasoning evaluated (${evalOut.classification}).`,
          conceptId: q.conceptId,
        }),
      );
      const misconceptionRecord: MisconceptionAnalysis | undefined =
        evalOut.classification === 'Conceptual misconception'
          ? {
              id: `mis-quiz-${Date.now()}`,
              timestamp: 'Just now',
              question: q.prompt,
              studentAnswer:
                action.selectedAnswer +
                (action.reasoningText.trim() ? ` — "${action.reasoningText.trim()}"` : ''),
              detectedConcept: q.conceptName,
              targetConceptId: q.conceptId,
              classification: evalOut.classification,
              possibleMisconception: evalOut.specificMisconception,
              reasoningEvidence: evalOut.reasoningEvidence,
              confidence: evalOut.confidence,
              recommendedAction:
                q.conceptId === 'resistance' || q.conceptId === 'ohms-law'
                  ? 'Run the 3D Ohm’s Law Resistance Experiment'
                  : `Review ${q.conceptName} in Revision Notes`,
              recommendedView:
                q.conceptId === 'resistance' || q.conceptId === 'ohms-law' ? 'lab' : 'revision',
              followUpQuestion: evalOut.followUpQuestion,
              explanation: q.explanation,
              resolved: false,
              source: 'orchestrator',
            }
          : undefined;
      const historyItem: AssessmentHistoryItem = {
        id: `hist-${Date.now()}`,
        title: `${q.conceptName} (${q.difficulty})`,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        dateLabel: 'Today',
        scorePercent: evalOut.scorePercent,
        reasoningQuality:
          evalOut.classification === 'Correct conceptual understanding'
            ? 'Strong'
            : evalOut.classification === 'Calculation or arithmetic error' || evalOut.isCorrect
              ? 'Developing'
              : 'Needs Review',
        classification: evalOut.classification,
      };
      const xpAward = evalOut.isCorrect ? (q.difficulty === 'Advanced' ? 55 : 35) : 0;
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: q.conceptId,
        classification: evalOut.classification,
        confidence: evalOut.confidence,
        difficulty: q.difficulty,
        xpAward,
        historyItem,
        misconceptionRecord,
        resolveConceptMisconceptions:
          evalOut.isCorrect && evalOut.classification === 'Correct conceptual understanding',
        markPracticeCompleted: evalOut.isCorrect,
        timelineEvent: {
          conceptId: q.conceptId,
          conceptName: q.conceptName,
          eventType: 'practice',
          title: `${q.difficulty} Practice: ${evalOut.isCorrect ? 'Causal Answer Verified' : evalOut.classification}`,
          summary: evalOut.isCorrect
            ? `Answered correctly (${evalOut.classification}). Verify understanding in a new situation.`
            : `Flagged ${evalOut.classification} during practice; follow-up recommended.`,
          masteryBefore: reasonCtx.currentMastery,
          masteryAfter: reasonCtx.currentMastery,
          misconceptionAddressed: evalOut.isCorrect ? undefined : q.conceptTrap,
        },
      });
      state = modelState;
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: q.conceptId,
        }),
      );
      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, q.conceptId, {
          misconceptionEvidence: evalOut.specificMisconception,
        }),
        evalOut.classification,
        evalOut.specificMisconception,
      );
      if (evalOut.misconceptionIdentified) {
        state = {
          ...state,
          activeExperimentRec: pickExperimentForConcept(q.conceptId, evalOut.specificMisconception),
        };
      }
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `${adapOut.recommendedActivity} recommended.`,
          conceptId: q.conceptId,
        }),
      );
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        q.conceptId,
        evalOut.classification,
      );
      let nextNotifs = revRes.nextState.notifications;
      if (evalOut.misconceptionIdentified) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Weak concept flagged: ${q.conceptName}`,
          detail: `${evalOut.specificMisconception} — Review before advancing`,
          targetView: adapOut.recommendedView,
          category: 'weak-concept',
          conceptId: q.conceptId,
        });
      } else if (modelOut.masteryBefore < 75 && modelOut.masteryAfter >= 75) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Concept Mastery Milestone: ${q.conceptName}`,
          detail: `Reached ${modelOut.masteryAfter}% mastery! Verify across 2 new situations.`,
          targetView: 'progress',
          category: 'mastery',
          conceptId: q.conceptId,
        });
      }
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: q.conceptId,
        }),
      );
      state = {
        ...revRes.nextState,
        notifications: nextNotifs,
        agentActivity: [...newLogs.slice().reverse(), ...currentState.agentActivity].slice(0, 24),
      };
      const deltaText =
        modelOut.masteryDelta >= 0 ? `+${modelOut.masteryDelta}` : `${modelOut.masteryDelta}`;
      const feedback = evalOut.isCorrect
        ? `${q.explanation} (${deltaText}% mastery)`
        : evalOut.classification === 'Calculation or arithmetic error'
          ? `Formula/arithmetic error: ${q.arithmeticHint ?? q.explanation}`
          : q.explanation;
      return {
        nextState: state,
        agentLogs: newLogs,
        actionResult: {
          isCorrect: evalOut.isCorrect,
          classification: evalOut.classification,
          masteryDelta: modelOut.masteryDelta,
          feedback,
          adapOut,
        },
      };
    }

    case 'lab_observe': {
      const { current, power } = calculateOhmsLaw(action.voltage, action.resistance, true);
      state = {
        ...state,
        labResult: {
          ...state.labResult,
          voltage: action.voltage,
          resistance: action.resistance,
          current,
          power,
          observationsCount: state.labResult.observationsCount + 1,
        },
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { labResult: state.labResult } };
    }

    case 'lab_complete': {
      const { current, power } = calculateOhmsLaw(action.voltage, action.resistance, true);
      state = {
        ...state,
        labResult: {
          voltage: action.voltage,
          resistance: action.resistance,
          current,
          power,
          observationsCount: Math.max(state.labResult.observationsCount, 3),
          completed: true,
        },
      };
      const resResult = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: 'resistance',
        classification: 'Correct conceptual understanding',
        confidence: 88,
        difficulty: 'Intermediate',
        xpAward: 50,
        markLabCompleted: true,
        timelineEvent: {
          conceptId: 'resistance',
          conceptName: 'Resistance',
          eventType: 'lab',
          title: '3D Circuit Lab Evidence Collected',
          summary: `Measured V = ${action.voltage} V, R = ${action.resistance} Ω → I = ${current.toFixed(2)} A live in 3D bench.`,
          masteryBefore: 0,
          masteryAfter: 0,
          misconceptionAddressed: 'Observed current dropping inversely as rheostat resistance rose',
        },
      });
      state = resResult.nextState;
      const ohmResult = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: 'ohms-law',
        classification: 'Correct conceptual understanding',
        confidence: 88,
        difficulty: 'Intermediate',
        xpAward: 40,
        markLabCompleted: true,
        timelineEvent: {
          conceptId: 'ohms-law',
          conceptName: "Ohm's Law",
          eventType: 'lab',
          title: 'Ohm’s Law Bench Verification Ready',
          summary: `Logged live I = V / R observations (${current.toFixed(2)} A at ${action.voltage} V).`,
          masteryBefore: 0,
          masteryAfter: 0,
        },
      });
      state = ohmResult.nextState;
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `3D Lab evidence updated Resistance (${resResult.modelOut.masteryAfter}%) & Ohm's Law (${ohmResult.modelOut.masteryAfter}%).`,
          conceptId: 'resistance',
        }),
      );
      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, 'ohms-law'),
        'Correct conceptual understanding',
      );
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: 'Verification & condition-flip transfer challenge ready.',
          conceptId: 'ohms-law',
        }),
      );
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        'resistance',
        'Correct conceptual understanding',
      );
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: 'resistance',
        }),
      );
      state = {
        ...revRes.nextState,
        notifications: appendNotification(revRes.nextState.notifications, {
          title: 'Experiment Completed · Verify Understanding',
          detail: 'Test your Resistance & Ohm’s Law grasp in a new situation',
          targetView: 'progress',
          category: 'verification',
          conceptId: 'resistance',
        }),
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { labResult: state.labResult, adapOut } };
    }

    case 'lab_reset': {
      state = {
        ...state,
        labResult: {
          voltage: 12,
          resistance: 6,
          current: 2,
          power: 24,
          observationsCount: 1,
          completed: false,
        },
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { labResult: state.labResult } };
    }

    case 'verification_submit': {
      const target = state.concepts.find((c) => c.id === action.conceptId);
      const currentMastery = target?.mastery ?? 45;
      const evalResult: VerificationEvaluationResult = evaluateVerificationResponse({
        scenario: action.scenario,
        selectedOption: action.selectedOption,
        reasoning: action.reasoning,
        existingRecord: state.verificationRecords[action.conceptId],
        conceptMastery: currentMastery,
        nowLabel: 'Just now',
      });
      const classification: CanonicalErrorClassification = evalResult.passed
        ? 'Correct conceptual understanding'
        : evalResult.issueType === 'misconception'
          ? 'Conceptual misconception'
          : evalResult.issueType === 'incomplete'
            ? 'Incomplete reasoning'
            : 'Insufficient evidence';
      newLogs.push(
        makeActivity({
          agentId: 'reasoning',
          agentName: 'Reasoning Agent',
          stepNumber: 7,
          status: evalResult.passed ? 'completed' : 'attention',
          message: evalResult.passed
            ? `Verification check passed (${evalResult.updatedRecord.verifiedChecksCount}/2 situations).`
            : `Verification flagged ${evalResult.issueType} reasoning.`,
          conceptId: action.conceptId,
        }),
      );
      state = {
        ...state,
        verificationRecords: {
          ...state.verificationRecords,
          [action.conceptId]: evalResult.updatedRecord,
        },
      };
      const isFullyVerified =
        evalResult.passed &&
        (evalResult.statusAfter === 'Understanding Verified' ||
          evalResult.statusAfter === 'Mastery Achieved');
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: action.conceptId,
        classification,
        confidence: evalResult.passed ? 92 : 70,
        difficulty: 'Intermediate',
        xpAward: isFullyVerified ? 110 : evalResult.passed ? 45 : 0,
        resolveConceptMisconceptions: isFullyVerified,
        timelineEvent: {
          conceptId: action.conceptId,
          conceptName: action.scenario.conceptName,
          eventType: 'verification',
          title: `Verification (${action.scenario.situationTitle}): ${evalResult.statusAfter}`,
          summary: evalResult.feedback,
          masteryBefore: currentMastery,
          masteryAfter: currentMastery,
          misconceptionAddressed: evalResult.passed
            ? undefined
            : `Verification issue: ${evalResult.issueType}`,
        },
      });
      state = modelState;
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 8,
          status: 'completed',
          message: `Verification status: ${evalResult.statusAfter} (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: action.conceptId,
        }),
      );
      const adapOut = AdaptiveLearningAgent.recommendNext(
        buildScopedAgentContext(state, action.conceptId),
        classification,
      );
      newLogs.push(
        makeActivity({
          agentId: 'adaptive',
          agentName: 'Adaptive Learning Agent',
          stepNumber: 6,
          status: 'active',
          message: `Next step: ${adapOut.recommendedActivity}.`,
          conceptId: action.conceptId,
        }),
      );
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        action.conceptId,
        classification,
      );
      let nextNotifs = revRes.nextState.notifications;
      if (isFullyVerified) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Verification Completed: ${action.scenario.conceptName}`,
          detail: `Status updated to "${evalResult.statusAfter}" across 2 distinct situations.`,
          targetView: 'progress',
          category: 'verification',
          conceptId: action.conceptId,
        });
      } else if (!evalResult.passed) {
        nextNotifs = appendNotification(nextNotifs, {
          title: `Practice recommended: ${action.scenario.conceptName}`,
          detail: `${evalResult.recommendedAction} before re-verifying`,
          targetView: evalResult.recommendedView,
          category: 'weak-concept',
          conceptId: action.conceptId,
        });
      }
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: action.conceptId,
        }),
      );
      state = {
        ...revRes.nextState,
        notifications: nextNotifs,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { evalResult, modelOut, adapOut } };
    }

    case 'revision_check': {
      const target = state.concepts.find((c) => c.id === action.conceptId);
      const classification: CanonicalErrorClassification = action.success
        ? 'Correct conceptual understanding'
        : 'Incomplete reasoning';
      const { nextState: modelState, modelOut } = LearnerModelAgent.applyReasoningEvidence(state, {
        conceptId: action.conceptId,
        classification,
        confidence: action.success ? 88 : 65,
        difficulty: 'Intermediate',
        xpAward: action.success ? 45 : 20,
        timelineEvent: {
          conceptId: action.conceptId,
          conceptName: target?.name ?? action.conceptId,
          eventType: 'revision',
          title: action.success ? 'Spaced Revision Recall Confirmed' : 'Revision Scheduled for Retry',
          summary: action.success
            ? 'Boosted retention and mastery through active recall.'
            : 'Marked for follow-up spaced-repetition review.',
          masteryBefore: 0,
          masteryAfter: 0,
        },
      });
      state = modelState;
      const revRes = RevisionTeacherInsightsAgent.scheduleAndRefreshInsights(
        state,
        action.conceptId,
        classification,
      );
      newLogs.push(
        makeActivity({
          agentId: 'learner-model',
          agentName: 'Learner Model Agent',
          stepNumber: 5,
          status: 'completed',
          message: `Concept mastery updated (${modelOut.masteryBefore}% → ${modelOut.masteryAfter}%).`,
          conceptId: action.conceptId,
        }),
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: `Next revision scheduled (${revRes.output.nextRevisionDate}).`,
          conceptId: action.conceptId,
        }),
      );
      state = {
        ...revRes.nextState,
        agentActivity: [...newLogs.slice().reverse(), ...state.agentActivity].slice(0, 24),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { modelOut, revision: revRes.output } };
    }

    case 'teacher_toggle_intervention': {
      const nextInterventions = state.teacherInterventions.map((item) =>
        item.id === action.id ? { ...item, assigned: !item.assigned } : item,
      );
      const toggled = nextInterventions.find((i) => i.id === action.id);
      if (toggled) {
        newLogs.push(
          makeActivity({
            agentId: 'revision-insights',
            agentName: 'Revision & Insights Agent',
            stepNumber: 11,
            status: 'completed',
            message: toggled.assigned
              ? `Teacher intervention assigned (${toggled.title}).`
              : `Teacher intervention removed (${toggled.title}).`,
            conceptId: toggled.conceptId,
          }),
        );
      }
      state = {
        ...state,
        teacherInterventions: nextInterventions,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { toggled } };
    }

    case 'teacher_toggle_suggestion': {
      const exists = state.appliedSuggestionIds.includes(action.id);
      const nextApplied = exists
        ? state.appliedSuggestionIds.filter((x) => x !== action.id)
        : [...state.appliedSuggestionIds, action.id];
      newLogs.push(
        makeActivity({
          agentId: 'revision-insights',
          agentName: 'Revision & Insights Agent',
          stepNumber: 11,
          status: 'completed',
          message: exists
            ? 'Teaching action unmarked from class queue.'
            : 'Teacher intervention insight queued for next lesson.',
        }),
      );
      state = {
        ...state,
        appliedSuggestionIds: nextApplied,
        agentActivity: [...newLogs, ...state.agentActivity].slice(0, 24),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: newLogs, actionResult: { appliedSuggestionIds: nextApplied } };
    }

    case 'profile_update': {
      state = {
        ...state,
        profile: { ...state.profile, ...action.patch },
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { profile: state.profile } };
    }

    case 'misconception_resolve': {
      state = {
        ...state,
        misconceptions: state.misconceptions.map((m) =>
          m.id === action.id ? { ...m, resolved: true } : m,
        ),
        updatedAt: new Date().toISOString(),
      };
      return { nextState: state, agentLogs: [], actionResult: { resolvedId: action.id } };
    }

    default:
      return { nextState: state, agentLogs: [], actionResult: {} };
  }
}

export function getOrchestratorActivityBadgeTime(entry: AgentActivityEntry): string {
  return entry.timestamp || nowTimeLabel();
}
