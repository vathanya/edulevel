import express, { type Request, type Response, type Router } from 'express';
import { DEFAULT_STUDENT_ID } from '../src/lib/agentContracts.ts';
import {
  type OrchestratorGeminiAdapters,
  runOrchestratorWorkflow,
} from '../src/lib/agentOrchestrator.ts';
import { normalizeErrorClassification } from '../src/lib/learnerModel.ts';
import type { OrchestratorWorkflowAction } from '../src/types/edu.ts';
import {
  analyzeStudentReasoning,
  evaluateConceptualUnderstanding,
  type GeminiJsonRunner,
  generateCounterfactualChallenge,
  isGeminiConfigured,
  recommendExperimentForStudent,
} from './geminiService.ts';
import { LearnerStore } from './store.ts';

export interface OrchestratorRouterOptions {
  storePath?: string;
  runner?: GeminiJsonRunner;
}

const ALLOWED_ACTION_TYPES = new Set<OrchestratorWorkflowAction['type']>([
  'diagnostic_submit',
  'adaptive_submit',
  'mentor_analyze',
  'recommend_experiment',
  'lab_observe',
  'lab_complete',
  'lab_reset',
  'counterfactual_generate',
  'counterfactual_submit',
  'mastery_gate_submit',
  'verification_submit',
  'revision_check',
  'teacher_toggle_intervention',
  'teacher_toggle_suggestion',
  'profile_update',
  'misconception_resolve',
]);

function buildAdapters(runner?: GeminiJsonRunner): OrchestratorGeminiAdapters | undefined {
  if (!runner && !isGeminiConfigured()) {
    return undefined;
  }
  return {
    async analyzeReasoning(payload) {
      const res = await analyzeStudentReasoning(payload, runner);
      return {
        ...res,
        classification: normalizeErrorClassification(res.classification),
      };
    },
    async recommendExperiment(payload) {
      return recommendExperimentForStudent(payload, runner);
    },
    async generateCounterfactual(payload) {
      return generateCounterfactualChallenge(payload, runner);
    },
    async evaluateUnderstanding(payload) {
      const res = await evaluateConceptualUnderstanding(payload, runner);
      return {
        ...res,
        classification: normalizeErrorClassification(res.classification),
      };
    },
  };
}

function getStudentIdFromReq(req: Request): string {
  const fromQuery = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body && typeof body.studentId === 'string' ? body.studentId.trim() : '';
  return fromQuery || fromBody || DEFAULT_STUDENT_ID;
}

export function createOrchestratorRouter(options: OrchestratorRouterOptions = {}): Router {
  const router = express.Router();
  const store = options.storePath ? new LearnerStore(options.storePath) : new LearnerStore();
  const mode: 'gemini' | 'deterministic' =
    options.runner || isGeminiConfigured() ? 'gemini' : 'deterministic';

  router.get('/state', (req: Request, res: Response) => {
    const studentId = getStudentIdFromReq(req);
    const state = store.getStudentState(studentId);
    res.json({
      state: { ...state, orchestratorMode: mode },
      mode,
    });
  });

  router.get('/activity', (req: Request, res: Response) => {
    const studentId = getStudentIdFromReq(req);
    const state = store.getStudentState(studentId);
    res.json({
      studentId,
      mode,
      activity: state.agentActivity,
    });
  });

  router.post('/workflow', async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        res.status(400).json({
          error: 'Workflow request body must be a JSON object.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const action = body.action as OrchestratorWorkflowAction | undefined;
      if (!action || typeof action !== 'object' || !ALLOWED_ACTION_TYPES.has(action.type)) {
        res.status(400).json({
          error: 'Invalid or unsupported orchestrator workflow action.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const studentId = getStudentIdFromReq(req);
      const currentState = store.getStudentState(studentId);
      const allowGemini = !('preferGemini' in action && action.preferGemini === false);
      const adapters = allowGemini ? buildAdapters(options.runner) : undefined;
      const result = await runOrchestratorWorkflow(currentState, action, adapters);
      const saved = store.saveStudentState({
        ...result.nextState,
        orchestratorMode: mode === 'gemini' ? result.nextState.orchestratorMode : 'deterministic',
      });

      res.json({
        state: saved,
        agentLogs: result.agentLogs,
        actionResult: result.actionResult,
        mode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Orchestrator workflow failed.';
      res.status(500).json({ error: message, code: 'ORCHESTRATOR_ERROR' });
    }
  });

  router.post('/reset', (req: Request, res: Response) => {
    const studentId = getStudentIdFromReq(req);
    const fresh = store.resetStudentState(studentId);
    res.json({
      state: { ...fresh, orchestratorMode: mode },
      mode,
    });
  });

  return router;
}
