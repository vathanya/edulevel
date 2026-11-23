import type {
  CanonicalErrorClassification,
  DifficultyLevel,
  ErrorClassification,
  LearningStatus,
  RevisionUrgency,
  TeacherStudentRecord,
  VoiceTranscript,
} from '../types/edu.ts';

export function normalizeErrorClassification(
  classification: ErrorClassification,
): CanonicalErrorClassification {
  switch (classification) {
    case 'Sound Understanding':
    case 'Correct conceptual understanding':
      return 'Correct conceptual understanding';
    case 'Incorrect Concept':
    case 'Conceptual misconception':
      return 'Conceptual misconception';
    case 'Arithmetic Mistake':
    case 'Calculation or arithmetic error':
      return 'Calculation or arithmetic error';
    case 'Incomplete reasoning':
      return 'Incomplete reasoning';
    case 'Insufficient Evidence':
    case 'Insufficient evidence':
      return 'Insufficient evidence';
  }
}

export interface BktUpdateInput {
  currentMastery: number;
  currentConfidence: number;
  currentRetention: number;
  classification: ErrorClassification;
  aiConfidence: number; // 0..100
  difficulty?: DifficultyLevel;
}

export interface BktUpdateOutput {
  mastery: number;
  masteryDelta: number;
  confidence: number;
  retention: number;
  status: LearningStatus;
  revisionUrgency: RevisionUrgency;
  nextRevisionDate: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Deterministic Bayesian Knowledge Tracing (BKT) posterior mastery update.
 * Gemini provides structured reasoning evidence + classification + confidence,
 * and THIS module solely governs mastery, confidence, retention, and revision intervals.
 */
export function updateBktMastery(input: BktUpdateInput): BktUpdateOutput {
  const canonical = normalizeErrorClassification(input.classification);
  const prior = Math.max(0.08, Math.min(0.95, input.currentMastery / 100));
  const confWeight = Math.max(0.35, Math.min(1, input.aiConfidence / 100));
  const diffMultiplier =
    input.difficulty === 'Advanced'
      ? 1.18
      : input.difficulty === 'Intermediate'
        ? 1.0
        : 0.88;

  // Classic BKT slip & guess parameters adapted by evidence classification
  const pGuess = 0.2;
  const pSlip = 0.1;
  const pTransit = 0.14 * diffMultiplier;

  let posterior = prior;
  let confDelta = 0;
  let retentionDelta = 0;

  switch (canonical) {
    case 'Correct conceptual understanding': {
      const pCorrect = prior * (1 - pSlip) + (1 - prior) * pGuess;
      const obsPosterior = (prior * (1 - pSlip)) / pCorrect;
      const learned = obsPosterior + (1 - obsPosterior) * pTransit;
      posterior = prior + (learned - prior) * confWeight;
      confDelta = Math.round(10 * confWeight);
      retentionDelta = Math.round(12 * confWeight);
      break;
    }
    case 'Calculation or arithmetic error': {
      // Concept is largely intact; only minor downward adjustment & calculation practice cue
      const mildPull = Math.max(prior - 0.02, prior * 0.97);
      posterior = prior + (mildPull - prior) * confWeight;
      confDelta = -2;
      retentionDelta = -2;
      break;
    }
    case 'Incomplete reasoning': {
      // Small positive or neutral nudge: avoid penalizing heavily when reasoning just needs depth
      const slightBoost = prior + 0.03 * confWeight;
      posterior = slightBoost;
      confDelta = 1;
      retentionDelta = 2;
      break;
    }
    case 'Insufficient evidence': {
      // Never claim mastery change without evidence
      posterior = prior;
      confDelta = 0;
      retentionDelta = 0;
      break;
    }
    case 'Conceptual misconception': {
      const pWrong = prior * pSlip + (1 - prior) * (1 - pGuess);
      const obsPosterior = (prior * pSlip) / pWrong;
      // Blend smoothly with evidence confidence so one error doesn't wipe out history abruptly
      const penaltyTarget = Math.max(0.15, obsPosterior * 0.4 + prior * 0.52);
      posterior = prior + (penaltyTarget - prior) * confWeight;
      confDelta = -Math.round(8 * confWeight);
      retentionDelta = -Math.round(9 * confWeight);
      break;
    }
  }

  const nextMastery = clamp(posterior * 100, 12, 98);
  const masteryDelta = nextMastery - Math.round(input.currentMastery);
  const nextConfidence = clamp(input.currentConfidence + confDelta, 15, 98);
  const nextRetention = clamp(input.currentRetention + retentionDelta, 20, 98);

  const status: LearningStatus = nextMastery >= 75 ? 'completed' : 'in-progress';
  const schedule = computeNextRevision(nextMastery, nextRetention, canonical);

  return {
    mastery: nextMastery,
    masteryDelta,
    confidence: nextConfidence,
    retention: nextRetention,
    status,
    revisionUrgency: schedule.urgency,
    nextRevisionDate: schedule.label,
  };
}

/**
 * SM-2-inspired spaced-repetition scheduler.
 */
export function computeNextRevision(
  mastery: number,
  retention: number,
  classification: ErrorClassification,
): { urgency: RevisionUrgency; label: string; intervalDays: number } {
  const canonical = normalizeErrorClassification(classification);
  if (canonical === 'Conceptual misconception') {
    return { urgency: 'overdue', label: 'Due Now (Review)', intervalDays: 0 };
  }
  if (canonical === 'Calculation or arithmetic error' || mastery < 50) {
    return { urgency: 'due-today', label: 'Today', intervalDays: 0 };
  }
  if (canonical === 'Incomplete reasoning' || retention < 68) {
    return { urgency: 'upcoming', label: 'In 2 days', intervalDays: 2 };
  }
  if (mastery >= 80 && retention >= 80) {
    return { urgency: 'stable', label: 'In 7 days', intervalDays: 7 };
  }
  return { urgency: 'upcoming', label: 'In 4 days', intervalDays: 4 };
}

/**
 * Deterministic Ohm's Law and electric power calculation used by the 3D Lab
 * and server-side physics verification.
 */
export function calculateOhmsLaw(
  voltage: number,
  resistance: number,
  switchClosed = true,
): { current: number; power: number } {
  if (!switchClosed || resistance <= 0) {
    return { current: 0, power: 0 };
  }
  const current = Number((voltage / resistance).toFixed(2));
  const power = Number((voltage * current).toFixed(2));
  return { current, power };
}

/**
 * Deterministic sanity check on generated Class 10 Ohm's Law numericals.
 * Ensures any numerical question mentioning V and R (or I and R, V and I)
 * matches exact Ohm's Law physics before reaching the student.
 */
export function verifyOhmsLawNumericalConsistency(
  prompt: string,
  correctAnswer: string,
): { valid: boolean; reason?: string } {
  const numMatch = correctAnswer.match(/(-?\d+(?:\.\d+)?)/);
  if (!numMatch) {
    return { valid: true };
  }
  const claimed = Number(numMatch[1]);
  if (!Number.isFinite(claimed)) {
    return { valid: false, reason: 'Answer does not contain a valid finite number.' };
  }

  const vMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:V\b|volts?\b)/i);
  const rMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:Ω|\bohms?\b)/i);
  const iMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:A\b|amps?\b|amperes?\b)/i);

  const asksCurrent = /\bcurrent\b/i.test(prompt) && /\bA\b|amp/i.test(correctAnswer);
  const asksResistance = /\bresistance\b/i.test(prompt) && /(?:Ω|\bohms?\b)/i.test(correctAnswer);
  const asksVoltage =
    /\b(?:voltage|potential difference)\b/i.test(prompt) && /\bV\b|volt/i.test(correctAnswer);

  // Only validate clean single-step V, I, R questions (skip series/parallel multi-resistor prompts)
  const isSingleResistorPrompt =
    !/series|parallel|stretched|doubled|two\s+resistors|three\s+resistors/i.test(prompt);

  if (!isSingleResistorPrompt) {
    return { valid: true };
  }

  if (asksCurrent && vMatch && rMatch && !iMatch) {
    const expected = Number(vMatch[1]) / Number(rMatch[1]);
    if (Math.abs(claimed - expected) > Math.max(0.05, expected * 0.03)) {
      return {
        valid: false,
        reason: `Ohm's Law mismatch: ${vMatch[1]} V / ${rMatch[1]} Ω = ${expected.toFixed(2)} A, got ${claimed}.`,
      };
    }
  }

  if (asksResistance && vMatch && iMatch && !rMatch) {
    const expected = Number(vMatch[1]) / Number(iMatch[1]);
    if (Math.abs(claimed - expected) > Math.max(0.05, expected * 0.03)) {
      return {
        valid: false,
        reason: `Ohm's Law mismatch: ${vMatch[1]} V / ${iMatch[1]} A = ${expected.toFixed(2)} Ω, got ${claimed}.`,
      };
    }
  }

  if (asksVoltage && iMatch && rMatch && !vMatch) {
    const expected = Number(iMatch[1]) * Number(rMatch[1]);
    if (Math.abs(claimed - expected) > Math.max(0.05, expected * 0.03)) {
      return {
        valid: false,
        reason: `Ohm's Law mismatch: ${iMatch[1]} A * ${rMatch[1]} Ω = ${expected.toFixed(2)} V, got ${claimed}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Clean spoken voice transcripts (e.g., browser voice input or Wispr Flow dictation)
 * while preserving the exact original speech for transparent review.
 */
export function prepareVoiceTranscript(rawSpeech: string): VoiceTranscript {
  const originalTranscript = rawSpeech.trim();
  if (!originalTranscript) {
    return { originalTranscript: '', cleanedTranscript: '', hadFillers: false };
  }

  let cleaned = originalTranscript
    // Remove common hesitation fillers when standing alone as words
    .replace(/\b(?:um+|uh+|er+|ah+|hmm+|you know|i mean|sort of|kind of)\b[,\s]*/gi, ' ')
    // Collapse repeated adjacent words caused by speech stumbles ("the the", "it it")
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    // Normalize whitespace & stray punctuation spacing
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  const hadFillers = cleaned.toLowerCase() !== originalTranscript.toLowerCase();

  return {
    originalTranscript,
    cleanedTranscript: cleaned,
    hadFillers,
  };
}

/**
 * Builds a strictly anonymized classroom performance snapshot (zero student names,
 * IDs, or roll numbers) before sending data to Gemini Teacher Insights.
 */
export function buildAnonymizedClassroomSummary(students: TeacherStudentRecord[]) {
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      averageOverallMastery: 0,
      averageReasoningScore: 0,
      supportNeededCount: 0,
      conceptStats: [],
      misconceptionClusters: [],
    };
  }

  const conceptKeys = Object.keys(students[0].conceptMastery);
  const conceptStats = conceptKeys.map((conceptId) => {
    const scores = students.map((s) => s.conceptMastery[conceptId] ?? 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / totalStudents);
    const below55Count = scores.filter((v) => v < 55).length;
    return {
      conceptId,
      averageMasteryPercent: avg,
      belowThresholdCount: below55Count,
      belowThresholdPercent: Math.round((below55Count / totalStudents) * 100),
    };
  });

  const misconceptionMap = new Map<string, number>();
  for (const s of students) {
    const label = s.primaryMisconception;
    if (label && !label.toLowerCase().includes('no active conceptual errors')) {
      misconceptionMap.set(label, (misconceptionMap.get(label) ?? 0) + 1);
    }
  }

  const misconceptionClusters = Array.from(misconceptionMap.entries())
    .map(([pattern, studentCount]) => ({
      pattern,
      studentCount,
      percentOfClass: Math.round((studentCount / totalStudents) * 100),
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  return {
    totalStudents,
    averageOverallMastery: Math.round(
      students.reduce((sum, s) => sum + s.overallMastery, 0) / totalStudents,
    ),
    averageReasoningScore: Math.round(
      students.reduce((sum, s) => sum + s.reasoningScore, 0) / totalStudents,
    ),
    supportNeededCount: students.filter((s) => s.supportNeeded).length,
    conceptStats,
    misconceptionClusters,
  };
}
