import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnonymizedClassroomSummary,
  calculateOhmsLaw,
  computeNextRevision,
  prepareVoiceTranscript,
  updateBktMastery,
  verifyOhmsLawNumericalConsistency,
} from './learnerModel.ts';
import type { TeacherStudentRecord } from '../types/edu.ts';

test('BKT mastery increases for correct conceptual understanding and stays bounded', () => {
  const res = updateBktMastery({
    currentMastery: 42,
    currentConfidence: 45,
    currentRetention: 42,
    classification: 'Correct conceptual understanding',
    aiConfidence: 92,
    difficulty: 'Intermediate',
  });
  assert.ok(res.mastery > 42 && res.mastery <= 98);
  assert.ok(res.masteryDelta > 0);
  assert.ok(res.confidence > 45);
  assert.ok(res.retention > 42);
});

test('BKT mastery handles arithmetic error differently from conceptual misconception', () => {
  const arith = updateBktMastery({
    currentMastery: 60,
    currentConfidence: 65,
    currentRetention: 60,
    classification: 'Calculation or arithmetic error',
    aiConfidence: 88,
  });
  const mis = updateBktMastery({
    currentMastery: 60,
    currentConfidence: 65,
    currentRetention: 60,
    classification: 'Conceptual misconception',
    aiConfidence: 88,
  });
  assert.ok(arith.mastery > mis.mastery);
  assert.equal(mis.revisionUrgency, 'overdue');
  assert.equal(arith.revisionUrgency, 'due-today');
});

test('BKT mastery leaves score unchanged on insufficient evidence', () => {
  const res = updateBktMastery({
    currentMastery: 50,
    currentConfidence: 55,
    currentRetention: 50,
    classification: 'Insufficient evidence',
    aiConfidence: 60,
  });
  assert.equal(res.mastery, 50);
  assert.equal(res.masteryDelta, 0);
});

test('SM-2 spaced repetition scheduler outputs consistent urgencies', () => {
  assert.equal(computeNextRevision(85, 85, 'Correct conceptual understanding').urgency, 'stable');
  assert.equal(computeNextRevision(60, 70, 'Incomplete reasoning').urgency, 'upcoming');
  assert.equal(computeNextRevision(40, 50, 'Conceptual misconception').urgency, 'overdue');
});

test('Ohm law calculations are deterministic and accurate', () => {
  assert.deepEqual(calculateOhmsLaw(12, 6, true), { current: 2, power: 24 });
  assert.deepEqual(calculateOhmsLaw(12, 6, false), { current: 0, power: 0 });
});

test('Physics consistency validator passes valid Ohm law numericals and catches errors', () => {
  const valid = verifyOhmsLawNumericalConsistency(
    'A 12 V battery is connected across a 4 Ω resistor. What current flows?',
    '3 A',
  );
  assert.equal(valid.valid, true);

  const invalid = verifyOhmsLawNumericalConsistency(
    'A 12 V battery is connected across a 4 Ω resistor. What current flows?',
    '48 A',
  );
  assert.equal(invalid.valid, false);
});

test('Voice transcript cleaner preserves raw speech and strips filler words', () => {
  const cleaned = prepareVoiceTranscript(
    'um, when resistance increases and uh voltage is constant, the the current drops.',
  );
  assert.equal(
    cleaned.originalTranscript,
    'um, when resistance increases and uh voltage is constant, the the current drops.',
  );
  assert.equal(
    cleaned.cleanedTranscript,
    'When resistance increases and voltage is constant, the current drops.',
  );
  assert.equal(cleaned.hadFillers, true);
});

test('Anonymized classroom summary strips student names, IDs, and roll numbers', () => {
  const sampleStudents: TeacherStudentRecord[] = [
    {
      id: 'stu-1',
      name: 'Secret Student Name',
      rollNo: '10A-99',
      overallMastery: 50,
      reasoningScore: 52,
      streakDays: 3,
      supportNeeded: true,
      primaryMisconception: 'Believes higher resistance increases current',
      conceptMastery: { resistance: 40, 'ohms-law': 60 },
      lastActive: 'Today',
    },
  ];
  const agg = buildAnonymizedClassroomSummary(sampleStudents);
  const serialized = JSON.stringify(agg);
  assert.equal(serialized.includes('Secret Student Name'), false);
  assert.equal(serialized.includes('10A-99'), false);
  assert.equal(serialized.includes('stu-1'), false);
  assert.equal(agg.totalStudents, 1);
  assert.equal(agg.supportNeededCount, 1);
});
