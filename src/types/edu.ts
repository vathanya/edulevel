export type UserRole = 'student' | 'teacher' | null;

export type StudentView =
  | 'world'
  | 'island-detail'
  | 'lab'
  | 'mentor'
  | 'counterfactual'
  | 'mastery-gate'
  | 'progress'
  | 'questions'
  | 'revision'
  | 'rewards'
  | 'profile'
  | 'diagnostic';

export type IslandId =
  | 'electricity'
  | 'light'
  | 'magnetism'
  | 'human-eye'
  | 'challenge-arena';

export type LearningStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type QuestionType = 'mcq' | 'numerical' | 'reasoning';

export type CanonicalErrorClassification =
  | 'Correct conceptual understanding'
  | 'Conceptual misconception'
  | 'Calculation or arithmetic error'
  | 'Incomplete reasoning'
  | 'Insufficient evidence';

export type ErrorClassification =
  | CanonicalErrorClassification
  | 'Incorrect Concept'
  | 'Arithmetic Mistake'
  | 'Insufficient Evidence'
  | 'Sound Understanding';

export type ExperimentId =
  | 'ohms-law-bench'
  | 'resistance-rheostat'
  | 'series-parallel-explorer'
  | 'optics-prism-lab'
  | 'solenoid-field-lab';

export type ExplanationMode = 'simple' | 'step-by-step' | 'real-world' | 'analogy';

export interface VoiceTranscript {
  originalTranscript: string;
  cleanedTranscript: string;
  hadFillers: boolean;
}

export interface ExplainConceptResult {
  conceptId: string;
  mode: ExplanationMode;
  explanation: string;
  keyFormula?: string;
  checkQuestion: string;
  syllabusGrounded: boolean;
  differentApproach: boolean;
  source?: 'gemini' | 'orchestrator';
}

export interface ExperimentRecommendation {
  experimentId: ExperimentId;
  title: string;
  targetConceptId: string;
  learningObjective: string;
  variablesToManipulate: string[];
  expectedObservation: string;
  followUpQuestion: string;
}

export interface CounterfactualChallenge {
  id: string;
  basedOnExperiment: string;
  targetConceptId: string;
  scenario: string;
  changedCondition: string;
  choices: string[];
  expectedChoice: string;
  evaluationCriteria: string;
  source?: 'gemini' | 'seed' | 'orchestrator';
}

export interface TeacherInsightsResult {
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
  generatedAt: string;
}

export type RevisionUrgency = 'overdue' | 'due-today' | 'upcoming' | 'stable';

export interface IslandInfo {
  id: IslandId;
  name: string;
  subtitle: string;
  chapterTag: string;
  description: string;
  unlockRequirement: string;
  accentHex: string;
  conceptIds: string[];
}

export interface ConceptNode {
  id: string;
  islandId: IslandId;
  name: string;
  shortDesc: string;
  formula?: string;
  mastery: number;
  confidence: number;
  retention: number;
  status: LearningStatus;
  prerequisites: string[];
  activities: {
    id: string;
    title: string;
    type: 'library' | 'lab' | 'practice' | 'gate';
    completed: boolean;
  }[];
  lastPracticedLabel: string;
  nextRevisionDate: string;
  revisionUrgency: RevisionUrgency;
  keyTakeaway: string;
  librarySummary: string[];
}

export interface QuestionItem {
  id: string;
  conceptId: string;
  conceptName: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  misconceptionOptions?: string[];
  arithmeticOptions?: string[];
  numericValue?: number;
  unit?: string;
  explanation: string;
  expectedReasoning?: string;
  conceptTags?: string[];
  arithmeticHint?: string;
  conceptTrap?: string;
  source?: 'seed' | 'gemini' | 'orchestrator';
  physicsVerified?: boolean;
}

export interface MisconceptionAnalysis {
  id: string;
  timestamp: string;
  question: string;
  studentAnswer: string;
  detectedConcept: string;
  targetConceptId: string;
  classification: ErrorClassification;
  possibleMisconception: string;
  reasoningEvidence: string;
  confidence: number;
  recommendedAction: string;
  recommendedView: StudentView;
  followUpQuestion: string;
  explanation: string;
  resolved: boolean;
  source?: 'gemini' | 'mock' | 'orchestrator';
  originalTranscript?: string;
  cleanedTranscript?: string;
}

export interface AssessmentHistoryItem {
  id: string;
  title: string;
  conceptId: string;
  conceptName: string;
  dateLabel: string;
  scorePercent: number;
  reasoningQuality: 'Strong' | 'Developing' | 'Needs Review';
  classification: ErrorClassification;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  criteria: string;
  xpBonus: number;
  unlocked: boolean;
  unlockedAt?: string;
  unlockReason?: string;
  category: 'Conceptual' | 'Laboratory' | 'Transfer' | 'Consistency';
}

export interface DiagnosticQuestion {
  id: string;
  conceptId: string;
  conceptName: string;
  prompt: string;
  options: string[];
  correctOption: string;
  explanation: string;
}

export interface TeacherStudentRecord {
  id: string;
  name: string;
  rollNo: string;
  overallMastery: number;
  reasoningScore: number;
  streakDays: number;
  supportNeeded: boolean;
  primaryMisconception: string;
  conceptMastery: Record<string, number>;
  lastActive: string;
}

export interface TeacherIntervention {
  id: string;
  conceptId: string;
  conceptName: string;
  title: string;
  description: string;
  targetCount: number;
  assigned: boolean;
}

export interface LabExperimentResult {
  voltage: number;
  resistance: number;
  current: number;
  power: number;
  observationsCount: number;
  completed: boolean;
}

export interface CounterfactualResult {
  completed: boolean;
  passed: boolean;
  selectedChoice: string;
  explanation: string;
  feedback: string;
  classification?: ErrorClassification;
}

export type NotificationCategory =
  | 'achievement'
  | 'mastery'
  | 'verification'
  | 'revision'
  | 'challenge'
  | 'unlock'
  | 'weak-concept'
  | 'streak';

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  read: boolean;
  targetView: StudentView;
  category?: NotificationCategory;
  conceptId?: string;
}

export type VerificationStatus =
  | 'Learning in Progress'
  | 'Needs More Practice'
  | 'Understanding Verified'
  | 'Mastery Achieved';

export type VerificationIssueType =
  | 'genuine'
  | 'guessing'
  | 'memorization'
  | 'incomplete'
  | 'misconception';

export interface VerificationScenario {
  id: string;
  conceptId: string;
  conceptName: string;
  situationTitle: string;
  prompt: string;
  options: string[];
  correctOption: string;
  causalKeywords: string[];
  roteTraps: string[];
  expectedMechanism: string;
  recommendedFollowUpLabel: string;
  recommendedFollowUpView: StudentView;
}

export interface VerificationAttemptEntry {
  id: string;
  scenarioId: string;
  situationTitle: string;
  selectedOption: string;
  reasoning: string;
  passed: boolean;
  issueType: VerificationIssueType;
  statusAfter: VerificationStatus;
  feedback: string;
  timestamp: string;
}

export interface ConceptVerificationRecord {
  conceptId: string;
  status: VerificationStatus;
  attemptsCount: number;
  verifiedChecksCount: number;
  completedScenarioIds: string[];
  lastIssueType?: VerificationIssueType;
  lastFeedback?: string;
  recommendedAction?: string;
  recommendedView?: StudentView;
  lastEvaluatedAt?: string;
  verifiedExplainSummary?: string;
  history: VerificationAttemptEntry[];
}

export interface LearningTimelineEvent {
  id: string;
  conceptId: string;
  conceptName: string;
  eventType:
    | 'diagnostic'
    | 'mentor'
    | 'lab'
    | 'counterfactual'
    | 'practice'
    | 'verification'
    | 'revision'
    | 'mastery-gate';
  title: string;
  summary: string;
  masteryBefore: number;
  masteryAfter: number;
  misconceptionAddressed?: string;
  timestamp: string;
}

export interface TeacherNotificationItem {
  id: string;
  severity: 'alert' | 'improvement' | 'verification' | 'attention';
  title: string;
  detail: string;
  conceptId?: string;
  studentName?: string;
  timeLabel: string;
  read: boolean;
}

export interface TeacherTeachingSuggestion {
  id: string;
  conceptId: string;
  conceptName: string;
  affectedCount: number;
  insight: string;
  suggestedAction: string;
}

export type AgentId =
  | 'diagnostic'
  | 'learner-model'
  | 'reasoning'
  | 'adaptive'
  | 'revision-insights';

export type AgentActivityStatus = 'completed' | 'active' | 'attention';

export interface AgentActivityEntry {
  id: string;
  agentId: AgentId;
  agentName: string;
  stepNumber: number;
  status: AgentActivityStatus;
  message: string;
  conceptId?: string;
  timestamp: string;
  isoTimestamp: string;
  source: 'gemini' | 'deterministic';
}

export interface StudentProfile {
  name: string;
  grade: string;
  level: number;
  xp: number;
  streak: number;
  dailyGoalMinutes: number;
  soundEffects: boolean;
  adaptiveHints: boolean;
}

export interface ScopedAgentContext {
  studentId: string;
  conceptId: string;
  currentMastery: number;
  previousAttempts: Array<{
    title: string;
    classification: string;
    scorePercent: number;
  }>;
  answer?: string;
  reasoning?: string;
  misconceptionEvidence?: string;
  recommendedActivity?: string;
  verificationStatus?: VerificationStatus;
}

export interface OrchestratedLearnerState {
  studentId: string;
  profile: StudentProfile;
  concepts: ConceptNode[];
  baselineMastery: Record<string, number>;
  misconceptions: MisconceptionAnalysis[];
  history: AssessmentHistoryItem[];
  achievements: AchievementBadge[];
  notifications: NotificationItem[];
  teacherInterventions: TeacherIntervention[];
  labResult: LabExperimentResult;
  counterfactualResult: CounterfactualResult;
  activeCounterfactual: CounterfactualChallenge;
  activeExperimentRec: ExperimentRecommendation | null;
  masteryGateUnlocked: boolean;
  diagnosticCompleted: boolean;
  verificationRecords: Record<string, ConceptVerificationRecord>;
  learningTimeline: LearningTimelineEvent[];
  readTeacherNotifIds: string[];
  appliedSuggestionIds: string[];
  agentActivity: AgentActivityEntry[];
  orchestratorMode: 'gemini' | 'deterministic';
  updatedAt: string;
}

export type OrchestratorWorkflowAction =
  | {
      type: 'diagnostic_submit';
      results: Array<{
        conceptId: string;
        correct: boolean;
        confidence: number;
        reasoning: string;
      }>;
    }
  | {
      type: 'adaptive_submit';
      question: QuestionItem;
      selectedAnswer: string;
      reasoningText: string;
    }
  | {
      type: 'mentor_analyze';
      question: string;
      explanation?: string;
      rawTranscript?: string;
      conceptId: string;
      preferGemini?: boolean;
    }
  | {
      type: 'recommend_experiment';
      conceptId: string;
      detectedMisconception?: string;
      preferGemini?: boolean;
    }
  | {
      type: 'lab_observe';
      voltage: number;
      resistance: number;
    }
  | {
      type: 'lab_complete';
      voltage: number;
      resistance: number;
    }
  | {
      type: 'lab_reset';
    }
  | {
      type: 'counterfactual_generate';
      conceptId: string;
      preferGemini?: boolean;
    }
  | {
      type: 'counterfactual_submit';
      choice: string;
      explanation: string;
      preferGemini?: boolean;
    }
  | {
      type: 'mastery_gate_submit';
      studentSummary: string;
      preferGemini?: boolean;
    }
  | {
      type: 'verification_submit';
      conceptId: string;
      scenario: VerificationScenario;
      selectedOption: string;
      reasoning: string;
    }
  | {
      type: 'revision_check';
      conceptId: string;
      success: boolean;
    }
  | {
      type: 'teacher_toggle_intervention';
      id: string;
    }
  | {
      type: 'teacher_toggle_suggestion';
      id: string;
    }
  | {
      type: 'profile_update';
      patch: Partial<StudentProfile>;
    }
  | {
      type: 'misconception_resolve';
      id: string;
    };


