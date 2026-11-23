import { ISLANDS, TEACHER_CLASS_STUDENTS } from '../data/mockData';
import type {
  AchievementBadge,
  AssessmentHistoryItem,
  ConceptNode,
  ConceptVerificationRecord,
  CounterfactualResult,
  LabExperimentResult,
  LearningTimelineEvent,
  MisconceptionAnalysis,
  StudentView,
  TeacherNotificationItem,
  TeacherStudentRecord,
  TeacherTeachingSuggestion,
  VerificationAttemptEntry,
  VerificationIssueType,
  VerificationScenario,
  VerificationStatus,
} from '../types/edu';

const GUESSING_PATTERNS = [
  /^idk$/i,
  /^i\s*don'?t\s*know/i,
  /^guess/i,
  /^maybe/i,
  /^just\s*because$/i,
  /^because$/i,
  /^same$/i,
  /^none$/i,
  /^correct$/i,
  /^option\s*[a-d1-4]$/i,
];

const CAUSAL_CONNECTIVES = [
  'because',
  'since',
  'therefore',
  'so ',
  'causes',
  'leads to',
  'results in',
  'which means',
  'when ',
  'as ',
  'due to',
  'hence',
  'more ',
  'less ',
  'higher ',
  'lower ',
  'doubles',
  'halves',
  'quadruples',
  'reduces',
  'increases',
  'decreases',
];

export interface VerificationEvaluationResult {
  passed: boolean;
  issueType: VerificationIssueType;
  statusAfter: VerificationStatus;
  feedback: string;
  recommendedAction: string;
  recommendedView: StudentView;
  updatedRecord: ConceptVerificationRecord;
  masteryDelta: number;
}

export function computeVerificationStatus(
  verifiedChecksCount: number,
  attemptsCount: number,
  lastIssueType: VerificationIssueType | undefined,
  conceptMastery: number,
): VerificationStatus {
  if (verifiedChecksCount >= 2 && conceptMastery >= 80) {
    return 'Mastery Achieved';
  }
  if (verifiedChecksCount >= 2) {
    return 'Understanding Verified';
  }
  if (
    attemptsCount > 0 &&
    lastIssueType &&
    lastIssueType !== 'genuine' &&
    verifiedChecksCount === 0
  ) {
    return 'Needs More Practice';
  }
  return 'Learning in Progress';
}

export function evaluateVerificationResponse(params: {
  scenario: VerificationScenario;
  selectedOption: string;
  reasoning: string;
  existingRecord?: ConceptVerificationRecord;
  conceptMastery: number;
  nowLabel?: string;
}): VerificationEvaluationResult {
  const {
    scenario,
    selectedOption,
    reasoning,
    existingRecord,
    conceptMastery,
    nowLabel = 'Just now',
  } = params;

  const trimmed = reasoning.trim();
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const alphaWords = trimmed.match(/[a-zA-Z]{2,}/g) ?? [];

  const prevRecord: ConceptVerificationRecord = existingRecord ?? {
    conceptId: scenario.conceptId,
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  };

  const optionCorrect = selectedOption === scenario.correctOption;
  const matchedKeywords = scenario.causalKeywords.filter((kw) =>
    lower.includes(kw.toLowerCase()),
  );
  const hasConnective = CAUSAL_CONNECTIVES.some((c) => lower.includes(c));
  const isGuessingPhrase = GUESSING_PATTERNS.some((rx) => rx.test(trimmed));
  const normalizedNoSpaces = lower.replace(/\s+/g, '');
  const isPureRoteFormula = scenario.roteTraps.some((trap) => {
    const cleanTrap = trap.replace(/\s+/g, '').toLowerCase();
    return (
      normalizedNoSpaces === cleanTrap ||
      (normalizedNoSpaces.includes(cleanTrap) && alphaWords.length <= 5)
    );
  });

  let issueType: VerificationIssueType = 'genuine';
  let passed = false;
  let feedback = '';
  let recommendedAction = scenario.recommendedFollowUpLabel;
  let recommendedView: StudentView = scenario.recommendedFollowUpView;

  if (!selectedOption) {
    issueType = 'incomplete';
    feedback = 'Select an outcome first, then explain the underlying physics reasoning.';
  } else if (isPureRoteFormula) {
    issueType = 'memorization';
    feedback =
      'You stated a memorized formula or term without explaining how it governs this new situation. Explain the physical mechanism.';
  } else if (isGuessingPhrase || words.length < 4 || trimmed.length < 18) {
    issueType = isGuessingPhrase ? 'guessing' : 'incomplete';
    feedback = isGuessingPhrase
      ? 'This looks like a quick guess. Describe the physical cause-and-effect mechanism in your own words.'
      : 'Incomplete explanation: include what variable changed, what physical quantity responded, and why.';
  } else if (!optionCorrect) {
    issueType = 'misconception';
    feedback = `Not quite — ${scenario.expectedMechanism} Try ${scenario.recommendedFollowUpLabel} before re-verifying.`;
  } else if (matchedKeywords.length === 0 && !hasConnective) {
    issueType = 'memorization';
    feedback =
      'You stated a memorized formula or term without explaining how it governs this new situation. Explain the physical mechanism.';
  } else if (matchedKeywords.length < 1 || (!hasConnective && matchedKeywords.length < 2)) {
    issueType = 'incomplete';
    feedback =
      'Right direction, but your reasoning is still partial. Connect cause and effect clearly (e.g., because..., therefore...).';
  } else {
    issueType = 'genuine';
    passed = true;
  }

  const nextCompletedScenarioIds = passed
    ? Array.from(new Set([...prevRecord.completedScenarioIds, scenario.id]))
    : [...prevRecord.completedScenarioIds];

  // Require at least 2 verified passes across distinct situations — never mark verified from a single answer
  const nextVerifiedChecksCount = nextCompletedScenarioIds.length;
  const nextAttemptsCount = prevRecord.attemptsCount + 1;
  const projectedMastery = passed
    ? Math.min(98, conceptMastery + (nextVerifiedChecksCount >= 2 ? 12 : 8))
    : Math.max(12, conceptMastery - (issueType === 'misconception' ? 3 : 0));

  const statusAfter = computeVerificationStatus(
    nextVerifiedChecksCount,
    nextAttemptsCount,
    issueType,
    projectedMastery,
  );

  if (passed) {
    if (nextVerifiedChecksCount === 1) {
      feedback =
        '1st verification situation passed! Explain one more different situation to achieve Understanding Verified (single answers never verify mastery).';
      recommendedAction = 'Complete 2nd Situation Verification';
      recommendedView = 'progress';
    } else if (statusAfter === 'Mastery Achieved') {
      feedback =
        'Mastery Achieved! You demonstrated consistent causal understanding across multiple new situations without relying on rote recall.';
      recommendedAction = 'Advance to next island concept';
      recommendedView = 'world';
    } else {
      feedback =
        'Understanding Verified! You explained the causal mechanism accurately across two distinct situations.';
      recommendedAction = 'Boost mastery to 80%+ for Mastery Achieved';
      recommendedView = 'questions';
    }
  }

  const entry: VerificationAttemptEntry = {
    id: `ver-att-${Date.now()}-${nextAttemptsCount}`,
    scenarioId: scenario.id,
    situationTitle: scenario.situationTitle,
    selectedOption,
    reasoning: trimmed,
    passed,
    issueType,
    statusAfter,
    feedback,
    timestamp: nowLabel,
  };

  const updatedRecord: ConceptVerificationRecord = {
    conceptId: scenario.conceptId,
    status: statusAfter,
    attemptsCount: nextAttemptsCount,
    verifiedChecksCount: nextVerifiedChecksCount,
    completedScenarioIds: nextCompletedScenarioIds,
    lastIssueType: issueType,
    lastFeedback: feedback,
    recommendedAction,
    recommendedView,
    lastEvaluatedAt: nowLabel,
    verifiedExplainSummary:
      passed && nextVerifiedChecksCount >= 2
        ? trimmed
        : prevRecord.verifiedExplainSummary,
    history: [entry, ...prevRecord.history].slice(0, 10),
  };

  return {
    passed,
    issueType,
    statusAfter,
    feedback,
    recommendedAction,
    recommendedView,
    updatedRecord,
    masteryDelta: passed ? (nextVerifiedChecksCount >= 2 ? 12 : 8) : issueType === 'misconception' ? -3 : 0,
  };
}

export interface ProgressTrendPoint {
  label: string;
  mastery: number;
  accuracy: number;
  attempts: number;
}

export interface StudentTrackingMetrics {
  questionsAttempted: number;
  correctAttempts: number;
  accuracyPercent: number;
  strongConcepts: ConceptNode[];
  weakConcepts: ConceptNode[];
  completedChapters: { id: string; name: string; mastery: number }[];
  pendingConcepts: ConceptNode[];
  masteryComparison: {
    conceptId: string;
    name: string;
    initialMastery: number;
    currentMastery: number;
    delta: number;
  }[];
  weeklyTrend: ProgressTrendPoint[];
  monthlyTrend: ProgressTrendPoint[];
  consistencyPercent: number;
  streakDays: number;
  verifiedCount: number;
  masteredCount: number;
}

export function computeLearningMetrics(params: {
  concepts: ConceptNode[];
  baselineMastery: Record<string, number>;
  history: AssessmentHistoryItem[];
  timeline: LearningTimelineEvent[];
  verificationRecords: Record<string, ConceptVerificationRecord>;
  streakDays: number;
}): StudentTrackingMetrics {
  const {
    concepts,
    baselineMastery,
    history,
    timeline,
    verificationRecords,
    streakDays,
  } = params;

  const questionsAttempted = history.length + timeline.filter((t) => t.eventType === 'verification' || t.eventType === 'counterfactual').length;
  const correctHistory = history.filter((h) => h.scorePercent >= 70).length;
  const passedVerifications = timeline.filter(
    (t) => (t.eventType === 'verification' || t.eventType === 'counterfactual') && t.masteryAfter > t.masteryBefore,
  ).length;
  const correctAttempts = correctHistory + passedVerifications;
  const accuracyPercent = questionsAttempted > 0
    ? Math.round((correctAttempts / questionsAttempted) * 100)
    : 0;

  const strongConcepts = concepts.filter((c) => c.mastery >= 75);
  const weakConcepts = concepts.filter((c) => c.mastery < 55 && c.status !== 'locked');
  const pendingConcepts = concepts.filter((c) => c.mastery < 75);

  const completedChapters = ISLANDS.filter((isl) => isl.id !== 'challenge-arena')
    .map((isl) => {
      const islConcepts = concepts.filter((c) => isl.conceptIds.includes(c.id));
      const avg = islConcepts.length
        ? Math.round(islConcepts.reduce((s, c) => s + c.mastery, 0) / islConcepts.length)
        : 0;
      const done = islConcepts.length > 0 && islConcepts.every((c) => c.mastery >= 75);
      return { id: isl.id, name: isl.name, mastery: avg, done };
    })
    .filter((c) => c.done)
    .map(({ id, name, mastery }) => ({ id, name, mastery }));

  const masteryComparison = concepts.map((c) => {
    const initial = baselineMastery[c.id] ?? c.mastery;
    return {
      conceptId: c.id,
      name: c.name,
      initialMastery: initial,
      currentMastery: c.mastery,
      delta: c.mastery - initial,
    };
  });

  const currentOverall = concepts.length
    ? Math.round(concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length)
    : 0;
  const initialOverall = concepts.length
    ? Math.round(
        concepts.reduce((s, c) => s + (baselineMastery[c.id] ?? c.mastery), 0) / concepts.length,
      )
    : 0;

  const liveDelta = Math.max(0, currentOverall - initialOverall);
  const extraAttempts = Math.max(0, history.length - 4);

  const weeklyTrend: ProgressTrendPoint[] = [
    { label: 'Mon', mastery: Math.max(25, initialOverall), accuracy: 58, attempts: 2 },
    { label: 'Tue', mastery: Math.max(28, initialOverall + 2), accuracy: 62, attempts: 3 },
    { label: 'Wed', mastery: Math.max(30, initialOverall + 4), accuracy: 65, attempts: 2 },
    { label: 'Thu', mastery: Math.max(32, initialOverall + 6), accuracy: 68, attempts: 4 },
    { label: 'Fri', mastery: Math.max(35, initialOverall + 8), accuracy: 71, attempts: 3 },
    {
      label: 'Sat',
      mastery: Math.min(98, initialOverall + Math.round(liveDelta * 0.7)),
      accuracy: Math.max(60, Math.min(100, accuracyPercent - 2)),
      attempts: 3 + Math.floor(extraAttempts / 2),
    },
    {
      label: 'Today',
      mastery: currentOverall,
      accuracy: accuracyPercent,
      attempts: 2 + extraAttempts,
    },
  ];

  const monthlyTrend: ProgressTrendPoint[] = [
    { label: 'Week 1', mastery: Math.max(22, initialOverall - 6), accuracy: 52, attempts: 5 },
    { label: 'Week 2', mastery: Math.max(26, initialOverall - 2), accuracy: 59, attempts: 7 },
    { label: 'Week 3', mastery: Math.min(96, initialOverall + Math.round(liveDelta * 0.5)), accuracy: 68, attempts: 8 },
    {
      label: 'Week 4',
      mastery: currentOverall,
      accuracy: accuracyPercent,
      attempts: Math.max(6, questionsAttempted),
    },
  ];

  const verifiedCount = Object.values(verificationRecords).filter(
    (v) => v.status === 'Understanding Verified' || v.status === 'Mastery Achieved',
  ).length;
  const masteredCount = Object.values(verificationRecords).filter(
    (v) => v.status === 'Mastery Achieved',
  ).length;

  const consistencyPercent = Math.min(100, Math.round((streakDays / 7) * 85 + Math.min(15, questionsAttempted * 2)));

  return {
    questionsAttempted,
    correctAttempts,
    accuracyPercent,
    strongConcepts,
    weakConcepts,
    completedChapters,
    pendingConcepts,
    masteryComparison,
    weeklyTrend,
    monthlyTrend,
    consistencyPercent,
    streakDays,
    verifiedCount,
    masteredCount,
  };
}

export interface AchievementUnlockEvaluation {
  badgeId: string;
  reason: string;
}

export function evaluateSmartAchievements(params: {
  achievements: AchievementBadge[];
  concepts: ConceptNode[];
  baselineMastery: Record<string, number>;
  verificationRecords: Record<string, ConceptVerificationRecord>;
  misconceptions: MisconceptionAnalysis[];
  labResult: LabExperimentResult;
  counterfactualResult: CounterfactualResult;
  masteryGateUnlocked: boolean;
  streakDays: number;
}): AchievementUnlockEvaluation[] {
  const {
    achievements,
    concepts,
    baselineMastery,
    verificationRecords,
    misconceptions,
    labResult,
    counterfactualResult,
    masteryGateUnlocked,
    streakDays,
  } = params;

  const isLocked = (id: string) => {
    const found = achievements.find((a) => a.id === id);
    return found ? !found.unlocked : false;
  };

  const newlyUnlocked: AchievementUnlockEvaluation[] = [];

  // 1. First Concept Mastered
  const verifiedMastered = concepts.find(
    (c) =>
      c.mastery >= 80 &&
      (verificationRecords[c.id]?.status === 'Mastery Achieved' ||
        verificationRecords[c.id]?.status === 'Understanding Verified'),
  );
  if (isLocked('ach-first-mastered') && verifiedMastered) {
    newlyUnlocked.push({
      badgeId: 'ach-first-mastered',
      reason: `Mastered ${verifiedMastered.name} (${verifiedMastered.mastery}%) with verified understanding.`,
    });
  }

  // 2. Misconception Corrected
  const resolvedMisconception = misconceptions.find((m) => m.resolved);
  if (isLocked('ach-misconception-slayer') && resolvedMisconception) {
    newlyUnlocked.push({
      badgeId: 'ach-misconception-slayer',
      reason: `Resolved misconception in ${resolvedMisconception.detectedConcept} through clear reasoning.`,
    });
  }

  // 3. Learning Streak Champion
  if (isLocked('ach-streak-7') && streakDays >= 7) {
    newlyUnlocked.push({
      badgeId: 'ach-streak-7',
      reason: `Maintained a ${streakDays}-day deliberate learning streak.`,
    });
  }

  // 4. Experiment Explorer
  if (isLocked('ach-lab-explorer') && labResult.completed && labResult.observationsCount >= 3) {
    newlyUnlocked.push({
      badgeId: 'ach-lab-explorer',
      reason: `Completed 3D Ohm's Law Lab with ${labResult.observationsCount} recorded circuit measurements.`,
    });
  }

  // 5. Challenge Completed
  if (isLocked('ach-transfer-master') && counterfactualResult.completed && counterfactualResult.passed) {
    newlyUnlocked.push({
      badgeId: 'ach-transfer-master',
      reason: 'Passed the Condition Flip Challenge with valid proportional reasoning.',
    });
  }

  // 6. Weak Concept Improved (baseline < 50 and gained >= +15)
  const improvedWeak = concepts.find((c) => {
    const base = baselineMastery[c.id] ?? c.mastery;
    return base < 50 && c.mastery - base >= 15;
  });
  if (isLocked('ach-weak-improved') && improvedWeak) {
    const base = baselineMastery[improvedWeak.id] ?? improvedWeak.mastery;
    newlyUnlocked.push({
      badgeId: 'ach-weak-improved',
      reason: `Boosted ${improvedWeak.name} from ${base}% to ${improvedWeak.mastery}% (+${improvedWeak.mastery - base}%).`,
    });
  }

  // 7. Understanding Verified (on an active concept via verification checks, excluding initial light/ec)
  const newlyVerified = Object.values(verificationRecords).find(
    (rec) =>
      (rec.status === 'Understanding Verified' || rec.status === 'Mastery Achieved') &&
      rec.history.length > 0,
  );
  if (isLocked('ach-understanding-verified') && newlyVerified) {
    const conceptName =
      concepts.find((c) => c.id === newlyVerified.conceptId)?.name ?? newlyVerified.conceptId;
    newlyUnlocked.push({
      badgeId: 'ach-understanding-verified',
      reason: `Verified conceptual understanding of ${conceptName} across 2 independent situations.`,
    });
  }

  // 8. Chapter Completed
  const completedIsland = ISLANDS.find((isl) => {
    if (isl.id === 'challenge-arena') return false;
    const islConcepts = concepts.filter((c) => isl.conceptIds.includes(c.id));
    return islConcepts.length > 0 && islConcepts.every((c) => c.mastery >= 75);
  });
  if (isLocked('ach-light-master') && completedIsland) {
    newlyUnlocked.push({
      badgeId: 'ach-light-master',
      reason: `Completed every concept on ${completedIsland.name} with ≥ 75% mastery.`,
    });
  }

  // 9. Mastery Gatekeeper
  if (isLocked('ach-gate-guardian') && masteryGateUnlocked) {
    newlyUnlocked.push({
      badgeId: 'ach-gate-guardian',
      reason: 'Passed the Explain-to-Unlock Mastery Gate to unlock Series & Parallel Circuits.',
    });
  }

  return newlyUnlocked;
}

export interface WhyIImprovedItem {
  conceptId: string;
  conceptName: string;
  initialMastery: number;
  currentMastery: number;
  delta: number;
  initialMisconception: string;
  interventionUsed: string;
  verificationOutcome: VerificationStatus;
  canNowExplain: string;
  recommendedNextStep: string;
  recommendedView: StudentView;
}

export function buildWhyIImprovedInsights(params: {
  concepts: ConceptNode[];
  baselineMastery: Record<string, number>;
  misconceptions: MisconceptionAnalysis[];
  verificationRecords: Record<string, ConceptVerificationRecord>;
  timeline: LearningTimelineEvent[];
}): WhyIImprovedItem[] {
  const { concepts, baselineMastery, misconceptions, verificationRecords, timeline } = params;

  return concepts
    .filter((c) => c.status !== 'locked' || (baselineMastery[c.id] ?? c.mastery) < c.mastery)
    .map((concept) => {
      const initialMastery = baselineMastery[concept.id] ?? concept.mastery;
      const delta = concept.mastery - initialMastery;
      const relatedMisc = misconceptions.find((m) => m.targetConceptId === concept.id);
      const relatedEvents = timeline.filter((t) => t.conceptId === concept.id);
      const verRec = verificationRecords[concept.id];
      const status: VerificationStatus = verRec?.status ?? 'Learning in Progress';

      const initialMisconception =
        relatedEvents.find((e) => e.misconceptionAddressed)?.misconceptionAddressed ??
        relatedMisc?.possibleMisconception ??
        (initialMastery < 55
          ? `Early difficulty applying ${concept.name} in unfamiliar situations`
          : 'Minor formula rearrangement hesitation');

      const interventionUsed =
        relatedEvents.length > 0
          ? relatedEvents.map((e) => e.title).slice(0, 2).join(' → ')
          : concept.activities
              .filter((a) => a.completed)
              .map((a) => a.title)
              .join(', ') || 'Concept Notes & Diagnostic Baseline';

      const canNowExplain =
        verRec?.verifiedExplainSummary ??
        (delta > 0
          ? `${concept.keyTakeaway} (${relatedEvents[0]?.summary ?? 'Verified through practice'})`
          : `Building intuition: ${concept.keyTakeaway}`);

      let recommendedNextStep = `Complete 2 situation verifications for ${concept.name}`;
      let recommendedView: StudentView = 'progress';

      if (status === 'Mastery Achieved') {
        recommendedNextStep = 'Maintain retention with periodic spaced revision';
        recommendedView = 'revision';
      } else if (status === 'Understanding Verified') {
        recommendedNextStep = 'Push practice score to 80%+ for Mastery Achieved';
        recommendedView = 'questions';
      } else if (relatedMisc && !relatedMisc.resolved) {
        recommendedNextStep = relatedMisc.recommendedAction;
        recommendedView = relatedMisc.recommendedView;
      } else if (concept.id === 'resistance' || concept.id === 'ohms-law') {
        recommendedNextStep = 'Run 3D Circuit Lab experiment & verify across 2 situations';
        recommendedView = 'lab';
      }

      return {
        conceptId: concept.id,
        conceptName: concept.name,
        initialMastery,
        currentMastery: concept.mastery,
        delta,
        initialMisconception,
        interventionUsed,
        verificationOutcome: status,
        canNowExplain,
        recommendedNextStep,
        recommendedView,
      };
    })
    .sort((a, b) => b.delta - a.delta || b.currentMastery - a.currentMastery);
}

export interface TeacherCohortInsights {
  students: TeacherStudentRecord[];
  repeatedlyStruggling: TeacherStudentRecord[];
  significantlyImproved: Array<{
    student: TeacherStudentRecord;
    gainPercent: number;
    focusArea: string;
  }>;
  unverifiedUnderstanding: Array<{
    student: TeacherStudentRecord;
    gapConcept: string;
    masteryScore: number;
    reasoningScore: number;
  }>;
  conceptsNeedingAttention: Array<{
    conceptId: string;
    label: string;
    avgMastery: number;
    strugglingCount: number;
  }>;
  aiSuggestions: TeacherTeachingSuggestion[];
  defaultNotifications: TeacherNotificationItem[];
}

export function buildTeacherInsights(params: {
  liveStudentName: string;
  liveConcepts: ConceptNode[];
  liveVerificationRecords: Record<string, ConceptVerificationRecord>;
  liveStreak: number;
  liveBaseline: Record<string, number>;
}): TeacherCohortInsights {
  const {
    liveStudentName,
    liveConcepts,
    liveVerificationRecords,
    liveStreak,
    liveBaseline,
  } = params;

  const getMastery = (id: string) =>
    liveConcepts.find((c) => c.id === id)?.mastery ?? 50;

  const liveMap: Record<string, number> = {
    'electric-current': getMastery('electric-current'),
    'potential-difference': getMastery('potential-difference'),
    resistance: getMastery('resistance'),
    'ohms-law': getMastery('ohms-law'),
    'series-parallel': getMastery('series-parallel'),
    'magnetic-fields': getMastery('magnetic-fields'),
    'reflection-mirrors': getMastery('reflection-mirrors'),
  };

  const liveOverall = Math.round(
    Object.values(liveMap).reduce((s, v) => s + v, 0) / Object.values(liveMap).length,
  );
  const verifiedCount = Object.values(liveVerificationRecords).filter(
    (v) => v.status === 'Understanding Verified' || v.status === 'Mastery Achieved',
  ).length;
  const liveReasoning = Math.min(98, Math.max(48, liveOverall + verifiedCount * 3));

  const liveStudentRecord: TeacherStudentRecord = {
    id: 'stu-live-aanya',
    name: liveStudentName,
    rollNo: '10A-00',
    overallMastery: liveOverall,
    reasoningScore: liveReasoning,
    streakDays: liveStreak,
    supportNeeded: liveMap.resistance < 55 || liveMap['ohms-law'] < 55,
    primaryMisconception:
      liveMap.resistance < 55
        ? 'Needs inverse R-I verification across new situations'
        : 'All core Electricity misconceptions resolved',
    conceptMastery: liveMap,
    lastActive: 'Active now',
  };

  // Replace/prepend live student so teacher sees live progress alongside 30 classmates
  const students = [liveStudentRecord, ...TEACHER_CLASS_STUDENTS.slice(0, 29)];

  const repeatedlyStruggling = students
    .filter((s) => s.supportNeeded && (s.conceptMastery.resistance ?? 50) < 48)
    .slice(0, 6);

  const liveBaseOverall = Math.round(
    Object.keys(liveMap).reduce((sum, id) => sum + (liveBaseline[id] ?? liveMap[id]), 0) /
      Object.keys(liveMap).length,
  );
  const liveGain = Math.max(0, liveOverall - liveBaseOverall);

  const significantlyImproved = [
    ...(liveGain >= 4
      ? [
          {
            student: liveStudentRecord,
            gainPercent: liveGain,
            focusArea: 'Electricity & Verification Reasoning',
          },
        ]
      : []),
    {
      student: students[2],
      gainPercent: 18,
      focusArea: 'Resistance inverse proportionality',
    },
    {
      student: students[5],
      gainPercent: 15,
      focusArea: "Ohm's Law V-I graph slope",
    },
    {
      student: students[8],
      gainPercent: 12,
      focusArea: 'Potential Difference energy transfer',
    },
  ];

  const unverifiedUnderstanding = students
    .filter((s) => s.overallMastery >= 62 && s.overallMastery - s.reasoningScore >= 3)
    .slice(0, 5)
    .map((s) => ({
      student: s,
      gapConcept: (s.conceptMastery.resistance ?? 60) < 60 ? 'Resistance' : "Ohm's Law",
      masteryScore: s.overallMastery,
      reasoningScore: s.reasoningScore,
    }));

  // Ensure live student also appears if they have unverified concepts despite high score
  if (
    verifiedCount < 4 &&
    !unverifiedUnderstanding.some((u) => u.student.id === liveStudentRecord.id)
  ) {
    unverifiedUnderstanding.unshift({
      student: liveStudentRecord,
      gapConcept: liveMap.resistance < 75 ? 'Resistance' : "Ohm's Law",
      masteryScore: liveOverall,
      reasoningScore: liveReasoning,
    });
  }

  const conceptMeta = [
    { id: 'resistance', label: 'Resistance' },
    { id: 'ohms-law', label: "Ohm's Law" },
    { id: 'series-parallel', label: 'Series & Parallel' },
    { id: 'magnetic-fields', label: 'Magnetic Fields' },
  ];

  const conceptsNeedingAttention = conceptMeta
    .map((c) => {
      const avgMastery = Math.round(
        students.reduce((sum, s) => sum + (s.conceptMastery[c.id] ?? 0), 0) / students.length,
      );
      const strugglingCount = students.filter((s) => (s.conceptMastery[c.id] ?? 0) < 55).length;
      return {
        conceptId: c.id,
        label: c.label,
        avgMastery,
        strugglingCount,
      };
    })
    .sort((a, b) => a.avgMastery - b.avgMastery);

  const aiSuggestions: TeacherTeachingSuggestion[] = [
    {
      id: 'ts-1',
      conceptId: 'resistance',
      conceptName: 'Resistance',
      affectedCount: conceptsNeedingAttention.find((c) => c.conceptId === 'resistance')?.strugglingCount ?? 10,
      insight: '1 in 3 students still associates thicker/longer resistance coils with higher current at constant voltage.',
      suggestedAction: 'Run a 10-minute 3D Rheostat live demo comparing 4 Ω vs 16 Ω at fixed 12 V before assigning Resistance Verification.',
    },
    {
      id: 'ts-2',
      conceptId: 'ohms-law',
      conceptName: "Ohm's Law",
      affectedCount: conceptsNeedingAttention.find((c) => c.conceptId === 'ohms-law')?.strugglingCount ?? 8,
      insight: 'High MCQ accuracy hides rote V = IR memorization when slope ΔV/ΔI flips or temperature rises.',
      suggestedAction: 'Assign the Hot Tungsten Filament transfer prompt and require written cause-and-effect explanations.',
    },
    {
      id: 'ts-3',
      conceptId: 'series-parallel',
      conceptName: 'Series & Parallel',
      affectedCount: conceptsNeedingAttention.find((c) => c.conceptId === 'series-parallel')?.strugglingCount ?? 12,
      insight: 'Students confuse series equal-current rules with parallel equal-voltage domestic circuits.',
      suggestedAction: 'Assign the Dual-Branch Kitchen Appliance comparison pack as pre-gate warm-up.',
    },
  ];

  const defaultNotifications: TeacherNotificationItem[] = [
    {
      id: 'tnot-1',
      severity: 'alert',
      title: `${repeatedlyStruggling.length} students repeatedly struggling on Resistance`,
      detail: 'Mastery below 48% with unresolved inverse R-I misconception',
      conceptId: 'resistance',
      timeLabel: '12m ago',
      read: false,
    },
    {
      id: 'tnot-2',
      severity: 'verification',
      title: `${unverifiedUnderstanding.length} students with unverified conceptual understanding`,
      detail: 'High numerical/MCQ recall without 2-situation causal verification',
      conceptId: 'ohms-law',
      timeLabel: '35m ago',
      read: false,
    },
    {
      id: 'tnot-3',
      severity: 'improvement',
      title: `${significantlyImproved[0]?.student.name ?? 'Ananya Nair'} improved +${significantlyImproved[0]?.gainPercent ?? 18}%`,
      detail: `Strong progress in ${significantlyImproved[0]?.focusArea ?? 'Electricity'}`,
      conceptId: 'resistance',
      studentName: significantlyImproved[0]?.student.name,
      timeLabel: '1h ago',
      read: false,
    },
    {
      id: 'tnot-4',
      severity: 'attention',
      title: `${conceptsNeedingAttention[0]?.label ?? 'Series & Parallel'} needs classroom attention`,
      detail: `Class average ${conceptsNeedingAttention[0]?.avgMastery ?? 48}% · ${conceptsNeedingAttention[0]?.strugglingCount ?? 12} students below 55%`,
      conceptId: conceptsNeedingAttention[0]?.conceptId,
      timeLabel: '2h ago',
      read: true,
    },
  ];

  return {
    students,
    repeatedlyStruggling,
    significantlyImproved,
    unverifiedUnderstanding,
    conceptsNeedingAttention,
    aiSuggestions,
    defaultNotifications,
  };
}
