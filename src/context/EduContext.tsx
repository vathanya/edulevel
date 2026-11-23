import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ISLANDS } from '../data/mockData';
import {
  createInitialOrchestratedState,
  DEFAULT_STUDENT_ID,
} from '../lib/agentContracts';
import {
  runOrchestratorWorkflowSync,
} from '../lib/agentOrchestrator';
import {
  requestConceptExplanation,
  requestCounterfactualChallenge,
  requestEvaluateUnderstanding,
  requestExperimentRecommendation,
  requestReasoningAnalysis,
} from '../services/aiClient';
import {
  dispatchOrchestratorWorkflow,
  fetchOrchestratorState,
  resetOrchestratorState,
} from '../services/orchestratorClient';
import { SYLLABUS_TOPICS } from '../../server/syllabus';
import type {
  AchievementBadge,
  AgentActivityEntry,
  AssessmentHistoryItem,
  ConceptNode,
  ConceptVerificationRecord,
  CounterfactualChallenge,
  CounterfactualResult,
  DifficultyLevel,
  ErrorClassification,
  ExperimentRecommendation,
  ExplainConceptResult,
  ExplanationMode,
  IslandId,
  LabExperimentResult,
  LearningStatus,
  LearningTimelineEvent,
  MisconceptionAnalysis,
  NotificationItem,
  OrchestratedLearnerState,
  OrchestratorWorkflowAction,
  QuestionItem,
  StudentProfile,
  StudentView,
  TeacherIntervention,
  TeacherNotificationItem,
  UserRole,
  VerificationScenario,
} from '../types/edu';
import {
  buildTeacherInsights,
  buildWhyIImprovedInsights,
  computeLearningMetrics,
  type StudentTrackingMetrics,
  type TeacherCohortInsights,
  type VerificationEvaluationResult,
  type WhyIImprovedItem,
} from '../utils/learningEngine';

const STORAGE_KEY = 'edulevel_state_v3';
const ENGINE_MODE_KEY = 'edulevel_engine_mode';

function loadPreferredEngineMode(): 'gemini' | 'deterministic' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.localStorage.getItem(ENGINE_MODE_KEY);
    return val === 'gemini' || val === 'deterministic' ? val : null;
  } catch {
    return null;
  }
}

interface IslandSummary {
  id: IslandId;
  mastery: number;
  status: LearningStatus;
  completedConcepts: number;
  totalConcepts: number;
}

function loadLocalState(): OrchestratedLearnerState {
  const base = createInitialOrchestratedState(DEFAULT_STUDENT_ID);
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<OrchestratedLearnerState>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.concepts)) {
      return base;
    }
    const preferredMode = loadPreferredEngineMode();
    return {
      ...base,
      ...parsed,
      orchestratorMode: preferredMode ?? parsed.orchestratorMode ?? base.orchestratorMode,
      achievements: base.achievements.map((def) => {
        const match = parsed.achievements?.find((s) => s.id === def.id);
        return match ? { ...def, ...match } : def;
      }),
    };
  } catch {
    return base;
  }
}

function buildDeterministicExplanation(payload: {
  conceptId: string;
  mode: ExplanationMode;
  studentDifficulty?: string;
  differentApproach?: boolean;
}): ExplainConceptResult {
  const topic = SYLLABUS_TOPICS[payload.conceptId] ?? SYLLABUS_TOPICS['ohms-law'];
  const core = topic.coreFacts[0] ?? 'Potential difference drives charge through resistance.';
  const second = topic.coreFacts[1] ?? topic.coreFacts[0] ?? '';
  const formula = topic.formulas[0];

  let explanation = core;
  if (payload.mode === 'step-by-step') {
    explanation = `1) Identify the circuit quantities (${topic.formulas.join(', ')}).\n2) ${core}\n3) ${second}`;
  } else if (payload.mode === 'real-world') {
    explanation = payload.differentApproach
      ? `Think of a household ceiling-fan regulator or toaster heating coil: ${core} ${second}`
      : `In everyday electrical devices like lamp dimmers and room heaters, ${core.charAt(0).toLowerCase() + core.slice(1)}`;
  } else if (payload.mode === 'analogy') {
    explanation = payload.differentApproach
      ? `Compare electrons to water pushed by pump pressure (V) through a narrow pebble-filled pipe (R): tighter pebbles oppose flow, reducing current I = V / R.`
      : `Imagine a crowded corridor: battery voltage V is the push forward, resistance R is the narrowness/obstacles slowing movement, and current I is how many charges pass per second.`;
  } else if (payload.differentApproach) {
    explanation = `Another angle on ${topic.name}: ${second} Remember that ${topic.commonMisconceptions[0] ?? core}`;
  } else {
    explanation = `${core} ${second}`;
  }

  return {
    conceptId: topic.id,
    mode: payload.mode,
    explanation,
    keyFormula: formula,
    checkQuestion: `In ${topic.name}, how does changing one variable in ${formula ?? 'the governing law'} affect the outcome?`,
    syllabusGrounded: true,
    differentApproach: Boolean(payload.differentApproach),
  };
}

interface EduContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  studentView: StudentView;
  navigate: (view: StudentView, opts?: { islandId?: IslandId; conceptId?: string }) => void;
  goBack: () => void;
  canGoBack: boolean;
  selectedIslandId: IslandId;
  setSelectedIslandId: (id: IslandId) => void;
  selectedConceptId: string;
  setSelectedConceptId: (id: string) => void;
  profile: StudentProfile;
  updateProfile: (patch: Partial<StudentProfile>) => void;
  concepts: ConceptNode[];
  baselineMastery: Record<string, number>;
  islandSummaries: Record<IslandId, IslandSummary>;
  overallMastery: number;
  weakestConcept: ConceptNode;
  misconceptions: MisconceptionAnalysis[];
  activeMisconception: MisconceptionAnalysis;
  activeExperimentRec: ExperimentRecommendation | null;
  activeCounterfactual: CounterfactualChallenge;
  agentActivity: AgentActivityEntry[];
  orchestratorMode: 'gemini' | 'deterministic';
  setOrchestratorMode: (mode: 'gemini' | 'deterministic') => void;
  analyzeMentorResponse: (question: string, answer: string, conceptId?: string) => MisconceptionAnalysis;
  analyzeMentorResponseAsync: (payload: {
    question: string;
    selectedAnswer?: string;
    explanation?: string;
    rawTranscript?: string;
    conceptId?: string;
    preferGemini?: boolean;
  }) => Promise<MisconceptionAnalysis>;
  explainConceptAsync: (payload: {
    conceptId: string;
    mode: ExplanationMode;
    studentDifficulty?: string;
    differentApproach?: boolean;
    previousExplanation?: string;
    preferGemini?: boolean;
  }) => Promise<ExplainConceptResult>;
  recommendExperimentAsync: (
    conceptId: string,
    detectedMisconception?: string,
    preferGemini?: boolean,
  ) => Promise<ExperimentRecommendation>;
  resolveMisconception: (id: string) => void;
  labResult: LabExperimentResult;
  recordLabObservation: (voltage: number, resistance: number) => void;
  completeLabExperiment: (voltage: number, resistance: number) => void;
  resetLabExperiment: () => void;
  counterfactualResult: CounterfactualResult;
  generateCounterfactualAsync: (
    conceptId: string,
    preferGemini?: boolean,
  ) => Promise<CounterfactualChallenge>;
  submitCounterfactual: (choice: string, explanation: string) => CounterfactualResult;
  submitCounterfactualAsync: (
    choice: string,
    explanation: string,
    preferGemini?: boolean,
  ) => Promise<CounterfactualResult>;
  masteryGateUnlocked: boolean;
  completeMasteryGate: (studentSummary: string) => boolean;
  completeMasteryGateAsync: (
    studentSummary: string,
    preferGemini?: boolean,
  ) => Promise<{ passed: boolean; feedback: string; classification?: string }>;
  history: AssessmentHistoryItem[];
  submitAdaptiveAnswer: (
    question: QuestionItem,
    selectedAnswer: string,
    reasoningText: string,
  ) => {
    isCorrect: boolean;
    classification: ErrorClassification;
    masteryDelta: number;
    feedback: string;
  };
  completeRevisionCheck: (conceptId: string, success: boolean) => void;
  diagnosticCompleted: boolean;
  applyDiagnosticResults: (
    results: Array<{ conceptId: string; correct: boolean; confidence: number; reasoning: string }>,
  ) => void;
  achievements: AchievementBadge[];
  pendingAchievement: AchievementBadge | null;
  dismissAchievementPopup: () => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;
  verificationRecords: Record<string, ConceptVerificationRecord>;
  activeVerificationConceptId: string | null;
  openVerificationModal: (conceptId: string) => void;
  closeVerificationModal: () => void;
  submitVerificationAttempt: (
    conceptId: string,
    scenario: VerificationScenario,
    selectedOption: string,
    reasoning: string,
  ) => VerificationEvaluationResult;
  learningTimeline: LearningTimelineEvent[];
  trackingMetrics: StudentTrackingMetrics;
  whyIImprovedInsights: WhyIImprovedItem[];
  teacherInterventions: TeacherIntervention[];
  toggleInterventionAssigned: (id: string) => void;
  teacherInsights: TeacherCohortInsights;
  teacherNotifications: TeacherNotificationItem[];
  markTeacherNotificationRead: (id: string) => void;
  markAllTeacherNotificationsRead: () => void;
  appliedSuggestionIds: string[];
  toggleSuggestionApplied: (id: string) => void;
  resetDemoProgress: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const EduContext = createContext<EduContextValue | null>(null);

export const EduProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => loadLocalState(), []);

  const [role, setRoleState] = useState<UserRole>(null);
  const [viewHistory, setViewHistory] = useState<StudentView[]>(['world']);
  const [selectedIslandId, setSelectedIslandId] = useState<IslandId>('electricity');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('resistance');

  const [learnerState, setLearnerState] = useState<OrchestratedLearnerState>(initial);
  const stateRef = useRef<OrchestratedLearnerState>(initial);
  const preferredModeRef = useRef<'gemini' | 'deterministic' | null>(
    loadPreferredEngineMode(),
  );
  const [achievementQueue, setAchievementQueue] = useState<AchievementBadge[]>([]);
  const [activeVerificationConceptId, setActiveVerificationConceptId] = useState<string | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  const resolveEffectiveMode = useCallback(
    (serverMode: 'gemini' | 'deterministic'): 'gemini' | 'deterministic' => {
      if (serverMode === 'deterministic') return 'deterministic';
      return preferredModeRef.current ?? serverMode;
    },
    [],
  );

  const commitState = useCallback(
    (nextState: OrchestratedLearnerState) => {
      const prevAchievements = stateRef.current.achievements;
      const newlyUnlocked = nextState.achievements.filter(
        (b) => b.unlocked && !prevAchievements.find((p) => p.id === b.id)?.unlocked,
      );
      stateRef.current = nextState;
      setLearnerState(nextState);
      if (newlyUnlocked.length > 0) {
        setAchievementQueue((q) => [...q, ...newlyUnlocked]);
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch {
          // Ignore storage quota issues
        }
      }
    },
    [],
  );

  const setOrchestratorMode = useCallback(
    (mode: 'gemini' | 'deterministic') => {
      preferredModeRef.current = mode;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(ENGINE_MODE_KEY, mode);
        } catch {
          // Ignore
        }
      }
      commitState({
        ...stateRef.current,
        orchestratorMode: mode,
      });
    },
    [commitState],
  );

  // Hydrate from persistent backend DB on mount
  useEffect(() => {
    let active = true;
    fetchOrchestratorState(DEFAULT_STUDENT_ID)
      .then(({ state, mode }) => {
        if (!active) return;
        const hydrated: OrchestratedLearnerState = {
          ...state,
          orchestratorMode: resolveEffectiveMode(mode),
        };
        stateRef.current = hydrated;
        setLearnerState(hydrated);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Ignore
        }
      })
      .catch(() => {
        // Offline or dev server starting: keep local state
      });
    return () => {
      active = false;
    };
  }, [resolveEffectiveMode]);

  const syncWorkflowToBackend = useCallback(
    (action: OrchestratorWorkflowAction) => {
      dispatchOrchestratorWorkflow(action, stateRef.current.studentId)
        .then((res) => {
          const updated: OrchestratedLearnerState = {
            ...res.state,
            orchestratorMode: resolveEffectiveMode(res.mode),
          };
          // Keep UI in sync with persisted server timestamps/logs without re-triggering popup
          stateRef.current = updated;
          setLearnerState(updated);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // Ignore
            }
          }
        })
        .catch(() => {
          // Local state already committed via runOrchestratorWorkflowSync
        });
    },
    [resolveEffectiveMode],
  );

  const runSyncOrchestration = useCallback(
    (action: OrchestratorWorkflowAction) => {
      const result = runOrchestratorWorkflowSync(stateRef.current, action);
      commitState(result.nextState);
      syncWorkflowToBackend(action);
      return result;
    },
    [commitState, syncWorkflowToBackend],
  );

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === 'student') {
      setViewHistory(['world']);
    }
  };

  const studentView = viewHistory[viewHistory.length - 1] ?? 'world';

  const navigate = (
    view: StudentView,
    opts?: { islandId?: IslandId; conceptId?: string },
  ) => {
    if (opts?.islandId) setSelectedIslandId(opts.islandId);
    if (opts?.conceptId) setSelectedConceptId(opts.conceptId);
    setViewHistory((prev) => {
      if (prev[prev.length - 1] === view) return prev;
      return [...prev.slice(-12), view];
    });
  };

  const goBack = () => {
    setViewHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['world']));
  };

  const dismissAchievementPopup = () => {
    setAchievementQueue((prev) => prev.slice(1));
  };

  const {
    profile,
    concepts,
    baselineMastery,
    misconceptions,
    history,
    achievements,
    notifications,
    teacherInterventions,
    labResult,
    counterfactualResult,
    activeCounterfactual,
    activeExperimentRec,
    masteryGateUnlocked,
    diagnosticCompleted,
    verificationRecords,
    learningTimeline,
    readTeacherNotifIds,
    appliedSuggestionIds,
    agentActivity,
    orchestratorMode,
  } = learnerState;

  const islandSummaries = useMemo(() => {
    const map = {} as Record<IslandId, IslandSummary>;
    for (const island of ISLANDS) {
      const islandConcepts = concepts.filter((c) => island.conceptIds.includes(c.id));
      const mastery = islandConcepts.length
        ? Math.round(
            islandConcepts.reduce((sum, c) => sum + c.mastery, 0) / islandConcepts.length,
          )
        : 0;
      const completedConcepts = islandConcepts.filter((c) => c.mastery >= 75).length;
      const allLocked = islandConcepts.every((c) => c.status === 'locked');
      let status: LearningStatus = 'available';
      if (allLocked) status = 'locked';
      else if (completedConcepts === islandConcepts.length && islandConcepts.length > 0)
        status = 'completed';
      else if (islandConcepts.some((c) => c.status === 'in-progress' || c.mastery > 35))
        status = 'in-progress';

      map[island.id] = {
        id: island.id,
        mastery,
        status,
        completedConcepts,
        totalConcepts: islandConcepts.length,
      };
    }
    return map;
  }, [concepts]);

  const overallMastery = useMemo(() => {
    if (!concepts.length) return 0;
    return Math.round(concepts.reduce((sum, c) => sum + c.mastery, 0) / concepts.length);
  }, [concepts]);

  const weakestConcept = useMemo(() => {
    const unlocked = concepts.filter((c) => c.status !== 'locked');
    const pool = unlocked.length ? unlocked : concepts;
    return [...pool].sort((a, b) => a.mastery - b.mastery)[0];
  }, [concepts]);

  const activeMisconception = useMemo(() => {
    return misconceptions.find((m) => !m.resolved) ?? misconceptions[0];
  }, [misconceptions]);

  const updateProfile = (patch: Partial<StudentProfile>) => {
    runSyncOrchestration({ type: 'profile_update', patch });
  };

  const analyzeMentorResponse = (
    question: string,
    answer: string,
    conceptId = 'resistance',
  ): MisconceptionAnalysis => {
    const res = runSyncOrchestration({
      type: 'mentor_analyze',
      question,
      explanation: answer,
      conceptId,
      preferGemini: false,
    });
    return res.actionResult.record as MisconceptionAnalysis;
  };

  const analyzeMentorResponseAsync = async (payload: {
    question: string;
    selectedAnswer?: string;
    explanation?: string;
    rawTranscript?: string;
    conceptId?: string;
    preferGemini?: boolean;
  }): Promise<MisconceptionAnalysis> => {
    const conceptId = payload.conceptId ?? 'resistance';
    const wantGemini =
      payload.preferGemini === true ||
      (payload.preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      // Strictly call live Gemini route; throws AiApiError(503) if GEMINI_API_KEY is missing
      const aiRes = await requestReasoningAnalysis({
        question: payload.question,
        selectedAnswer: payload.selectedAnswer,
        explanation: payload.explanation,
        rawTranscript: payload.rawTranscript,
        conceptId,
        learningHistory: stateRef.current.history.slice(0, 6).map((h) => ({
          conceptName: h.conceptName,
          classification: h.classification,
          scorePercent: h.scorePercent,
        })),
      });

      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'mentor_analyze',
          question: payload.question,
          explanation: payload.explanation,
          rawTranscript: payload.rawTranscript,
          conceptId,
          preferGemini: true,
        },
        stateRef.current.studentId,
      ).catch(() =>
        runOrchestratorWorkflowSync(stateRef.current, {
          type: 'mentor_analyze',
          question: payload.question,
          explanation: payload.explanation,
          rawTranscript: payload.rawTranscript,
          conceptId,
          preferGemini: false,
        }),
      );

      if ('state' in res) {
        commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
        const record = res.actionResult.record as MisconceptionAnalysis;
        return {
          ...record,
          classification: aiRes.classification,
          possibleMisconception: aiRes.specificMisconception,
          reasoningEvidence: aiRes.reasoningEvidence,
          confidence: aiRes.confidence,
          followUpQuestion: aiRes.followUpQuestion,
          explanation: aiRes.shortExplanation,
          source: 'gemini',
        };
      }
      commitState(res.nextState);
      return res.actionResult.record as MisconceptionAnalysis;
    }

    if (payload.preferGemini === false) {
      setOrchestratorMode('deterministic');
    }

    try {
      const serverRes = await dispatchOrchestratorWorkflow(
        {
          type: 'mentor_analyze',
          question: payload.question,
          explanation: payload.explanation,
          rawTranscript: payload.rawTranscript,
          conceptId,
          preferGemini: false,
        },
        stateRef.current.studentId,
      );
      commitState({ ...serverRes.state, orchestratorMode: resolveEffectiveMode(serverRes.mode) });
      return serverRes.actionResult.record as MisconceptionAnalysis;
    } catch {
      const localRes = runOrchestratorWorkflowSync(stateRef.current, {
        type: 'mentor_analyze',
        question: payload.question,
        explanation: payload.explanation,
        rawTranscript: payload.rawTranscript,
        conceptId,
        preferGemini: false,
      });
      commitState(localRes.nextState);
      return localRes.actionResult.record as MisconceptionAnalysis;
    }
  };

  const explainConceptAsync = async (payload: {
    conceptId: string;
    mode: ExplanationMode;
    studentDifficulty?: string;
    differentApproach?: boolean;
    previousExplanation?: string;
    preferGemini?: boolean;
  }): Promise<ExplainConceptResult> => {
    const wantGemini =
      payload.preferGemini === true ||
      (payload.preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      return requestConceptExplanation(payload);
    }
    if (payload.preferGemini === false) {
      setOrchestratorMode('deterministic');
    }
    return buildDeterministicExplanation(payload);
  };

  const recommendExperimentAsync = async (
    conceptId: string,
    detectedMisconception?: string,
    preferGemini?: boolean,
  ): Promise<ExperimentRecommendation> => {
    const wantGemini =
      preferGemini === true ||
      (preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      const concept = stateRef.current.concepts.find((c) => c.id === conceptId);
      const rec = await requestExperimentRecommendation({
        conceptId,
        detectedMisconception,
        masteryLevel: concept?.mastery ?? 45,
      });
      commitState({ ...stateRef.current, activeExperimentRec: rec });
      return rec;
    }

    if (preferGemini === false) {
      setOrchestratorMode('deterministic');
    }

    try {
      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'recommend_experiment',
          conceptId,
          detectedMisconception,
          preferGemini: false,
        },
        stateRef.current.studentId,
      );
      commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
      return res.actionResult.recommendation as ExperimentRecommendation;
    } catch {
      const localRes = runOrchestratorWorkflowSync(stateRef.current, {
        type: 'recommend_experiment',
        conceptId,
        detectedMisconception,
        preferGemini: false,
      });
      commitState(localRes.nextState);
      return localRes.actionResult.recommendation as ExperimentRecommendation;
    }
  };

  const resolveMisconception = (id: string) => {
    runSyncOrchestration({ type: 'misconception_resolve', id });
  };

  const recordLabObservation = (voltage: number, resistance: number) => {
    runSyncOrchestration({ type: 'lab_observe', voltage, resistance });
  };

  const completeLabExperiment = (voltage: number, resistance: number) => {
    runSyncOrchestration({ type: 'lab_complete', voltage, resistance });
    showToast('3D Ohm’s Law experiment recorded (+90 XP)');
  };

  const resetLabExperiment = () => {
    runSyncOrchestration({ type: 'lab_reset' });
  };

  const generateCounterfactualAsync = async (
    conceptId: string,
    preferGemini?: boolean,
  ): Promise<CounterfactualChallenge> => {
    const wantGemini =
      preferGemini === true ||
      (preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      const challenge = await requestCounterfactualChallenge({
        conceptId,
        lastExperimentSummary: `Measured V=${stateRef.current.labResult.voltage} V, R=${stateRef.current.labResult.resistance} Ω`,
        voltage: stateRef.current.labResult.voltage,
        resistance: stateRef.current.labResult.resistance,
      });
      commitState({
        ...stateRef.current,
        activeCounterfactual: challenge,
      });
      return challenge;
    }

    if (preferGemini === false) {
      setOrchestratorMode('deterministic');
    }

    try {
      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'counterfactual_generate',
          conceptId,
          preferGemini: false,
        },
        stateRef.current.studentId,
      );
      commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
      return res.actionResult.challenge as CounterfactualChallenge;
    } catch {
      const localRes = runOrchestratorWorkflowSync(stateRef.current, {
        type: 'counterfactual_generate',
        conceptId,
        preferGemini: false,
      });
      commitState(localRes.nextState);
      return localRes.actionResult.challenge as CounterfactualChallenge;
    }
  };

  const submitCounterfactual = (
    choice: string,
    explanation: string,
  ): CounterfactualResult => {
    const res = runSyncOrchestration({
      type: 'counterfactual_submit',
      choice,
      explanation,
      preferGemini: false,
    });
    return res.actionResult.result as CounterfactualResult;
  };

  const submitCounterfactualAsync = async (
    choice: string,
    explanation: string,
    preferGemini?: boolean,
  ): Promise<CounterfactualResult> => {
    const wantGemini =
      preferGemini === true ||
      (preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      const activeCf = stateRef.current.activeCounterfactual;
      const aiEval = await requestEvaluateUnderstanding({
        contextType: 'counterfactual',
        conceptId: activeCf.targetConceptId,
        scenarioOrPrompt: activeCf.scenario,
        selectedChoice: choice,
        expectedChoice: activeCf.expectedChoice,
        evaluationCriteria: activeCf.evaluationCriteria,
        studentExplanation: explanation,
      });
      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'counterfactual_submit',
          choice,
          explanation,
          preferGemini: true,
        },
        stateRef.current.studentId,
      ).catch(() =>
        runOrchestratorWorkflowSync(stateRef.current, {
          type: 'counterfactual_submit',
          choice,
          explanation,
          preferGemini: false,
        }),
      );
      if ('state' in res) {
        commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
        return {
          ...(res.actionResult.result as CounterfactualResult),
          passed: aiEval.passed,
          classification: aiEval.classification,
          feedback: aiEval.feedback,
        };
      }
      commitState(res.nextState);
      return res.actionResult.result as CounterfactualResult;
    }

    if (preferGemini === false) {
      setOrchestratorMode('deterministic');
    }

    try {
      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'counterfactual_submit',
          choice,
          explanation,
          preferGemini: false,
        },
        stateRef.current.studentId,
      );
      commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
      return res.actionResult.result as CounterfactualResult;
    } catch {
      return submitCounterfactual(choice, explanation);
    }
  };

  const completeMasteryGate = (studentSummary: string): boolean => {
    if (studentSummary.trim().length < 20) {
      showToast('Write at least a brief causal explanation of V, I, and R to pass the gate.');
      return false;
    }
    const res = runSyncOrchestration({
      type: 'mastery_gate_submit',
      studentSummary,
      preferGemini: false,
    });
    const passed = Boolean(res.actionResult.passed);
    if (passed) {
      showToast('Series & Parallel Circuits unlocked!');
    }
    return passed;
  };

  const completeMasteryGateAsync = async (
    studentSummary: string,
    preferGemini?: boolean,
  ): Promise<{ passed: boolean; feedback: string; classification?: string }> => {
    const wantGemini =
      preferGemini === true ||
      (preferGemini === undefined && stateRef.current.orchestratorMode === 'gemini');

    if (wantGemini) {
      const aiEval = await requestEvaluateUnderstanding({
        contextType: 'mastery-gate',
        conceptId: 'ohms-law',
        scenarioOrPrompt: 'Explain how V, R, and I relate in a conductor.',
        evaluationCriteria:
          'Must describe direct proportionality V ∝ I and inverse proportionality with resistance R.',
        studentExplanation: studentSummary,
      });
      if (aiEval.passed) {
        const res = await dispatchOrchestratorWorkflow(
          {
            type: 'mastery_gate_submit',
            studentSummary,
            preferGemini: true,
          },
          stateRef.current.studentId,
        ).catch(() =>
          runOrchestratorWorkflowSync(stateRef.current, {
            type: 'mastery_gate_submit',
            studentSummary,
            preferGemini: false,
          }),
        );
        if ('state' in res) {
          commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
        } else {
          commitState(res.nextState);
        }
        showToast('Series & Parallel Circuits unlocked!');
      }
      return {
        passed: aiEval.passed,
        feedback: aiEval.feedback,
        classification: aiEval.classification,
      };
    }

    if (preferGemini === false) {
      setOrchestratorMode('deterministic');
    }

    try {
      const res = await dispatchOrchestratorWorkflow(
        {
          type: 'mastery_gate_submit',
          studentSummary,
          preferGemini: false,
        },
        stateRef.current.studentId,
      );
      commitState({ ...res.state, orchestratorMode: resolveEffectiveMode(res.mode) });
      const passed = Boolean(res.actionResult.passed);
      if (passed) showToast('Series & Parallel Circuits unlocked!');
      return {
        passed,
        feedback: String(res.actionResult.feedback ?? ''),
        classification: String(res.actionResult.classification ?? ''),
      };
    } catch {
      const res = runSyncOrchestration({
        type: 'mastery_gate_submit',
        studentSummary,
        preferGemini: false,
      });
      const passed = Boolean(res.actionResult.passed);
      if (passed) showToast('Series & Parallel Circuits unlocked!');
      return {
        passed,
        feedback: String(res.actionResult.feedback ?? ''),
        classification: String(res.actionResult.classification ?? ''),
      };
    }
  };

  const submitAdaptiveAnswer = (
    question: QuestionItem,
    selectedAnswer: string,
    reasoningText: string,
  ) => {
    const res = runSyncOrchestration({
      type: 'adaptive_submit',
      question,
      selectedAnswer,
      reasoningText,
    });
    return {
      isCorrect: Boolean(res.actionResult.isCorrect),
      classification: res.actionResult.classification as ErrorClassification,
      masteryDelta: Number(res.actionResult.masteryDelta ?? 0),
      feedback: String(res.actionResult.feedback ?? ''),
    };
  };

  const completeRevisionCheck = (conceptId: string, success: boolean) => {
    runSyncOrchestration({ type: 'revision_check', conceptId, success });
    showToast(success ? 'Revision verified (+45 XP)' : 'Scheduled for tomorrow');
  };

  const applyDiagnosticResults = (
    results: Array<{
      conceptId: string;
      correct: boolean;
      confidence: number;
      reasoning: string;
    }>,
  ) => {
    runSyncOrchestration({ type: 'diagnostic_submit', results });
    showToast('Diagnostic complete (+100 XP)');
  };

  const openVerificationModal = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setActiveVerificationConceptId(conceptId);
  };

  const closeVerificationModal = () => {
    setActiveVerificationConceptId(null);
  };

  const submitVerificationAttempt = (
    conceptId: string,
    scenario: VerificationScenario,
    selectedOption: string,
    reasoning: string,
  ): VerificationEvaluationResult => {
    const res = runSyncOrchestration({
      type: 'verification_submit',
      conceptId,
      scenario,
      selectedOption,
      reasoning,
    });
    const evalResult = res.actionResult.evalResult as VerificationEvaluationResult;
    if (
      evalResult.passed &&
      (evalResult.statusAfter === 'Understanding Verified' ||
        evalResult.statusAfter === 'Mastery Achieved')
    ) {
      showToast(`${scenario.conceptName}: ${evalResult.statusAfter} (+110 XP)`);
    } else if (evalResult.passed) {
      showToast('1st situation passed (+45 XP) — complete 1 more to verify');
    }
    return evalResult;
  };

  const markNotificationRead = (id: string) => {
    const next: OrchestratedLearnerState = {
      ...stateRef.current,
      notifications: stateRef.current.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    };
    commitState(next);
  };

  const markAllNotificationsRead = () => {
    const next: OrchestratedLearnerState = {
      ...stateRef.current,
      notifications: stateRef.current.notifications.map((n) => ({ ...n, read: true })),
    };
    commitState(next);
  };

  const clearReadNotifications = () => {
    const next: OrchestratedLearnerState = {
      ...stateRef.current,
      notifications: stateRef.current.notifications.filter((n) => !n.read),
    };
    commitState(next);
  };

  const toggleInterventionAssigned = (id: string) => {
    const target = stateRef.current.teacherInterventions.find((item) => item.id === id);
    const nextAssigned = target ? !target.assigned : true;
    runSyncOrchestration({ type: 'teacher_toggle_intervention', id });
    if (target) {
      showToast(
        nextAssigned
          ? `Intervention assigned to ${target.targetCount} students.`
          : 'Intervention assignment removed.',
      );
    }
  };

  const trackingMetrics = useMemo(
    () =>
      computeLearningMetrics({
        concepts,
        baselineMastery,
        history,
        timeline: learningTimeline,
        verificationRecords,
        streakDays: profile.streak,
      }),
    [concepts, baselineMastery, history, learningTimeline, verificationRecords, profile.streak],
  );

  const whyIImprovedInsights = useMemo(
    () =>
      buildWhyIImprovedInsights({
        concepts,
        baselineMastery,
        misconceptions,
        verificationRecords,
        timeline: learningTimeline,
      }),
    [concepts, baselineMastery, misconceptions, verificationRecords, learningTimeline],
  );

  const teacherInsights = useMemo(
    () =>
      buildTeacherInsights({
        liveStudentName: profile.name,
        liveConcepts: concepts,
        liveVerificationRecords: verificationRecords,
        liveStreak: profile.streak,
        liveBaseline: baselineMastery,
      }),
    [profile.name, concepts, verificationRecords, profile.streak, baselineMastery],
  );

  const teacherNotifications = useMemo(
    () =>
      teacherInsights.defaultNotifications.map((n) => ({
        ...n,
        read: n.read || readTeacherNotifIds.includes(n.id),
      })),
    [teacherInsights.defaultNotifications, readTeacherNotifIds],
  );

  const markTeacherNotificationRead = (id: string) => {
    if (stateRef.current.readTeacherNotifIds.includes(id)) return;
    commitState({
      ...stateRef.current,
      readTeacherNotifIds: [...stateRef.current.readTeacherNotifIds, id],
    });
  };

  const markAllTeacherNotificationsRead = () => {
    commitState({
      ...stateRef.current,
      readTeacherNotifIds: teacherInsights.defaultNotifications.map((n) => n.id),
    });
  };

  const toggleSuggestionApplied = (id: string) => {
    const exists = stateRef.current.appliedSuggestionIds.includes(id);
    runSyncOrchestration({ type: 'teacher_toggle_suggestion', id });
    showToast(
      exists
        ? 'Teaching suggestion unmarked.'
        : 'AI teaching suggestion queued for next class.',
    );
  };

  const resetDemoProgress = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    const fresh = createInitialOrchestratedState(DEFAULT_STUDENT_ID);
    fresh.orchestratorMode = stateRef.current.orchestratorMode;
    stateRef.current = fresh;
    setLearnerState(fresh);
    setAchievementQueue([]);
    resetOrchestratorState(DEFAULT_STUDENT_ID).catch(() => {
      // Ignore if offline
    });
    showToast('Progress reset to initial baseline.');
  };

  return (
    <EduContext.Provider
      value={{
        role,
        setRole,
        studentView,
        navigate,
        goBack,
        canGoBack: viewHistory.length > 1,
        selectedIslandId,
        setSelectedIslandId,
        selectedConceptId,
        setSelectedConceptId,
        profile,
        updateProfile,
        concepts,
        baselineMastery,
        islandSummaries,
        overallMastery,
        weakestConcept,
        misconceptions,
        activeMisconception,
        activeExperimentRec,
        activeCounterfactual,
        agentActivity,
        orchestratorMode,
        setOrchestratorMode,
        analyzeMentorResponse,
        analyzeMentorResponseAsync,
        explainConceptAsync,
        recommendExperimentAsync,
        resolveMisconception,
        labResult,
        recordLabObservation,
        completeLabExperiment,
        resetLabExperiment,
        counterfactualResult,
        generateCounterfactualAsync,
        submitCounterfactual,
        submitCounterfactualAsync,
        masteryGateUnlocked,
        completeMasteryGate,
        completeMasteryGateAsync,
        history,
        submitAdaptiveAnswer,
        completeRevisionCheck,
        diagnosticCompleted,
        applyDiagnosticResults,
        achievements,
        pendingAchievement: achievementQueue[0] ?? null,
        dismissAchievementPopup,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        clearReadNotifications,
        verificationRecords,
        activeVerificationConceptId,
        openVerificationModal,
        closeVerificationModal,
        submitVerificationAttempt,
        learningTimeline,
        trackingMetrics,
        whyIImprovedInsights,
        teacherInterventions,
        toggleInterventionAssigned,
        teacherInsights,
        teacherNotifications,
        markTeacherNotificationRead,
        markAllTeacherNotificationsRead,
        appliedSuggestionIds,
        toggleSuggestionApplied,
        resetDemoProgress,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </EduContext.Provider>
  );
};

export const useEdu = (): EduContextValue => {
  const ctx = useContext(EduContext);
  if (!ctx) throw new Error('useEdu must be used inside EduProvider');
  return ctx;
};

export const getDifficultyRecommendation = (mastery: number): DifficultyLevel => {
  if (mastery < 45) return 'Beginner';
  if (mastery < 75) return 'Intermediate';
  return 'Advanced';
};
