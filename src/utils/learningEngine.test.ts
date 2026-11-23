import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_BASELINE_MASTERY,
  INITIAL_CONCEPTS,
  INITIAL_HISTORY,
  INITIAL_LEARNING_TIMELINE,
  INITIAL_MISCONCEPTION,
  INITIAL_VERIFICATION_RECORDS,
  VERIFICATION_SCENARIOS,
} from '../data/mockData';
import {
  buildTeacherInsights,
  buildWhyIImprovedInsights,
  computeLearningMetrics,
  evaluateSmartAchievements,
  evaluateVerificationResponse,
} from './learningEngine';

const resScenario1 = VERIFICATION_SCENARIOS.find((s) => s.id === 'ver-res-1')!;
const resScenario2 = VERIFICATION_SCENARIOS.find((s) => s.id === 'ver-res-2')!;

test('Understanding Verification detects guessing and short answers and marks Needs More Practice', () => {
  const guessRes = evaluateVerificationResponse({
    scenario: resScenario1,
    selectedOption: resScenario1.correctOption,
    reasoning: 'idk',
    conceptMastery: 40,
  });

  assert.equal(guessRes.passed, false);
  assert.equal(guessRes.issueType, 'guessing');
  assert.equal(guessRes.statusAfter, 'Needs More Practice');
  assert.equal(guessRes.updatedRecord.verifiedChecksCount, 0);

  const shortRes = evaluateVerificationResponse({
    scenario: resScenario1,
    selectedOption: resScenario1.correctOption,
    reasoning: 'it drops',
    conceptMastery: 40,
  });
  assert.equal(shortRes.passed, false);
  assert.equal(shortRes.issueType, 'incomplete');
  assert.equal(shortRes.statusAfter, 'Needs More Practice');
});

test('Understanding Verification detects rote formula memorization without mechanism', () => {
  const roteRes = evaluateVerificationResponse({
    scenario: resScenario1,
    selectedOption: resScenario1.correctOption,
    reasoning: 'V = IR so R = rho L/A',
    conceptMastery: 45,
  });

  assert.equal(roteRes.passed, false);
  assert.equal(roteRes.issueType, 'memorization');
  assert.equal(roteRes.statusAfter, 'Needs More Practice');
  assert.equal(roteRes.updatedRecord.verifiedChecksCount, 0);
});

test('Single genuine pass NEVER marks Understanding Verified — requires 2 distinct situations', () => {
  const pass1 = evaluateVerificationResponse({
    scenario: resScenario1,
    selectedOption: resScenario1.correctOption,
    reasoning:
      'Because the wire is longer and thinner, electrons experience more collisions and resistance opposes flow so current decreases.',
    conceptMastery: 55,
  });

  assert.equal(pass1.passed, true);
  assert.equal(pass1.issueType, 'genuine');
  assert.equal(pass1.updatedRecord.verifiedChecksCount, 1);
  assert.equal(pass1.statusAfter, 'Learning in Progress');

  // Repeating the SAME scenario does not count as a second distinct verification
  const repeatSame = evaluateVerificationResponse({
    scenario: resScenario1,
    selectedOption: resScenario1.correctOption,
    reasoning:
      'Because the wire is longer and thinner, higher resistance opposes charge flow so current drops.',
    existingRecord: pass1.updatedRecord,
    conceptMastery: 63,
  });
  assert.equal(repeatSame.updatedRecord.verifiedChecksCount, 1);
  assert.equal(repeatSame.statusAfter, 'Learning in Progress');

  // Completing a SECOND distinct situation achieves Understanding Verified (or Mastery Achieved if >= 80)
  const pass2 = evaluateVerificationResponse({
    scenario: resScenario2,
    selectedOption: resScenario2.correctOption,
    reasoning:
      'Since adding coil length doubles resistance at fixed 24 V, current halves because I = V / R and the bulb dims.',
    existingRecord: pass1.updatedRecord,
    conceptMastery: 63,
  });
  assert.equal(pass2.passed, true);
  assert.equal(pass2.updatedRecord.verifiedChecksCount, 2);
  assert.equal(pass2.statusAfter, 'Understanding Verified');

  // With high mastery (>= 80 projected), 2 distinct verifications reach Mastery Achieved
  const pass2Mastery = evaluateVerificationResponse({
    scenario: resScenario2,
    selectedOption: resScenario2.correctOption,
    reasoning:
      'Since adding coil length doubles resistance at fixed 24 V, current halves because I = V / R and the bulb dims.',
    existingRecord: pass1.updatedRecord,
    conceptMastery: 74,
  });
  assert.equal(pass2Mastery.statusAfter, 'Mastery Achieved');
});

test('computeLearningMetrics calculates attempts, accuracy, initial-vs-current deltas, and weekly/monthly trends', () => {
  const updatedConcepts = INITIAL_CONCEPTS.map((c) =>
    c.id === 'resistance' ? { ...c, mastery: 62 } : c,
  );

  const metrics = computeLearningMetrics({
    concepts: updatedConcepts,
    baselineMastery: INITIAL_BASELINE_MASTERY,
    history: INITIAL_HISTORY,
    timeline: INITIAL_LEARNING_TIMELINE,
    verificationRecords: INITIAL_VERIFICATION_RECORDS,
    streakDays: 7,
  });

  assert.ok(metrics.questionsAttempted >= INITIAL_HISTORY.length);
  assert.ok(metrics.accuracyPercent > 0 && metrics.accuracyPercent <= 100);
  assert.equal(metrics.weeklyTrend.length, 7);
  assert.equal(metrics.monthlyTrend.length, 4);
  const resDelta = metrics.masteryComparison.find((m) => m.conceptId === 'resistance');
  assert.equal(resDelta?.initialMastery, 38);
  assert.equal(resDelta?.currentMastery, 62);
  assert.equal(resDelta?.delta, 24);
  assert.ok(metrics.completedChapters.some((ch) => ch.id === 'light'));
});

test('evaluateSmartAchievements only unlocks badges from verified real actions', () => {
  const baseUnlocks = evaluateSmartAchievements({
    achievements: INITIAL_ACHIEVEMENTS,
    concepts: INITIAL_CONCEPTS,
    baselineMastery: INITIAL_BASELINE_MASTERY,
    verificationRecords: INITIAL_VERIFICATION_RECORDS,
    misconceptions: [INITIAL_MISCONCEPTION],
    labResult: {
      voltage: 12,
      resistance: 6,
      current: 2,
      power: 24,
      observationsCount: 1,
      completed: false,
    },
    counterfactualResult: {
      completed: false,
      passed: false,
      selectedChoice: '',
      explanation: '',
      feedback: '',
    },
    masteryGateUnlocked: false,
    streakDays: 7,
  });
  assert.equal(baseUnlocks.length, 0);

  // Now simulate improving weak concept Resistance (38 -> 58), resolving misconception, and verifying
  const improvedConcepts = INITIAL_CONCEPTS.map((c) =>
    c.id === 'resistance' ? { ...c, mastery: 58 } : c,
  );
  const verifiedRecs = {
    ...INITIAL_VERIFICATION_RECORDS,
    resistance: {
      ...INITIAL_VERIFICATION_RECORDS.resistance,
      status: 'Understanding Verified' as const,
      verifiedChecksCount: 2,
      completedScenarioIds: ['ver-res-1', 'ver-res-2'],
      history: [
        {
          id: 'att-1',
          scenarioId: 'ver-res-2',
          situationTitle: 'Dimmer Slider Calibration',
          selectedOption: resScenario2.correctOption,
          reasoning: 'Higher resistance lowers current at fixed voltage.',
          passed: true,
          issueType: 'genuine' as const,
          statusAfter: 'Understanding Verified' as const,
          feedback: 'Verified',
          timestamp: 'Just now',
        },
      ],
    },
  };

  const unlocks = evaluateSmartAchievements({
    achievements: INITIAL_ACHIEVEMENTS,
    concepts: improvedConcepts,
    baselineMastery: INITIAL_BASELINE_MASTERY,
    verificationRecords: verifiedRecs,
    misconceptions: [{ ...INITIAL_MISCONCEPTION, resolved: true }],
    labResult: {
      voltage: 18,
      resistance: 12,
      current: 1.5,
      power: 27,
      observationsCount: 4,
      completed: true,
    },
    counterfactualResult: {
      completed: true,
      passed: true,
      selectedChoice: 'Current increases proportionally',
      explanation: 'I is directly proportional to V when R is constant.',
      feedback: 'Passed',
    },
    masteryGateUnlocked: true,
    streakDays: 7,
  });

  const ids = unlocks.map((u) => u.badgeId);
  assert.ok(ids.includes('ach-weak-improved'));
  assert.ok(ids.includes('ach-understanding-verified'));
  assert.ok(ids.includes('ach-lab-explorer'));
  assert.ok(ids.includes('ach-transfer-master'));
  assert.ok(ids.includes('ach-misconception-slayer'));
  assert.ok(ids.includes('ach-gate-guardian'));
});

test('buildWhyIImprovedInsights and buildTeacherInsights return structured real records', () => {
  const insights = buildWhyIImprovedInsights({
    concepts: INITIAL_CONCEPTS,
    baselineMastery: INITIAL_BASELINE_MASTERY,
    misconceptions: [INITIAL_MISCONCEPTION],
    verificationRecords: INITIAL_VERIFICATION_RECORDS,
    timeline: INITIAL_LEARNING_TIMELINE,
  });
  const ec = insights.find((i) => i.conceptId === 'electric-current');
  assert.ok(ec && ec.delta > 0);
  assert.equal(ec?.verificationOutcome, 'Mastery Achieved');

  const teacher = buildTeacherInsights({
    liveStudentName: 'Aanya Verma',
    liveConcepts: INITIAL_CONCEPTS,
    liveVerificationRecords: INITIAL_VERIFICATION_RECORDS,
    liveStreak: 7,
    liveBaseline: INITIAL_BASELINE_MASTERY,
  });
  assert.equal(teacher.students.length, 30);
  assert.ok(teacher.repeatedlyStruggling.length > 0);
  assert.ok(teacher.unverifiedUnderstanding.length > 0);
  assert.ok(teacher.aiSuggestions.length >= 3);
  assert.ok(teacher.defaultNotifications.length >= 3);
});
