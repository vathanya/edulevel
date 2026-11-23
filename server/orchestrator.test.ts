import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { DIAGNOSTIC_QUESTIONS, QUESTION_BANK, VERIFICATION_SCENARIOS } from '../src/data/mockData.ts';
import {
  assertScopedContext,
  buildScopedAgentContext,
  createInitialOrchestratedState,
  DEFAULT_STUDENT_ID,
} from '../src/lib/agentContracts.ts';
import { runOrchestratorWorkflow } from '../src/lib/agentOrchestrator.ts';
import { createOrchestratorRouter } from './orchestratorRouter.ts';
import { LearnerStore } from './store.ts';

function makeTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edulevel-test-'));
  return path.join(dir, 'db.json');
}

async function withOrchestratorServer(
  storePath: string,
  fn: (baseUrl: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use('/api/orchestrator', createOrchestratorRouter({ storePath }));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid test server address');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('Scoped agent context validates studentId and mastery bounds strictly', () => {
  const state = createInitialOrchestratedState(DEFAULT_STUDENT_ID);
  const ctx = buildScopedAgentContext(state, 'resistance', { answer: 'decreases' });
  assert.equal(ctx.studentId, DEFAULT_STUDENT_ID);
  assert.equal(ctx.conceptId, 'resistance');
  assert.ok(ctx.currentMastery >= 0 && ctx.currentMastery <= 100);

  assert.throws(
    () => assertScopedContext(ctx, 'wrong-student-id'),
    /studentId mismatch/,
  );
  assert.throws(
    () => assertScopedContext({ ...ctx, currentMastery: 120 }, DEFAULT_STUDENT_ID),
    /currentMastery/,
  );
});

test('5-agent 11-step workflow updates mastery via BKT, detects/corrects misconceptions, verifies 2 situations, and schedules SM-2 revision', async () => {
  let state = createInitialOrchestratedState(DEFAULT_STUDENT_ID);

  // Step 1-3: Diagnostic Agent -> Learner Model Agent -> Adaptive Agent -> Revision Agent
  const diagRes = await runOrchestratorWorkflow(state, {
    type: 'diagnostic_submit',
    results: DIAGNOSTIC_QUESTIONS.map((q) => ({
      conceptId: q.conceptId,
      correct: q.conceptId !== 'resistance',
      confidence: q.conceptId === 'resistance' ? 2 : 4,
      reasoning:
        q.conceptId === 'resistance'
          ? 'Not sure if resistance raises current.'
          : 'Charge rate determines current.',
    })),
  });
  state = diagRes.nextState;
  assert.equal(state.diagnosticCompleted, true);
  assert.ok(diagRes.agentLogs.some((l) => l.agentId === 'diagnostic'));
  assert.ok(diagRes.agentLogs.some((l) => l.agentId === 'learner-model'));
  assert.ok(diagRes.agentLogs.some((l) => l.agentId === 'adaptive'));
  assert.ok(diagRes.agentLogs.some((l) => l.agentId === 'revision-insights'));

  const resAfterDiag = state.concepts.find((c) => c.id === 'resistance')!;
  const prevResMastery = resAfterDiag.mastery;

  // Step 4-6: Adaptive Practice — Arithmetic slip vs Conceptual misconception
  const numQuestion = QUESTION_BANK.find((q) => q.type === 'numerical')!;
  const arithOption = numQuestion.arithmeticOptions?.[0] ?? '25 C';
  const arithRes = await runOrchestratorWorkflow(state, {
    type: 'adaptive_submit',
    question: numQuestion,
    selectedAnswer: arithOption,
    reasoningText: 'Used I = Q/t but forgot minute to second conversion',
  });
  assert.equal(arithRes.actionResult.classification, 'Calculation or arithmetic error');
  state = arithRes.nextState;

  // Step 4-6: AI Mentor evaluates misconception then verifies correction across attempts
  const mentorBad = await runOrchestratorWorkflow(state, {
    type: 'mentor_analyze',
    question: 'What happens to current if resistance increases at constant voltage?',
    explanation: 'Current increases because more resistance allows more electricity to pass.',
    conceptId: 'resistance',
    preferGemini: false,
  });
  assert.equal(
    (mentorBad.actionResult.record as { classification: string }).classification,
    'Conceptual misconception',
  );
  state = mentorBad.nextState;
  assert.ok(state.activeExperimentRec !== null);

  // Student completes 3D Lab experiment
  const labDone = await runOrchestratorWorkflow(state, {
    type: 'lab_complete',
    voltage: 12,
    resistance: 12,
  });
  state = labDone.nextState;
  assert.equal(state.labResult.completed, true);
  assert.equal(state.labResult.current, 1);

  // Student returns to Mentor and explains causally -> misconception corrected across attempts
  const mentorFixed = await runOrchestratorWorkflow(state, {
    type: 'mentor_analyze',
    question: 'What happens to current if resistance increases at constant voltage?',
    explanation:
      'Resistance opposes charge flow, so at constant voltage current decreases inversely because I = V / R.',
    conceptId: 'resistance',
    preferGemini: false,
  });
  state = mentorFixed.nextState;
  assert.equal(
    (mentorFixed.actionResult.record as { classification: string }).classification,
    'Correct conceptual understanding',
  );
  assert.ok(
    mentorFixed.agentLogs.some(
      (l) => l.agentId === 'reasoning' && l.message.toLowerCase().includes('corrected'),
    ),
  );

  const resAfterMentor = state.concepts.find((c) => c.id === 'resistance')!;
  assert.ok(resAfterMentor.mastery > prevResMastery);

  // Step 7-9: Verification across 2 distinct situations for Resistance
  const sc1 = VERIFICATION_SCENARIOS.find((s) => s.id === 'ver-res-1')!;
  const sc2 = VERIFICATION_SCENARIOS.find((s) => s.id === 'ver-res-2')!;
  const v1 = await runOrchestratorWorkflow(state, {
    type: 'verification_submit',
    conceptId: 'resistance',
    scenario: sc1,
    selectedOption: sc1.correctOption,
    reasoning:
      'Longer thinner wire increases collisions and opposes charge drift, lowering current at constant voltage.',
  });
  state = v1.nextState;
  assert.equal(state.verificationRecords.resistance.verifiedChecksCount, 1);

  const v2 = await runOrchestratorWorkflow(state, {
    type: 'verification_submit',
    conceptId: 'resistance',
    scenario: sc2,
    selectedOption: sc2.correctOption,
    reasoning:
      'Doubling rheostat coil resistance halves current because I = V / R at constant 24 V supply.',
  });
  state = v2.nextState;
  assert.equal(state.verificationRecords.resistance.verifiedChecksCount, 2);
  assert.ok(
    state.verificationRecords.resistance.status === 'Understanding Verified' ||
      state.verificationRecords.resistance.status === 'Mastery Achieved',
  );

  // Step 10: Mastery Gate unlocks Series & Parallel Circuits + smart rewards
  const gateRes = await runOrchestratorWorkflow(state, {
    type: 'mastery_gate_submit',
    studentSummary:
      'Current is directly proportional to potential difference V and inversely proportional to resistance R at constant temperature (I = V / R).',
    preferGemini: false,
  });
  state = gateRes.nextState;
  assert.equal(state.masteryGateUnlocked, true);
  assert.equal(
    state.concepts.find((c) => c.id === 'series-parallel')?.status,
    'available',
  );
  assert.ok(state.achievements.some((a) => a.unlocked && a.id === 'ach-gate-guardian'));

  // Step 11: Spaced repetition check
  const revRes = await runOrchestratorWorkflow(state, {
    type: 'revision_check',
    conceptId: 'resistance',
    success: true,
  });
  state = revRes.nextState;
  assert.ok(state.agentActivity.length >= 5);
});

test('Orchestrator Express API persists learner state and agent activity across store instances', async () => {
  const dbPath = makeTempDbPath();
  try {
    await withOrchestratorServer(dbPath, async (baseUrl) => {
      const initialRes = await fetch(`${baseUrl}/api/orchestrator/state`);
      assert.equal(initialRes.status, 200);
      const initialJson = (await initialRes.json()) as {
        state: { studentId: string; labResult: { completed: boolean } };
        mode: string;
      };
      assert.equal(initialJson.state.studentId, DEFAULT_STUDENT_ID);
      assert.equal(initialJson.state.labResult.completed, false);

      const badRes = await fetch(`${baseUrl}/api/orchestrator/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'not_a_real_action' } }),
      });
      assert.equal(badRes.status, 400);

      const wfRes = await fetch(`${baseUrl}/api/orchestrator/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'lab_complete', voltage: 18, resistance: 6 },
        }),
      });
      assert.equal(wfRes.status, 200);
      const wfJson = (await wfRes.json()) as {
        state: { labResult: { completed: boolean; current: number } };
        agentLogs: Array<{ agentId: string }>;
      };
      assert.equal(wfJson.state.labResult.completed, true);
      assert.equal(wfJson.state.labResult.current, 3);
      assert.ok(wfJson.agentLogs.length >= 3);

      const actRes = await fetch(`${baseUrl}/api/orchestrator/activity`);
      assert.equal(actRes.status, 200);
      const actJson = (await actRes.json()) as { activity: Array<{ message: string }> };
      assert.ok(actJson.activity.length > 0);
    });

    // Re-read using a fresh LearnerStore instance to prove persistent disk DB
    const freshStore = new LearnerStore(dbPath);
    const reloaded = freshStore.getStudentState(DEFAULT_STUDENT_ID);
    assert.equal(reloaded.labResult.completed, true);
    assert.equal(reloaded.labResult.current, 3);

    // Verify reset endpoint restores initial state
    await withOrchestratorServer(dbPath, async (baseUrl) => {
      const resetRes = await fetch(`${baseUrl}/api/orchestrator/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(resetRes.status, 200);
      const resetJson = (await resetRes.json()) as {
        state: { labResult: { completed: boolean } };
      };
      assert.equal(resetJson.state.labResult.completed, false);
    });
  } finally {
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  }
});
