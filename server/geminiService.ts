import { GoogleGenAI, ThinkingLevel, Type, type Schema } from '@google/genai';
import {
  prepareVoiceTranscript,
  verifyOhmsLawNumericalConsistency,
} from '../src/lib/learnerModel.ts';
import type {
  CounterfactualChallenge,
  DifficultyLevel,
  ErrorClassification,
  ExperimentId,
  ExperimentRecommendation,
  ExplanationMode,
  QuestionItem,
  QuestionType,
  TeacherInsightsResult,
} from '../src/types/edu.ts';
import { EXPERIMENT_CATALOG, getSyllabusContext, SYLLABUS_TOPICS } from './syllabus.ts';

export class GeminiConfigError extends Error {
  readonly code = 'MISSING_API_KEY';
  readonly status = 503;
}

export class GeminiUpstreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 502, code = 'GEMINI_UPSTREAM_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface GeminiCallParams {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
}

export type GeminiJsonRunner = (params: GeminiCallParams) => Promise<string>;

const DEFAULT_MODEL = 'gemini-4-hydrogen';
const REQUEST_TIMEOUT_MS = 18000;
const MAX_RETRIES = 1;

const ALLOWED_CLASSIFICATIONS: readonly ErrorClassification[] = [
  'Correct conceptual understanding',
  'Conceptual misconception',
  'Calculation or arithmetic error',
  'Incomplete reasoning',
  'Insufficient evidence',
];

export function getConfiguredModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  return envModel && envModel.length > 0 ? envModel : DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHttpStatusFromError(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>;
    if (typeof rec.status === 'number') return rec.status;
    if (typeof rec.statusCode === 'number') return rec.statusCode;
  }
  return undefined;
}

function isTransientError(err: unknown): boolean {
  const status = getHttpStatusFromError(err);
  if (status === 429 || status === 503 || status === 504) return true;
  if (err instanceof Error) {
    return /timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed|429|503/i.test(err.message);
  }
  return false;
}

export function sanitizeText(value: unknown, maxLen = 1500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLen);
}

export function createDefaultGeminiRunner(): GeminiJsonRunner {
  return async ({ systemInstruction, prompt, responseSchema }) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new GeminiConfigError(
        'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in environment secrets to enable live Gemini intelligence.',
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const model = getConfiguredModel();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const callPromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            reject(
              new GeminiUpstreamError(
                'Gemini request timed out. Please verify network connectivity and GEMINI_API_KEY configuration, then try again.',
                504,
                'GEMINI_TIMEOUT',
              ),
            );
          }, REQUEST_TIMEOUT_MS);
        });

        const response = await Promise.race([callPromise, timeoutPromise]);
        const text = response.text;
        if (!text || text.trim().length === 0) {
          throw new GeminiUpstreamError('Gemini returned an empty response.', 502, 'EMPTY_RESPONSE');
        }
        return text;
      } catch (err) {
        lastError = err;
        const status = getHttpStatusFromError(err);
        const msg = err instanceof Error ? err.message : String(err);

        if (err instanceof GeminiUpstreamError && err.status === 504) {
          throw err;
        }
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          throw new GeminiUpstreamError(msg, status === 404 ? 502 : status, 'GEMINI_CLIENT_REJECTED');
        }
        if (attempt < MAX_RETRIES && isTransientError(err)) {
          await sleep(350 * Math.pow(2, attempt));
          continue;
        }
        break;
      }
    }

    if (lastError instanceof GeminiUpstreamError || lastError instanceof GeminiConfigError) {
      throw lastError;
    }
    const status = getHttpStatusFromError(lastError);
    if (status === 429) {
      throw new GeminiUpstreamError(
        'Gemini API quota or rate limit reached. Please wait briefly and try again.',
        429,
        'GEMINI_RATE_LIMITED',
      );
    }
    const msg = lastError instanceof Error ? lastError.message : 'Gemini API call failed.';
    throw new GeminiUpstreamError(msg, 502, 'GEMINI_UPSTREAM_ERROR');
  };
}

function parseJsonResponse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new GeminiUpstreamError(
      'Gemini returned malformed structured JSON.',
      502,
      'INVALID_MODEL_JSON',
    );
  }
}

function normalizeClassification(value: string): ErrorClassification {
  const matched = ALLOWED_CLASSIFICATIONS.find(
    (c) => c.toLowerCase() === value.trim().toLowerCase(),
  );
  return matched ?? 'Incomplete reasoning';
}

// ============================================================================
// 1. AI REASONING AND MISCONCEPTION DETECTION
// ============================================================================

export interface AnalyzeReasoningInput {
  question: string;
  selectedAnswer?: string;
  explanation?: string;
  rawTranscript?: string;
  expectedAnswer?: string;
  conceptId?: string;
  conceptName?: string;
  learningHistory?: Array<{
    conceptName: string;
    classification: string;
    scorePercent: number;
  }>;
}

export interface AnalyzeReasoningOutput {
  classification: ErrorClassification;
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
}

export async function analyzeStudentReasoning(
  input: AnalyzeReasoningInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<AnalyzeReasoningOutput> {
  const question = sanitizeText(input.question, 600);
  const selectedAnswer = sanitizeText(input.selectedAnswer ?? '', 400);
  const rawTranscript = sanitizeText(input.rawTranscript ?? '', 1500);
  const rawExplanation = sanitizeText(input.explanation ?? '', 1500);

  const voiceData = rawTranscript ? prepareVoiceTranscript(rawTranscript) : null;
  const studentExplanation = voiceData ? voiceData.cleanedTranscript : rawExplanation;

  const conceptId = sanitizeText(input.conceptId ?? 'resistance', 80) || 'resistance';
  const syllabus = getSyllabusContext(conceptId);
  const expectedAnswer = sanitizeText(
    input.expectedAnswer ?? syllabus.coreFacts.join(' '),
    800,
  );
  const historySummary = (input.learningHistory ?? [])
    .slice(0, 6)
    .map((h) => `${sanitizeText(h.conceptName, 60)}: ${sanitizeText(h.classification, 50)} (${h.scorePercent}%)`)
    .join('; ');

  const systemInstruction = `You are EduLevel's Class 10 Physics reasoning assessor.
Analyze the student's reasoning, not just their final choice. Ground your physics assessment strictly in the verified syllabus reference below:
Topic: ${syllabus.name} (${syllabus.chapter})
Formulas: ${syllabus.formulas.join(' | ')}
Core facts: ${syllabus.coreFacts.join(' ')}
Known misconceptions: ${syllabus.commonMisconceptions.join(' ')}

Classification Rules (choose EXACTLY ONE):
- "Correct conceptual understanding": Student states the true physics principle and valid causal chain.
- "Conceptual misconception": Student holds a clear false physical model (only choose this if explicit evidence supports it).
- "Calculation or arithmetic error": Student knows the physical relationship or formula direction, but made a multiplication/division/unit/sign slip.
- "Incomplete reasoning": Final direction or partial idea is plausible, but causal explanation or mechanism is missing or partial.
- "Insufficient evidence": Input is empty, off-topic, fewer than ~6 meaningful words, or ambiguous—NEVER claim a misconception with high certainty from insufficient evidence.

If confidence < 75 or classification is "Incomplete reasoning" or "Insufficient evidence", generate a targeted Socratic followUpQuestion to probe their thinking instead of asserting a misconception.`;

  const prompt = `Question: ${question}
Selected Answer: ${selectedAnswer || '(open-ended response)'}
Student Explanation: ${studentExplanation || '(no written explanation provided)'}
Expected Principle / Answer: ${expectedAnswer}
Recent Learning History: ${historySummary || 'None provided'}
Available Experiments: ${EXPERIMENT_CATALOG.map((e) => `${e.experimentId}: ${e.title}`).join(' | ')}

Return structured JSON evaluating the reasoning.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      classification: {
        type: Type.STRING,
        description:
          'Must be exactly one of: Correct conceptual understanding, Conceptual misconception, Calculation or arithmetic error, Incomplete reasoning, Insufficient evidence',
      },
      misconceptionIdentified: { type: Type.BOOLEAN },
      specificMisconception: {
        type: Type.STRING,
        description:
          'Specific misconception only when supported by evidence; otherwise state "No confirmed misconception" or note insufficient evidence.',
      },
      confidence: {
        type: Type.INTEGER,
        description: 'Confidence from 0 to 100. Keep below 70 if evidence is thin or ambiguous.',
      },
      reasoningEvidence: { type: Type.STRING },
      shortExplanation: { type: Type.STRING },
      followUpQuestion: { type: Type.STRING },
      recommendedAction: { type: Type.STRING },
      recommendedExperimentId: {
        type: Type.STRING,
        description:
          'One of: ohms-law-bench, resistance-rheostat, series-parallel-explorer, optics-prism-lab, solenoid-field-lab',
      },
      detectedConcept: { type: Type.STRING },
    },
    required: [
      'classification',
      'misconceptionIdentified',
      'specificMisconception',
      'confidence',
      'reasoningEvidence',
      'shortExplanation',
      'followUpQuestion',
      'recommendedAction',
      'recommendedExperimentId',
      'detectedConcept',
    ],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    classification: string;
    misconceptionIdentified: boolean;
    specificMisconception: string;
    confidence: number;
    reasoningEvidence: string;
    shortExplanation: string;
    followUpQuestion: string;
    recommendedAction: string;
    recommendedExperimentId: string;
    detectedConcept: string;
  }>(rawJson);

  let classification = normalizeClassification(parsed.classification);
  let confidence = Math.max(10, Math.min(99, Math.round(Number(parsed.confidence) || 60)));
  let misconceptionIdentified = Boolean(parsed.misconceptionIdentified);
  let specificMisconception = sanitizeText(parsed.specificMisconception, 300);

  // Guardrail: never claim high-certainty misconception from very brief/insufficient input
  const combinedLength = `${selectedAnswer} ${studentExplanation}`.trim().split(/\s+/).filter(Boolean).length;
  if (combinedLength < 4 && classification === 'Conceptual misconception') {
    classification = 'Insufficient evidence';
    misconceptionIdentified = false;
    confidence = Math.min(confidence, 55);
    specificMisconception = 'Insufficient evidence to diagnose a specific misconception yet.';
  }
  if (classification === 'Insufficient evidence') {
    misconceptionIdentified = false;
    confidence = Math.min(confidence, 68);
  }

  const validExp = EXPERIMENT_CATALOG.find(
    (e) => e.experimentId === parsed.recommendedExperimentId,
  )?.experimentId;

  return {
    classification,
    misconceptionIdentified,
    specificMisconception:
      specificMisconception || 'No specific misconception identified.',
    confidence,
    reasoningEvidence: sanitizeText(parsed.reasoningEvidence, 400),
    shortExplanation: sanitizeText(parsed.shortExplanation, 500),
    followUpQuestion: sanitizeText(parsed.followUpQuestion, 400),
    recommendedAction: sanitizeText(parsed.recommendedAction, 200),
    recommendedExperimentId: validExp ?? 'resistance-rheostat',
    detectedConcept: sanitizeText(parsed.detectedConcept, 120) || syllabus.name,
    targetConceptId: conceptId,
    ...(voiceData
      ? {
          originalTranscript: voiceData.originalTranscript,
          cleanedTranscript: voiceData.cleanedTranscript,
        }
      : {}),
  };
}

// ============================================================================
// 2. ADAPTIVE QUESTION GENERATION
// ============================================================================

export interface GenerateQuestionInput {
  conceptId: string;
  masteryLevel: number;
  previousMistakes?: string[];
  difficulty: DifficultyLevel;
  questionType: 'multiple-choice' | 'numerical' | 'conceptual' | 'reasoning';
  previousPrompts?: string[];
}

export async function generateAdaptiveQuestion(
  input: GenerateQuestionInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<QuestionItem> {
  const conceptId = sanitizeText(input.conceptId, 80) || 'ohms-law';
  const syllabus = getSyllabusContext(conceptId);
  const difficulty: DifficultyLevel =
    input.difficulty === 'Beginner' ||
    input.difficulty === 'Intermediate' ||
    input.difficulty === 'Advanced'
      ? input.difficulty
      : 'Intermediate';

  const mappedType: QuestionType =
    input.questionType === 'multiple-choice'
      ? 'mcq'
      : input.questionType === 'numerical' ||
          input.questionType === 'conceptual' ||
          input.questionType === 'reasoning'
        ? input.questionType
        : 'mcq';

  const mistakes = (input.previousMistakes ?? [])
    .slice(0, 5)
    .map((m) => sanitizeText(m, 200))
    .filter(Boolean);
  const avoidPrompts = (input.previousPrompts ?? [])
    .slice(0, 10)
    .map((p) => sanitizeText(p, 160))
    .filter(Boolean);

  const systemInstruction = `You are a Class 10 Physics adaptive assessment author.
Generate ONE syllabus-aligned question strictly grounded in:
Topic: ${syllabus.name} (${syllabus.chapter})
Formulas: ${syllabus.formulas.join(' | ')}
Facts: ${syllabus.coreFacts.join(' ')}

Requirements:
- Difficulty: ${difficulty} (Beginner = direct recall/1-step; Intermediate = 2-step or graph/relationship; Advanced = multi-step transfer or non-ideal condition).
- Question Type: ${input.questionType}.
- Target student mastery: ${Math.max(0, Math.min(100, Math.round(input.masteryLevel)))}%.
- Include plausible misconceptionDistractors (e.g., formula inversion, unit error, conceptual trap) when options are applicable.
- For "multiple-choice" or "numerical" or "conceptual", provide 4 distinct options where exactly ONE equals correctAnswer.
- For "reasoning", set options to an empty array [] and provide clear expectedReasoning.
- Verify all numerical arithmetic carefully (e.g., V = I * R, Q = I * t, W = V * Q, 1/Rp = 1/R1 + 1/R2).
- Never repeat any question from the previously seen list.`;

  const prompt = `Generate a unique ${difficulty} ${input.questionType} question for ${syllabus.name}.
Previous student mistakes to address: ${mistakes.join('; ') || 'None recorded'}
Previously seen prompts to AVOID repeating: ${avoidPrompts.join(' || ') || 'None'}

Return structured JSON.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      correctAnswer: { type: Type.STRING },
      explanation: { type: Type.STRING },
      expectedReasoning: { type: Type.STRING },
      conceptTags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      misconceptionDistractors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      arithmeticDistractors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      unit: { type: Type.STRING },
      conceptTrap: { type: Type.STRING },
    },
    required: [
      'prompt',
      'options',
      'correctAnswer',
      'explanation',
      'expectedReasoning',
      'conceptTags',
      'misconceptionDistractors',
    ],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    expectedReasoning: string;
    conceptTags: string[];
    misconceptionDistractors: string[];
    arithmeticDistractors?: string[];
    unit?: string;
    conceptTrap?: string;
  }>(rawJson);

  const qPrompt = sanitizeText(parsed.prompt, 600);
  const correctAnswer = sanitizeText(parsed.correctAnswer, 250);
  if (!qPrompt || !correctAnswer) {
    throw new GeminiUpstreamError('Generated question lacked prompt or answer.', 502, 'INVALID_QUESTION');
  }

  // Deterministic physics formula check on generated numericals
  const physicsCheck = verifyOhmsLawNumericalConsistency(qPrompt, correctAnswer);
  if (!physicsCheck.valid) {
    throw new GeminiUpstreamError(
      `Generated numerical failed physics consistency check: ${physicsCheck.reason}`,
      502,
      'PHYSICS_VERIFICATION_FAILED',
    );
  }

  let options = Array.isArray(parsed.options)
    ? parsed.options.map((o) => sanitizeText(o, 200)).filter(Boolean)
    : [];

  if (mappedType !== 'reasoning') {
    if (!options.includes(correctAnswer)) {
      options = [correctAnswer, ...options.slice(0, 3)];
    }
    // Deduplicate options
    options = Array.from(new Set(options)).slice(0, 4);
  } else {
    options = [];
  }

  return {
    id: `ai-q-${Date.now()}`,
    conceptId,
    conceptName: syllabus.name,
    difficulty,
    type: mappedType,
    prompt: qPrompt,
    options: options.length > 0 ? options : undefined,
    correctAnswer,
    misconceptionOptions: (parsed.misconceptionDistractors ?? []).map((s) => sanitizeText(s, 200)),
    arithmeticOptions: (parsed.arithmeticDistractors ?? []).map((s) => sanitizeText(s, 200)),
    unit: parsed.unit ? sanitizeText(parsed.unit, 20) : undefined,
    explanation: sanitizeText(parsed.explanation, 600),
    expectedReasoning: sanitizeText(parsed.expectedReasoning, 400),
    conceptTags: (parsed.conceptTags ?? [syllabus.name]).map((t) => sanitizeText(t, 60)),
    conceptTrap: parsed.conceptTrap ? sanitizeText(parsed.conceptTrap, 200) : undefined,
    source: 'gemini',
    physicsVerified: true,
  };
}

// ============================================================================
// 3. PERSONALISED AI EXPLANATIONS
// ============================================================================

export interface ExplainConceptInput {
  conceptId: string;
  mode: ExplanationMode;
  studentDifficulty?: string;
  differentApproach?: boolean;
  previousExplanation?: string;
}

export interface ExplainConceptOutput {
  conceptId: string;
  mode: ExplanationMode;
  explanation: string;
  keyFormula?: string;
  checkQuestion: string;
  syllabusGrounded: boolean;
  differentApproach: boolean;
}

export async function explainConceptPersonalised(
  input: ExplainConceptInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<ExplainConceptOutput> {
  const conceptId = sanitizeText(input.conceptId, 80) || 'resistance';
  const syllabus = getSyllabusContext(conceptId);
  const mode: ExplanationMode =
    input.mode === 'simple' ||
    input.mode === 'step-by-step' ||
    input.mode === 'real-world' ||
    input.mode === 'analogy'
      ? input.mode
      : 'simple';

  const systemInstruction = `You are EduLevel's Class 10 Physics tutor.
Ground your explanation STRICTLY in the verified syllabus reference below. Do not invent non-syllabus laws or contradicting formulas.
Topic: ${syllabus.name} (${syllabus.chapter})
Formulas: ${syllabus.formulas.join(' | ')}
Verified Facts: ${syllabus.coreFacts.join(' ')}
Common Misconceptions to clarify: ${syllabus.commonMisconceptions.join(' ')}

Mode instruction:
- simple: Clear, concise 3-4 sentences in everyday Class 10 language.
- step-by-step: Numbered causal steps from setup -> formula -> physical effect.
- real-world: Practical household or lab example (e.g., lamp dimmer, toaster coil, car mirror, spectacles).
- analogy: Accurate physical analogy (explicitly noting where the analogy maps to V, I, or R).`;

  const prompt = `Explain "${syllabus.name}" using mode "${mode}".
Student difficulty/confusion note: ${sanitizeText(input.studentDifficulty ?? 'General understanding', 300)}
${input.differentApproach ? `The student still didn't understand the previous explanation ("${sanitizeText(input.previousExplanation ?? '', 300)}"). Use a genuinely fresh perspective.` : ''}
Include a short 1-sentence checkQuestion at the end.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      keyFormula: { type: Type.STRING },
      checkQuestion: { type: Type.STRING },
    },
    required: ['explanation', 'checkQuestion'],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    explanation: string;
    keyFormula?: string;
    checkQuestion: string;
  }>(rawJson);

  return {
    conceptId,
    mode,
    explanation: sanitizeText(parsed.explanation, 1200),
    keyFormula: parsed.keyFormula ? sanitizeText(parsed.keyFormula, 80) : syllabus.formulas[0],
    checkQuestion: sanitizeText(parsed.checkQuestion, 300),
    syllabusGrounded: true,
    differentApproach: Boolean(input.differentApproach),
  };
}

// ============================================================================
// 4. EXPERIMENT RECOMMENDATION
// ============================================================================

export interface RecommendExperimentInput {
  conceptId: string;
  detectedMisconception?: string;
  masteryLevel?: number;
}

export async function recommendExperimentForStudent(
  input: RecommendExperimentInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<ExperimentRecommendation> {
  const conceptId = sanitizeText(input.conceptId, 80) || 'resistance';
  const syllabus = getSyllabusContext(conceptId);

  const systemInstruction = `You are EduLevel's physics lab director.
Recommend the best existing experiment from the verified catalog below so the student can test their misconception empirically. Never invent physics rules or simulation values; the 3D Lab calculates V = I * R deterministically.
Catalog:
${EXPERIMENT_CATALOG.map((e) => `- ${e.experimentId}: ${e.title} (variables: ${e.variables.join(', ')})`).join('\n')}`;

  const prompt = `Concept: ${syllabus.name} (${conceptId})
Mastery: ${Math.round(input.masteryLevel ?? 40)}%
Detected Misconception / Confusion: ${sanitizeText(input.detectedMisconception ?? 'Unclear causal relationship', 300)}
Select the matching experimentId, learningObjective, variablesToManipulate, expectedObservation, and followUpQuestion.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      experimentId: { type: Type.STRING },
      title: { type: Type.STRING },
      learningObjective: { type: Type.STRING },
      variablesToManipulate: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      expectedObservation: { type: Type.STRING },
      followUpQuestion: { type: Type.STRING },
    },
    required: [
      'experimentId',
      'title',
      'learningObjective',
      'variablesToManipulate',
      'expectedObservation',
      'followUpQuestion',
    ],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    experimentId: string;
    title: string;
    learningObjective: string;
    variablesToManipulate: string[];
    expectedObservation: string;
    followUpQuestion: string;
  }>(rawJson);

  const catalogMatch =
    EXPERIMENT_CATALOG.find((e) => e.experimentId === parsed.experimentId) ??
    EXPERIMENT_CATALOG[0];

  return {
    experimentId: catalogMatch.experimentId,
    title: sanitizeText(parsed.title, 120) || catalogMatch.title,
    targetConceptId: conceptId,
    learningObjective: sanitizeText(parsed.learningObjective, 300),
    variablesToManipulate: Array.isArray(parsed.variablesToManipulate)
      ? parsed.variablesToManipulate.map((v) => sanitizeText(v, 80)).filter(Boolean).slice(0, 4)
      : catalogMatch.variables,
    expectedObservation: sanitizeText(parsed.expectedObservation, 300),
    followUpQuestion: sanitizeText(parsed.followUpQuestion, 300),
  };
}

// ============================================================================
// 5. COUNTERFACTUAL CHALLENGE GENERATION
// ============================================================================

export interface CounterfactualInput {
  conceptId: string;
  lastExperimentSummary: string;
  voltage?: number;
  resistance?: number;
}

export async function generateCounterfactualChallenge(
  input: CounterfactualInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<CounterfactualChallenge> {
  const conceptId = sanitizeText(input.conceptId, 80) || 'ohms-law';
  const syllabus = getSyllabusContext(conceptId);

  const systemInstruction = `You are EduLevel's Challenge Arena designer.
Create a realistic Class 10 counterfactual ("what if this variable changes instead?") physics scenario grounded strictly in:
Topic: ${syllabus.name} (${syllabus.formulas.join(' | ')})
Core facts: ${syllabus.coreFacts.join(' ')}
Provide 4 clear prediction choices where exactly ONE equals expectedChoice, plus evaluationCriteria describing what causal reasoning a passing explanation must include.`;

  const prompt = `Student just completed: ${sanitizeText(input.lastExperimentSummary, 300)}
Lab parameters observed: Voltage=${input.voltage ?? 12} V, Resistance=${input.resistance ?? 6} Ω.
Generate a fresh counterfactual transfer challenge where one condition flips or changes.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      scenario: { type: Type.STRING },
      changedCondition: { type: Type.STRING },
      choices: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      expectedChoice: { type: Type.STRING },
      evaluationCriteria: { type: Type.STRING },
    },
    required: [
      'scenario',
      'changedCondition',
      'choices',
      'expectedChoice',
      'evaluationCriteria',
    ],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    scenario: string;
    changedCondition: string;
    choices: string[];
    expectedChoice: string;
    evaluationCriteria: string;
  }>(rawJson);

  const expectedChoice = sanitizeText(parsed.expectedChoice, 160);
  let choices = Array.isArray(parsed.choices)
    ? parsed.choices.map((c) => sanitizeText(c, 160)).filter(Boolean)
    : [];
  if (expectedChoice && !choices.includes(expectedChoice)) {
    choices = [expectedChoice, ...choices.slice(0, 3)];
  }
  choices = Array.from(new Set(choices)).slice(0, 4);

  return {
    id: `cf-${Date.now()}`,
    basedOnExperiment: sanitizeText(input.lastExperimentSummary, 160),
    targetConceptId: conceptId,
    scenario: sanitizeText(parsed.scenario, 450),
    changedCondition: sanitizeText(parsed.changedCondition, 200),
    choices,
    expectedChoice,
    evaluationCriteria: sanitizeText(parsed.evaluationCriteria, 350),
    source: 'gemini',
  };
}

// ============================================================================
// 6. COUNTERFACTUAL & MASTERY GATE UNDERSTANDING EVALUATION
// ============================================================================

export interface EvaluateUnderstandingInput {
  contextType: 'counterfactual' | 'mastery-gate';
  conceptId: string;
  scenarioOrPrompt: string;
  selectedChoice?: string;
  expectedChoice?: string;
  evaluationCriteria?: string;
  studentExplanation: string;
}

export interface EvaluateUnderstandingOutput {
  passed: boolean;
  classification: ErrorClassification;
  confidence: number;
  feedback: string;
  missingElement?: string;
}

export async function evaluateConceptualUnderstanding(
  input: EvaluateUnderstandingInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<EvaluateUnderstandingOutput> {
  const conceptId = sanitizeText(input.conceptId, 80) || 'ohms-law';
  const syllabus = getSyllabusContext(conceptId);
  const voiceCleaned = prepareVoiceTranscript(sanitizeText(input.studentExplanation, 1500));

  const systemInstruction = `You are EduLevel's Mastery & Transfer evaluator.
Verify genuine causal understanding against Class 10 Physics syllabus facts:
Topic: ${syllabus.name}
Formulas: ${syllabus.formulas.join(' | ')}
Facts: ${syllabus.coreFacts.join(' ')}

Set passed=true ONLY if the prediction (when provided) is physically right AND the student's explanation demonstrates accurate cause-and-effect rather than vague guessing.`;

  const prompt = `Evaluation Type: ${input.contextType}
Prompt/Scenario: ${sanitizeText(input.scenarioOrPrompt, 500)}
${input.selectedChoice ? `Student Selected Prediction: ${sanitizeText(input.selectedChoice, 200)}` : ''}
${input.expectedChoice ? `Expected Prediction: ${sanitizeText(input.expectedChoice, 200)}` : ''}
${input.evaluationCriteria ? `Rubric Criteria: ${sanitizeText(input.evaluationCriteria, 300)}` : ''}
Student Explanation: ${voiceCleaned.cleanedTranscript || '(empty)'}`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      passed: { type: Type.BOOLEAN },
      classification: { type: Type.STRING },
      confidence: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      missingElement: { type: Type.STRING },
    },
    required: ['passed', 'classification', 'confidence', 'feedback'],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    passed: boolean;
    classification: string;
    confidence: number;
    feedback: string;
    missingElement?: string;
  }>(rawJson);

  const classification = normalizeClassification(parsed.classification);
  const confidence = Math.max(15, Math.min(99, Math.round(Number(parsed.confidence) || 70)));

  return {
    passed: Boolean(parsed.passed),
    classification,
    confidence,
    feedback: sanitizeText(parsed.feedback, 500),
    missingElement: parsed.missingElement ? sanitizeText(parsed.missingElement, 250) : undefined,
  };
}

// ============================================================================
// 7. TEACHER INSIGHTS (STRICTLY ANONYMIZED AGGREGATES ONLY)
// ============================================================================

export interface AnonymizedTeacherStatsInput {
  totalStudents: number;
  averageOverallMastery: number;
  averageReasoningScore: number;
  supportNeededCount: number;
  conceptStats: Array<{
    conceptId: string;
    averageMasteryPercent: number;
    belowThresholdCount: number;
    belowThresholdPercent: number;
  }>;
  misconceptionClusters: Array<{
    pattern: string;
    studentCount: number;
    percentOfClass: number;
  }>;
}

export async function generateTeacherInsights(
  stats: AnonymizedTeacherStatsInput,
  runner: GeminiJsonRunner = createDefaultGeminiRunner(),
): Promise<TeacherInsightsResult> {
  // Re-construct strictly anonymized payload so zero PII ever touches the prompt
  const sanitizedStats = {
    totalStudents: Math.max(0, Math.round(Number(stats.totalStudents) || 0)),
    averageOverallMastery: Math.max(0, Math.min(100, Math.round(Number(stats.averageOverallMastery) || 0))),
    averageReasoningScore: Math.max(0, Math.min(100, Math.round(Number(stats.averageReasoningScore) || 0))),
    supportNeededCount: Math.max(0, Math.round(Number(stats.supportNeededCount) || 0)),
    conceptStats: (stats.conceptStats ?? []).slice(0, 12).map((c) => ({
      conceptName: SYLLABUS_TOPICS[c.conceptId]?.name ?? sanitizeText(c.conceptId, 60),
      averageMasteryPercent: Math.round(Number(c.averageMasteryPercent) || 0),
      belowThresholdCount: Math.round(Number(c.belowThresholdCount) || 0),
      belowThresholdPercent: Math.round(Number(c.belowThresholdPercent) || 0),
    })),
    misconceptionClusters: (stats.misconceptionClusters ?? []).slice(0, 8).map((m) => ({
      pattern: sanitizeText(m.pattern, 200),
      studentCount: Math.round(Number(m.studentCount) || 0),
      percentOfClass: Math.round(Number(m.percentOfClass) || 0),
    })),
  };

  const systemInstruction = `You are an instructional analytics advisor for a Class 10 Physics teacher.
Analyze ONLY the anonymized aggregated classroom metrics supplied below. Do not fabricate statistics or reference any individual student identifiers.`;

  const prompt = `Aggregated Anonymized Class Metrics:
${JSON.stringify(sanitizedStats, null, 2)}

Identify:
1. A concise 2-sentence executive summary grounded in the supplied numbers.
2. Most misunderstood concepts & patterns with affected percentages matching the data.
3. Concepts needing immediate classroom reteaching.
4. Specific, actionable 3D lab or classroom interventions.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      misunderstoodConcepts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            conceptName: { type: Type.STRING },
            pattern: { type: Type.STRING },
            affectedPercent: { type: Type.INTEGER },
          },
          required: ['conceptName', 'pattern', 'affectedPercent'],
        },
      },
      conceptsNeedingReteaching: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      recommendedInterventions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            targetConcept: { type: Type.STRING },
            actionStep: { type: Type.STRING },
          },
          required: ['title', 'targetConcept', 'actionStep'],
        },
      },
    },
    required: [
      'summary',
      'misunderstoodConcepts',
      'conceptsNeedingReteaching',
      'recommendedInterventions',
    ],
  };

  const rawJson = await runner({ systemInstruction, prompt, responseSchema });
  const parsed = parseJsonResponse<{
    summary: string;
    misunderstoodConcepts: Array<{
      conceptName: string;
      pattern: string;
      affectedPercent: number;
    }>;
    conceptsNeedingReteaching: string[];
    recommendedInterventions: Array<{
      title: string;
      targetConcept: string;
      actionStep: string;
    }>;
  }>(rawJson);

  return {
    summary: sanitizeText(parsed.summary, 600),
    misunderstoodConcepts: (parsed.misunderstoodConcepts ?? []).slice(0, 5).map((item) => ({
      conceptName: sanitizeText(item.conceptName, 80),
      pattern: sanitizeText(item.pattern, 220),
      affectedPercent: Math.max(0, Math.min(100, Math.round(Number(item.affectedPercent) || 0))),
    })),
    conceptsNeedingReteaching: (parsed.conceptsNeedingReteaching ?? [])
      .slice(0, 5)
      .map((s) => sanitizeText(s, 80)),
    recommendedInterventions: (parsed.recommendedInterventions ?? []).slice(0, 4).map((item) => ({
      title: sanitizeText(item.title, 120),
      targetConcept: sanitizeText(item.targetConcept, 80),
      actionStep: sanitizeText(item.actionStep, 300),
    })),
    generatedAt: new Date().toISOString(),
  };
}
