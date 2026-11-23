import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAiRouter } from './aiRouter.ts';
import { type GeminiJsonRunner } from './geminiService.ts';

async function withServer(
  runner: GeminiJsonRunner | undefined,
  fn: (baseUrl: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', createAiRouter(runner));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid address');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('Case 1: Correct conceptual understanding returns structured JSON', async () => {
  const mockRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      classification: 'Correct conceptual understanding',
      misconceptionIdentified: false,
      specificMisconception: 'No confirmed misconception',
      confidence: 95,
      reasoningEvidence: 'Correctly links inverse proportionality I = V / R at fixed voltage.',
      shortExplanation: 'Great causal reasoning connecting resistance opposition to lower current.',
      followUpQuestion: 'What happens if voltage doubles while resistance remains fixed?',
      recommendedAction: 'Try Condition Flip',
      recommendedExperimentId: 'ohms-law-bench',
      detectedConcept: 'Resistance',
    });

  await withServer(mockRunner, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What happens to current when R increases at constant V?',
        explanation: 'Resistance opposes electron flow, so current decreases via I = V / R.',
        conceptId: 'resistance',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.classification, 'Correct conceptual understanding');
    assert.equal(data.misconceptionIdentified, false);
    assert.equal(data.confidence, 95);
  });
});

test('Case 2: Conceptual misconception identifies specific misconception with evidence', async () => {
  const mockRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      classification: 'Conceptual misconception',
      misconceptionIdentified: true,
      specificMisconception: 'Believes higher resistance pushes more current',
      confidence: 91,
      reasoningEvidence: 'States higher resistance allows more electricity to pass.',
      shortExplanation: 'Resistance opposes charge flow; higher R lowers I at fixed V.',
      followUpQuestion: 'In I = 12 / R, is 12 / 12 larger or smaller than 12 / 4?',
      recommendedAction: 'Run 3D Resistance Experiment',
      recommendedExperimentId: 'resistance-rheostat',
      detectedConcept: 'Resistance',
    });

  await withServer(mockRunner, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What happens to current when R increases?',
        explanation: 'Current increases because higher resistance lets more current pass.',
        conceptId: 'resistance',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.classification, 'Conceptual misconception');
    assert.equal(data.misconceptionIdentified, true);
    assert.equal(data.recommendedExperimentId, 'resistance-rheostat');
  });
});

test('Case 3: Arithmetic error distinguishes calculation slip from misconception', async () => {
  const mockRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      classification: 'Calculation or arithmetic error',
      misconceptionIdentified: false,
      specificMisconception: 'No conceptual misconception; multiplied V * R instead of dividing V / R',
      confidence: 88,
      reasoningEvidence: 'Formula direction understood, arithmetic operation inverted.',
      shortExplanation: 'Use division I = V / R (12 / 4 = 3 A) instead of multiplying.',
      followUpQuestion: 'Recompute 12 V divided by 4 Ω.',
      recommendedAction: 'Practice Ratio Drills',
      recommendedExperimentId: 'ohms-law-bench',
      detectedConcept: "Ohm's Law",
    });

  await withServer(mockRunner, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Find current for 12 V and 4 ohms.',
        explanation: 'I know I = V/R but 12 times 4 is 48 A.',
        conceptId: 'ohms-law',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.classification, 'Calculation or arithmetic error');
  });
});

test('Case 4: Incomplete or brief reasoning triggers low-confidence probe instead of false diagnosis', async () => {
  const mockRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      classification: 'Conceptual misconception',
      misconceptionIdentified: true,
      specificMisconception: 'Guessed',
      confidence: 95,
      reasoningEvidence: 'Too brief',
      shortExplanation: 'Need more explanation.',
      followUpQuestion: 'Why does current change when R increases?',
      recommendedAction: 'Explain further',
      recommendedExperimentId: 'resistance-rheostat',
      detectedConcept: 'Resistance',
    });

  await withServer(mockRunner, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What happens to current when R increases?',
        explanation: 'It drops.',
        conceptId: 'resistance',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    // Server guardrail overrides unsupported high-certainty misconception when <4 words
    assert.equal(data.classification, 'Insufficient evidence');
    assert.equal(data.misconceptionIdentified, false);
    assert.ok(data.confidence <= 68);
    assert.ok(data.followUpQuestion.length > 0);
  });
});

test('Case 5: Unclear speech transcription preserves originalTranscript and cleans fillers before analysis', async () => {
  let capturedPrompt = '';
  const mockRunner: GeminiJsonRunner = async ({ prompt }) => {
    capturedPrompt = prompt;
    return JSON.stringify({
      classification: 'Correct conceptual understanding',
      misconceptionIdentified: false,
      specificMisconception: 'No confirmed misconception',
      confidence: 90,
      reasoningEvidence: 'Correctly links higher resistance to lower current.',
      shortExplanation: 'Clear causal explanation.',
      followUpQuestion: 'What if V doubles?',
      recommendedAction: 'Try Condition Flip',
      recommendedExperimentId: 'ohms-law-bench',
      detectedConcept: 'Resistance',
    });
  };

  await withServer(mockRunner, async (baseUrl) => {
    const rawSpeech = 'Um, when resistance goes up, uh, like, current goes down because R opposes flow.';
    const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What happens to current when R increases?',
        rawTranscript: rawSpeech,
        conceptId: 'resistance',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.originalTranscript, rawSpeech);
    assert.equal(
      data.cleanedTranscript,
      'When resistance goes up, like, current goes down because R opposes flow.',
    );
    assert.ok(capturedPrompt.includes('When resistance goes up'));
  });
});

test('Case 6: Missing GEMINI_API_KEY returns explicit 503 error without faking AI responses', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await withServer(undefined, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/ai/analyze-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What is Ohm law?',
          explanation: 'Voltage equals current times resistance.',
          conceptId: 'ohms-law',
        }),
      });
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.code, 'MISSING_API_KEY');
      assert.ok(data.error.includes('GEMINI_API_KEY'));
    });
  } finally {
    if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
  }
});

test('Case 7: Adaptive question generator rejects mathematically invalid Ohm law numericals', async () => {
  const badMathRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      prompt: 'A 12 V battery drives current through a 4 Ω resistor. What current flows?',
      options: ['48 A', '3 A', '8 A', '16 A'],
      correctAnswer: '48 A',
      explanation: 'Wrong multiplication',
      expectedReasoning: 'I = V / R',
      conceptTags: ['ohms-law'],
      misconceptionDistractors: ['3 A'],
    });

  await withServer(badMathRunner, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/ai/generate-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId: 'ohms-law',
        masteryLevel: 44,
        difficulty: 'Beginner',
        questionType: 'numerical',
      }),
    });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.code, 'PHYSICS_VERIFICATION_FAILED');
  });
});

test('Case 8: Teacher insights rejects raw student PII and returns structured insights for anonymized stats', async () => {
  const mockRunner: GeminiJsonRunner = async () =>
    JSON.stringify({
      summary: 'Resistance and Ohm law remain below 55% for one-third of the class.',
      misunderstoodConcepts: [
        { conceptName: 'Resistance', pattern: 'Assumes higher R raises I', affectedPercent: 33 },
      ],
      conceptsNeedingReteaching: ['Resistance', "Ohm's Law"],
      recommendedInterventions: [
        {
          title: 'Rheostat 3D Sweep',
          targetConcept: 'Resistance',
          actionStep: 'Have students hold V=12 V fixed while doubling R.',
        },
      ],
    });

  await withServer(mockRunner, async (baseUrl) => {
    const piiRes = await fetch(`${baseUrl}/api/ai/teacher-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalStudents: 1,
        conceptStats: [],
        students: [{ name: 'Aarav Sharma', rollNo: '10A-01' }],
      }),
    });
    assert.equal(piiRes.status, 400);
    const piiData = await piiRes.json();
    assert.equal(piiData.code, 'PII_REJECTED');

    const okRes = await fetch(`${baseUrl}/api/ai/teacher-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalStudents: 30,
        averageOverallMastery: 66,
        averageReasoningScore: 68,
        supportNeededCount: 10,
        conceptStats: [
          {
            conceptId: 'resistance',
            averageMasteryPercent: 52,
            belowThresholdCount: 10,
            belowThresholdPercent: 33,
          },
        ],
        misconceptionClusters: [
          {
            pattern: 'Believes higher resistance increases current at constant V',
            studentCount: 10,
            percentOfClass: 33,
          },
        ],
      }),
    });
    assert.equal(okRes.status, 200);
    const insights = await okRes.json();
    assert.equal(insights.conceptsNeedingReteaching[0], 'Resistance');
  });
});
