import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import {
  analyzeStudentReasoning,
  evaluateConceptualUnderstanding,
  explainConceptPersonalised,
  GeminiConfigError,
  type GeminiJsonRunner,
  GeminiUpstreamError,
  generateAdaptiveQuestion,
  generateCounterfactualChallenge,
  generateTeacherInsights,
  getConfiguredModel,
  isGeminiConfigured,
  recommendExperimentForStudent,
} from './geminiService.ts';

interface RateBucket {
  timestamps: number[];
}

export function createAiRouter(customRunner?: GeminiJsonRunner): Router {
  const router = express.Router();
  const buckets = new Map<string, RateBucket>();

  // Sliding-window rate limiter: 30 AI requests / minute per IP
  const RATE_LIMIT = 30;
  const WINDOW_MS = 60_000;

  const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(ip) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
    if (bucket.timestamps.length >= RATE_LIMIT) {
      res.status(429).json({
        error: 'Too many AI requests. Please wait a moment before trying again.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    bucket.timestamps.push(now);
    buckets.set(ip, bucket);
    next();
  };

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      configured: customRunner ? true : isGeminiConfigured(),
      model: getConfiguredModel(),
    });
  });

  router.post('/analyze-reasoning', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.question !== 'string' || !body.question.trim()) {
        res.status(400).json({
          error: 'Request must include a non-empty physics question.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const hasAnswerOrTranscript =
        (typeof body.explanation === 'string' && body.explanation.trim().length > 0) ||
        (typeof body.rawTranscript === 'string' && body.rawTranscript.trim().length > 0) ||
        (typeof body.selectedAnswer === 'string' && body.selectedAnswer.trim().length > 0);
      if (!hasAnswerOrTranscript) {
        res.status(400).json({
          error: 'Please enter a selected answer, explanation, or voice transcript to analyze.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const result = await analyzeStudentReasoning(
        {
          question: body.question,
          selectedAnswer: typeof body.selectedAnswer === 'string' ? body.selectedAnswer : undefined,
          explanation: typeof body.explanation === 'string' ? body.explanation : undefined,
          rawTranscript: typeof body.rawTranscript === 'string' ? body.rawTranscript : undefined,
          expectedAnswer: typeof body.expectedAnswer === 'string' ? body.expectedAnswer : undefined,
          conceptId: typeof body.conceptId === 'string' ? body.conceptId : undefined,
          conceptName: typeof body.conceptName === 'string' ? body.conceptName : undefined,
          learningHistory: Array.isArray(body.learningHistory)
            ? (body.learningHistory as Array<{
                conceptName: string;
                classification: string;
                scorePercent: number;
              }>)
            : undefined,
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/generate-question', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.conceptId !== 'string' || !body.conceptId.trim()) {
        res.status(400).json({
          error: 'conceptId is required to generate an adaptive question.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const result = await generateAdaptiveQuestion(
        {
          conceptId: body.conceptId,
          masteryLevel: typeof body.masteryLevel === 'number' ? body.masteryLevel : 50,
          previousMistakes: Array.isArray(body.previousMistakes)
            ? body.previousMistakes.filter((x): x is string => typeof x === 'string')
            : [],
          difficulty:
            body.difficulty === 'Beginner' ||
            body.difficulty === 'Intermediate' ||
            body.difficulty === 'Advanced'
              ? body.difficulty
              : 'Intermediate',
          questionType:
            body.questionType === 'multiple-choice' ||
            body.questionType === 'numerical' ||
            body.questionType === 'conceptual' ||
            body.questionType === 'reasoning'
              ? body.questionType
              : 'multiple-choice',
          previousPrompts: Array.isArray(body.previousPrompts)
            ? body.previousPrompts.filter((x): x is string => typeof x === 'string')
            : [],
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/explain-concept', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.conceptId !== 'string' || !body.conceptId.trim()) {
        res.status(400).json({
          error: 'conceptId is required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const result = await explainConceptPersonalised(
        {
          conceptId: body.conceptId,
          mode:
            body.mode === 'simple' ||
            body.mode === 'step-by-step' ||
            body.mode === 'real-world' ||
            body.mode === 'analogy'
              ? body.mode
              : 'simple',
          studentDifficulty:
            typeof body.studentDifficulty === 'string' ? body.studentDifficulty : undefined,
          differentApproach: Boolean(body.differentApproach),
          previousExplanation:
            typeof body.previousExplanation === 'string' ? body.previousExplanation : undefined,
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/recommend-experiment', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.conceptId !== 'string' || !body.conceptId.trim()) {
        res.status(400).json({
          error: 'conceptId is required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const result = await recommendExperimentForStudent(
        {
          conceptId: body.conceptId,
          detectedMisconception:
            typeof body.detectedMisconception === 'string' ? body.detectedMisconception : undefined,
          masteryLevel: typeof body.masteryLevel === 'number' ? body.masteryLevel : undefined,
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/counterfactual-challenge', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.conceptId !== 'string' || !body.conceptId.trim()) {
        res.status(400).json({
          error: 'conceptId is required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const result = await generateCounterfactualChallenge(
        {
          conceptId: body.conceptId,
          lastExperimentSummary:
            typeof body.lastExperimentSummary === 'string' && body.lastExperimentSummary.trim()
              ? body.lastExperimentSummary
              : 'Measured current I = V / R across changing resistor and voltage values',
          voltage: typeof body.voltage === 'number' ? body.voltage : undefined,
          resistance: typeof body.resistance === 'number' ? body.resistance : undefined,
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/evaluate-understanding', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (
        !body ||
        typeof body.conceptId !== 'string' ||
        typeof body.scenarioOrPrompt !== 'string' ||
        typeof body.studentExplanation !== 'string' ||
        !body.studentExplanation.trim()
      ) {
        res.status(400).json({
          error: 'Please write an explanation before evaluating understanding.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const result = await evaluateConceptualUnderstanding(
        {
          contextType: body.contextType === 'mastery-gate' ? 'mastery-gate' : 'counterfactual',
          conceptId: body.conceptId,
          scenarioOrPrompt: body.scenarioOrPrompt,
          selectedChoice:
            typeof body.selectedChoice === 'string' ? body.selectedChoice : undefined,
          expectedChoice:
            typeof body.expectedChoice === 'string' ? body.expectedChoice : undefined,
          evaluationCriteria:
            typeof body.evaluationCriteria === 'string' ? body.evaluationCriteria : undefined,
          studentExplanation: body.studentExplanation,
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  router.post('/teacher-insights', rateLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.totalStudents !== 'number' || !Array.isArray(body.conceptStats)) {
        res.status(400).json({
          error: 'Aggregated classroom statistics (totalStudents, conceptStats) are required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      // Reject raw student roster PII if accidentally supplied in body
      if ('students' in body || 'names' in body || 'rollNumbers' in body) {
        res.status(400).json({
          error: 'Raw student identifiers are not permitted; supply anonymized aggregated statistics only.',
          code: 'PII_REJECTED',
        });
        return;
      }

      const result = await generateTeacherInsights(
        {
          totalStudents: body.totalStudents,
          averageOverallMastery:
            typeof body.averageOverallMastery === 'number' ? body.averageOverallMastery : 0,
          averageReasoningScore:
            typeof body.averageReasoningScore === 'number' ? body.averageReasoningScore : 0,
          supportNeededCount:
            typeof body.supportNeededCount === 'number' ? body.supportNeededCount : 0,
          conceptStats: body.conceptStats as Array<{
            conceptId: string;
            averageMasteryPercent: number;
            belowThresholdCount: number;
            belowThresholdPercent: number;
          }>,
          misconceptionClusters: Array.isArray(body.misconceptionClusters)
            ? (body.misconceptionClusters as Array<{
                pattern: string;
                studentCount: number;
                percentOfClass: number;
              }>)
            : [],
        },
        customRunner,
      );
      res.json(result);
    } catch (err) {
      handleAiError(err, res);
    }
  });

  return router;
}

function handleAiError(err: unknown, res: Response) {
  if (err instanceof GeminiConfigError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof GeminiUpstreamError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}
