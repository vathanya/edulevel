import type {
  AchievementBadge,
  AssessmentHistoryItem,
  ConceptNode,
  ConceptVerificationRecord,
  DiagnosticQuestion,
  IslandInfo,
  LearningTimelineEvent,
  MisconceptionAnalysis,
  NotificationItem,
  QuestionItem,
  TeacherIntervention,
  TeacherStudentRecord,
  VerificationScenario,
} from '../types/edu';

function resolvePublicAsset(filename: string): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  const base = typeof env?.BASE_URL === 'string' && env.BASE_URL.length > 0 ? env.BASE_URL : '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}assets/images/${filename}`;
}

export const ASSETS = {
  worldBackdrop: resolvePublicAsset('world_ocean_backdrop_1795257088133.jpg'),
  studentAvatar: resolvePublicAsset('student_avatar_explorer_1795257090020.jpg'),
  mentorAvatar: resolvePublicAsset('mentor_avatar_physics_1795257089064.jpg'),
  teacherAvatar: resolvePublicAsset('teacher_avatar_educator_1795257089187.jpg'),
};

export const ISLANDS: IslandInfo[] = [
  {
    id: 'electricity',
    name: 'Electricity Island',
    subtitle: 'Current, Potential, Resistance & Ohm’s Law',
    chapterTag: 'Class 10 · Chapter 11',
    description:
      'Master charge flow, potential difference, electrical resistance, Ohm’s Law circuits, and series-parallel networks through hands-on 3D lab testing.',
    unlockRequirement: 'Unlocked from start',
    accentHex: '#38BDF8',
    conceptIds: [
      'electric-current',
      'potential-difference',
      'resistance',
      'ohms-law',
      'series-parallel',
    ],
  },
  {
    id: 'light',
    name: 'Light Island',
    subtitle: 'Reflection, Refraction & Spherical Lenses',
    chapterTag: 'Class 10 · Chapter 9',
    description:
      'Explore concave and convex mirrors, Snell’s Law of refraction, optical density, and ray diagrams across crystal prism towers.',
    unlockRequirement: 'Unlocked from start',
    accentHex: '#F59E0B',
    conceptIds: ['reflection-mirrors', 'refraction-lenses'],
  },
  {
    id: 'magnetism',
    name: 'Magnetism Island',
    subtitle: 'Magnetic Fields, Solenoids & Right-Hand Rule',
    chapterTag: 'Class 10 · Chapter 12',
    description:
      'Investigate magnetic field lines around current-carrying conductors, electromagnets, Fleming’s Left-Hand Rule, and domestic circuits.',
    unlockRequirement: 'Available · Recommended after Ohm’s Law',
    accentHex: '#A78BFA',
    conceptIds: ['magnetic-fields', 'electromagnetism'],
  },
  {
    id: 'human-eye',
    name: 'Human Eye Island',
    subtitle: 'Accommodation, Vision Defects & Prism Dispersion',
    chapterTag: 'Class 10 · Chapter 10',
    description:
      'Study ciliary accommodation, myopia and hypermetropia corrections, atmospheric refraction, and Tyndall scattering.',
    unlockRequirement: 'Unlocks at 65% Magnetism mastery or via Diagnostic Assessment',
    accentHex: '#34D399',
    conceptIds: ['vision-defects', 'dispersion-scattering'],
  },
  {
    id: 'challenge-arena',
    name: 'Challenge Arena',
    subtitle: 'Transfer Trials, Counterfactuals & Boss Gates',
    chapterTag: 'Adaptive Mastery Trials',
    description:
      'Test genuine conceptual transfer under new conditions, resolve tricky physics misconceptions, and earn Mastery Gate seals.',
    unlockRequirement: 'Always open for active practice',
    accentHex: '#FB7185',
    conceptIds: ['ohms-law', 'resistance', 'series-parallel'],
  },
];

export const INITIAL_CONCEPTS: ConceptNode[] = [
  {
    id: 'electric-current',
    islandId: 'electricity',
    name: 'Electric Current',
    shortDesc: 'Rate of flow of electric charge through a conductor cross-section.',
    formula: 'I = Q / t',
    mastery: 86,
    confidence: 88,
    retention: 84,
    status: 'completed',
    prerequisites: [],
    activities: [
      { id: 'ec-lib', title: 'Charge Carrier Visual Guide', type: 'library', completed: true },
      { id: 'ec-lab', title: 'Ammeter Reading Check', type: 'lab', completed: true },
      { id: 'ec-prac', title: 'Current & Charge Numericals', type: 'practice', completed: true },
      { id: 'ec-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: true },
    ],
    lastPracticedLabel: '2 days ago',
    nextRevisionDate: 'Nov 24',
    revisionUrgency: 'upcoming',
    keyTakeaway: '1 Ampere means 1 Coulomb of charge passes a point every second.',
    librarySummary: [
      'Electric current (I) is defined as the rate of flow of electric charge (Q) per unit time (t): I = Q / t.',
      'Conventional current direction is taken opposite to the flow of negatively charged electrons, from positive to negative terminal.',
      'Measured in Amperes (A) using an Ammeter connected strictly in series with the circuit.',
    ],
  },
  {
    id: 'potential-difference',
    islandId: 'electricity',
    name: 'Potential Difference',
    shortDesc: 'Work done per unit charge to move a positive charge between two points.',
    formula: 'V = W / Q',
    mastery: 78,
    confidence: 80,
    retention: 74,
    status: 'completed',
    prerequisites: ['Electric Current'],
    activities: [
      { id: 'pd-lib', title: 'Electric Pressure Analogy', type: 'library', completed: true },
      { id: 'pd-lab', title: 'Voltmeter Parallel Probe', type: 'lab', completed: true },
      { id: 'pd-prac', title: 'Work & Voltage Problems', type: 'practice', completed: true },
      { id: 'pd-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: true },
    ],
    lastPracticedLabel: '4 days ago',
    nextRevisionDate: 'Today',
    revisionUrgency: 'due-today',
    keyTakeaway: '1 Volt equals 1 Joule of work done in moving 1 Coulomb of charge.',
    librarySummary: [
      'Potential difference (V) drives charges through a conductor, analogous to pressure difference driving water through a pipe.',
      'Formula: V = W / Q, where W is work done in Joules and Q is charge in Coulombs.',
      'Measured in Volts (V) using a high-resistance Voltmeter connected in parallel across the component.',
    ],
  },
  {
    id: 'resistance',
    islandId: 'electricity',
    name: 'Resistance',
    shortDesc: 'Opposition offered by a conductor to the flow of electric charges.',
    formula: 'R = ρ · (L / A)',
    mastery: 38,
    confidence: 45,
    retention: 42,
    status: 'in-progress',
    prerequisites: ['Electric Current', 'Potential Difference'],
    activities: [
      { id: 'res-lib', title: 'Lattice Collision Model', type: 'library', completed: true },
      { id: 'res-lab', title: '3D Rheostat & Current Lab', type: 'lab', completed: false },
      { id: 'res-prac', title: 'Inverse Relationship Drills', type: 'practice', completed: false },
      { id: 'res-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: '6 days ago',
    nextRevisionDate: 'Overdue (1 day)',
    revisionUrgency: 'overdue',
    keyTakeaway: 'Higher resistance impedes charge flow, reducing current when voltage stays constant.',
    librarySummary: [
      'Resistance (R) arises from collisions of drifting electrons with positive metal ions inside the conductor.',
      'Depends on conductor length (R ∝ L), cross-sectional area (R ∝ 1/A), material resistivity (ρ), and temperature.',
      'At constant potential difference, increasing resistance strictly decreases electric current (I = V / R).',
    ],
  },
  {
    id: 'ohms-law',
    islandId: 'electricity',
    name: "Ohm's Law",
    shortDesc: 'Proportional relationship between potential difference and current at constant temperature.',
    formula: 'V = I · R',
    mastery: 44,
    confidence: 52,
    retention: 50,
    status: 'in-progress',
    prerequisites: ['Potential Difference', 'Resistance'],
    activities: [
      { id: 'ohm-lib', title: 'V-I Linear Graph Explorer', type: 'library', completed: true },
      { id: 'ohm-lab', title: '3D Ohm’s Law Bench Experiment', type: 'lab', completed: false },
      { id: 'ohm-prac', title: 'Counterfactual & Reasoning Set', type: 'practice', completed: false },
      { id: 'ohm-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: '3 days ago',
    nextRevisionDate: 'Today',
    revisionUrgency: 'due-today',
    keyTakeaway: 'Current is directly proportional to voltage and inversely proportional to resistance.',
    librarySummary: [
      'George Simon Ohm showed that V / I = R (constant) for an ohmic metallic conductor at constant temperature.',
      'Slope of a V-versus-I graph gives the Resistance R of the conductor.',
      'Increasing voltage doubles current if R is fixed; increasing resistance halves current if V is fixed.',
    ],
  },
  {
    id: 'series-parallel',
    islandId: 'electricity',
    name: 'Series and Parallel Circuits',
    shortDesc: 'Equivalent resistance, current division, and voltage drops in networks.',
    formula: 'Rs = R1 + R2 | 1/Rp = 1/R1 + 1/R2',
    mastery: 18,
    confidence: 25,
    retention: 30,
    status: 'locked',
    prerequisites: ['Resistance', "Ohm's Law"],
    activities: [
      { id: 'sp-lib', title: 'Current & Voltage Splitting', type: 'library', completed: false },
      { id: 'sp-lab', title: 'Dual-Branch Circuit Test', type: 'lab', completed: false },
      { id: 'sp-prac', title: 'Equivalent Resistance Drills', type: 'practice', completed: false },
      { id: 'sp-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: 'Not started',
    nextRevisionDate: 'After unlock',
    revisionUrgency: 'upcoming',
    keyTakeaway: 'Series shares current; parallel shares potential difference and lowers total resistance.',
    librarySummary: [
      'In series, the same current flows through every resistor while total potential difference splits across them.',
      'In parallel, each branch receives the full supply voltage while current divides inversely with branch resistance.',
      'Household appliances are wired in parallel so each operates independently at rated 220V.',
    ],
  },
  {
    id: 'reflection-mirrors',
    islandId: 'light',
    name: 'Spherical Mirrors',
    shortDesc: 'Image formation, mirror formula, and magnification for concave and convex mirrors.',
    formula: '1/f = 1/v + 1/u',
    mastery: 90,
    confidence: 92,
    retention: 89,
    status: 'completed',
    prerequisites: [],
    activities: [
      { id: 'rm-lib', title: 'Principal Focus & Ray Rules', type: 'library', completed: true },
      { id: 'rm-prac', title: 'Sign Convention Mastery', type: 'practice', completed: true },
      { id: 'rm-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: true },
    ],
    lastPracticedLabel: '5 days ago',
    nextRevisionDate: 'Nov 26',
    revisionUrgency: 'stable',
    keyTakeaway: 'New Cartesian sign convention determines real vs virtual image signs reliably.',
    librarySummary: [
      'Concave mirrors converge parallel rays at the principal focus and form real inverted images beyond F.',
      'Convex mirrors always produce erect, diminished, virtual images — ideal for rear-view mirrors.',
    ],
  },
  {
    id: 'refraction-lenses',
    islandId: 'light',
    name: 'Refraction & Lenses',
    shortDesc: 'Snell’s law, refractive index, lens formula, and dioptre power.',
    formula: 'n = c / v | P = 1 / f(m)',
    mastery: 85,
    confidence: 84,
    retention: 82,
    status: 'completed',
    prerequisites: ['Spherical Mirrors'],
    activities: [
      { id: 'rl-lib', title: 'Optical Density & Bending', type: 'library', completed: true },
      { id: 'rl-prac', title: 'Lens Power Numericals', type: 'practice', completed: true },
      { id: 'rl-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: true },
    ],
    lastPracticedLabel: '3 days ago',
    nextRevisionDate: 'Nov 25',
    revisionUrgency: 'upcoming',
    keyTakeaway: 'Light bends toward the normal when entering an optically denser medium.',
    librarySummary: [
      'Refraction occurs because light changes speed across media of different optical density.',
      'Power of a convex lens is positive (+D) and concave lens is negative (-D).',
    ],
  },
  {
    id: 'magnetic-fields',
    islandId: 'magnetism',
    name: 'Magnetic Field & Solenoid',
    shortDesc: 'Right-hand thumb rule, concentric field lines, and solenoid polarity.',
    formula: 'B ∝ I / r',
    mastery: 48,
    confidence: 55,
    retention: 46,
    status: 'available',
    prerequisites: ['Electric Current'],
    activities: [
      { id: 'mf-lib', title: 'Right-Hand Thumb Rule', type: 'library', completed: false },
      { id: 'mf-prac', title: 'Solenoid Polarity Check', type: 'practice', completed: false },
      { id: 'mf-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: '7 days ago',
    nextRevisionDate: 'Overdue (2 days)',
    revisionUrgency: 'overdue',
    keyTakeaway: 'Magnetic field lines form closed continuous loops and never intersect each other.',
    librarySummary: [
      'A straight current-carrying conductor creates concentric circular magnetic field lines.',
      'Inside a long current-carrying solenoid, the magnetic field is uniform and parallel.',
    ],
  },
  {
    id: 'electromagnetism',
    islandId: 'magnetism',
    name: 'Force on Conductor & Induction',
    shortDesc: 'Fleming’s Left-Hand Rule and domestic overload/short-circuit protection.',
    formula: 'F = B · I · L',
    mastery: 28,
    confidence: 35,
    retention: 34,
    status: 'available',
    prerequisites: ['Magnetic Field & Solenoid'],
    activities: [
      { id: 'em-lib', title: 'Fleming’s Left-Hand Rule', type: 'library', completed: false },
      { id: 'em-prac', title: 'Force Direction Drills', type: 'practice', completed: false },
      { id: 'em-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: 'Not started',
    nextRevisionDate: 'Nov 23',
    revisionUrgency: 'upcoming',
    keyTakeaway: 'Maximum force occurs when current and magnetic field are perpendicular.',
    librarySummary: [
      'Thumb = Force/Motion, Forefinger = Magnetic Field, Middle finger = Current (mutually perpendicular).',
      'Fuses melt via Joule heating when current exceeds safe domestic limits.',
    ],
  },
  {
    id: 'vision-defects',
    islandId: 'human-eye',
    name: 'Accommodation & Vision Defects',
    shortDesc: 'Near-point, far-point, myopia correction, and hypermetropia correction.',
    formula: 'Near point = 25 cm',
    mastery: 12,
    confidence: 20,
    retention: 25,
    status: 'locked',
    prerequisites: ['Refraction & Lenses'],
    activities: [
      { id: 'vd-lib', title: 'Ciliary Muscle Focusing', type: 'library', completed: false },
      { id: 'vd-prac', title: 'Corrective Lens Selection', type: 'practice', completed: false },
      { id: 'vd-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: 'Locked',
    nextRevisionDate: 'Locked',
    revisionUrgency: 'upcoming',
    keyTakeaway: 'Myopia uses concave lenses; hypermetropia uses convex lenses.',
    librarySummary: [
      'Myopia forms distant images in front of the retina and requires a diverging (concave) lens.',
      'Hypermetropia forms near images behind the retina and requires a converging (convex) lens.',
    ],
  },
  {
    id: 'dispersion-scattering',
    islandId: 'human-eye',
    name: 'Prism Dispersion & Scattering',
    shortDesc: 'VIBGYOR spectrum, rainbow formation, and Rayleigh blue-sky scattering.',
    formula: 'Scattering ∝ 1 / λ⁴',
    mastery: 15,
    confidence: 22,
    retention: 28,
    status: 'locked',
    prerequisites: ['Refraction & Lenses'],
    activities: [
      { id: 'ds-lib', title: 'Prism Wavelength Bending', type: 'library', completed: false },
      { id: 'ds-prac', title: 'Atmospheric Optics Quiz', type: 'practice', completed: false },
      { id: 'ds-gate', title: 'Explain-to-Unlock Gate', type: 'gate', completed: false },
    ],
    lastPracticedLabel: 'Locked',
    nextRevisionDate: 'Locked',
    revisionUrgency: 'upcoming',
    keyTakeaway: 'Violet bends the most in glass due to shortest wavelength; red bends the least.',
    librarySummary: [
      'White light disperses in a glass prism because different wavelengths travel at slightly different speeds in glass.',
      'Fine atmospheric particles scatter shorter blue wavelengths strongly, making the daytime sky blue.',
    ],
  },
];

export const QUESTION_BANK: QuestionItem[] = [
  {
    id: 'q-res-1',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    difficulty: 'Beginner',
    type: 'mcq',
    prompt:
      'A 12 V battery is connected across a variable resistor. If you double the resistance from 4 Ω to 8 Ω while keeping voltage at 12 V, what happens to the current?',
    options: [
      'Current doubles from 3 A to 6 A',
      'Current halves from 3 A to 1.5 A',
      'Current stays constant at 3 A',
      'Current drops to zero immediately',
    ],
    correctAnswer: 'Current halves from 3 A to 1.5 A',
    misconceptionOptions: [
      'Current doubles from 3 A to 6 A',
      'Current stays constant at 3 A',
      'Current drops to zero immediately',
    ],
    explanation:
      'By Ohm’s Law (I = V / R), current is inversely proportional to resistance when voltage is constant. Doubling R halves I (12/4 = 3 A → 12/8 = 1.5 A).',
    conceptTrap: 'Thinking larger resistance allows more electricity to pass.',
  },
  {
    id: 'q-res-2',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    difficulty: 'Intermediate',
    type: 'numerical',
    prompt:
      'A copper wire of resistance 6 Ω is stretched uniformly to double its original length (so its cross-sectional area halves). What is its new resistance in Ω?',
    options: ['12 Ω', '3 Ω', '24 Ω', '6 Ω'],
    correctAnswer: '24 Ω',
    arithmeticOptions: ['12 Ω', '3 Ω'],
    misconceptionOptions: ['6 Ω'],
    numericValue: 24,
    unit: 'Ω',
    explanation:
      'Since R = ρL/A, doubling length (2L) and halving area (A/2) multiplies resistance by 2 / (1/2) = 4. Therefore R_new = 4 × 6 Ω = 24 Ω.',
    arithmeticHint: 'Remember that stretching halves the area when length doubles, multiplying R by 4, not 2.',
  },
  {
    id: 'q-res-3',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    difficulty: 'Advanced',
    type: 'reasoning',
    prompt:
      'Explain physically why a long, thin tungsten filament offers higher electrical resistance than a short, thick copper wire at the same temperature.',
    correctAnswer:
      'Electrons travel a longer path through a narrower cross-section and experience more frequent collisions with lattice ions, and tungsten has higher resistivity.',
    explanation:
      'Longer length increases total collisions, smaller cross-section restricts parallel electron pathways, and tungsten’s higher resistivity impedes drift velocity.',
  },
  {
    id: 'q-ohm-1',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    difficulty: 'Beginner',
    type: 'numerical',
    prompt:
      'An electric heater draws a current of 4 A when connected to a 24 V DC lab supply. Calculate the resistance of its heating coil.',
    options: ['6 Ω', '96 Ω', '0.16 Ω', '20 Ω'],
    correctAnswer: '6 Ω',
    arithmeticOptions: ['96 Ω', '0.16 Ω', '20 Ω'],
    numericValue: 6,
    unit: 'Ω',
    explanation:
      'Using R = V / I = 24 V / 4 A = 6 Ω. Multiplying V × I (96) is a common formula inversion error.',
    arithmeticHint: 'Divide Voltage by Current (R = V / I), do not multiply them.',
  },
  {
    id: 'q-ohm-2',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    difficulty: 'Intermediate',
    type: 'mcq',
    prompt:
      'Two conductors A and B have V-I graphs (V on y-axis, I on x-axis) where line A is steeper than line B. Which statement is true?',
    options: [
      'Conductor A has greater resistance than B',
      'Conductor B has greater resistance than A',
      'Both have equal resistance if voltage is zero',
      'Conductor A carries more current at the same voltage',
    ],
    correctAnswer: 'Conductor A has greater resistance than B',
    misconceptionOptions: [
      'Conductor B has greater resistance than A',
      'Both have equal resistance if voltage is zero',
      'Conductor A carries more current at the same voltage',
    ],
    explanation:
      'On a V (y-axis) vs I (x-axis) plot, slope = ΔV / ΔI = R. A steeper line indicates higher resistance and smaller current per volt.',
  },
  {
    id: 'q-ohm-3',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    difficulty: 'Advanced',
    type: 'reasoning',
    prompt:
      'Why does the V-I graph of a glowing filament bulb curve upward (slope increases) at high voltages instead of remaining a straight line?',
    correctAnswer:
      'High current heats the tungsten filament, increasing thermal vibrations of metal ions and raising the resistance.',
    explanation:
      'Ohm’s Law holds only at constant temperature. As filament temperature rises steeply, lattice collisions increase and resistance R increases.',
  },
  {
    id: 'q-pd-1',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    difficulty: 'Intermediate',
    type: 'numerical',
    prompt:
      'How much work is done in moving a charge of 3 C across two points having a potential difference of 12 V?',
    options: ['4 J', '36 J', '15 J', '0.25 J'],
    correctAnswer: '36 J',
    arithmeticOptions: ['4 J', '15 J', '0.25 J'],
    numericValue: 36,
    unit: 'J',
    explanation: 'Work W = V × Q = 12 V × 3 C = 36 Joules.',
    arithmeticHint: 'Check V = W / Q, so W = V × Q.',
  },
  {
    id: 'q-ec-1',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    difficulty: 'Beginner',
    type: 'numerical',
    prompt:
      'A current of 0.5 A flows through a lamp filament for 10 minutes. Calculate the total electric charge that flows through the circuit.',
    options: ['5 C', '300 C', '60 C', '120 C'],
    correctAnswer: '300 C',
    arithmeticOptions: ['5 C', '60 C', '120 C'],
    numericValue: 300,
    unit: 'C',
    explanation:
      'Convert time to seconds first: t = 10 × 60 = 600 s. Then Q = I × t = 0.5 A × 600 s = 300 C.',
    arithmeticHint: 'Remember to convert minutes into seconds (10 × 60 = 600 s).',
  },
  {
    id: 'q-mag-1',
    conceptId: 'magnetic-fields',
    conceptName: 'Magnetic Field & Solenoid',
    difficulty: 'Intermediate',
    type: 'mcq',
    prompt:
      'Inside a long current-carrying solenoid, how do the magnetic field lines behave?',
    options: [
      'They form parallel, equidistant straight lines indicating a uniform field',
      'They converge tightly to zero at the center',
      'They intersect near the north pole',
      'They reverse direction halfway along the axis',
    ],
    correctAnswer: 'They form parallel, equidistant straight lines indicating a uniform field',
    misconceptionOptions: [
      'They converge tightly to zero at the center',
      'They intersect near the north pole',
      'They reverse direction halfway along the axis',
    ],
    explanation:
      'The magnetic field inside a long solenoid is uniform in both magnitude and direction, represented by parallel straight lines.',
  },
  {
    id: 'q-sp-1',
    conceptId: 'series-parallel',
    conceptName: 'Series and Parallel Circuits',
    difficulty: 'Intermediate',
    type: 'numerical',
    prompt:
      'Two 6 Ω resistors are connected in parallel across a 12 V supply. What is the equivalent resistance of the combination?',
    options: ['12 Ω', '6 Ω', '3 Ω', '1.5 Ω'],
    correctAnswer: '3 Ω',
    misconceptionOptions: ['12 Ω', '6 Ω'],
    arithmeticOptions: ['1.5 Ω'],
    numericValue: 3,
    unit: 'Ω',
    explanation: '1/Rp = 1/6 + 1/6 = 2/6 = 1/3, therefore Rp = 3 Ω.',
  },
];

export const INITIAL_MISCONCEPTION: MisconceptionAnalysis = {
  id: 'mis-seed-1',
  timestamp: 'Just now',
  question:
    'What happens to current when resistance increases while voltage remains constant?',
  studentAnswer:
    'Current increases because more resistance allows more electricity to pass.',
  detectedConcept: 'Resistance and current',
  targetConceptId: 'resistance',
  classification: 'Incorrect Concept',
  possibleMisconception:
    'Incorrect understanding of the relationship between resistance and current',
  reasoningEvidence:
    'The student believes resistance increases current at constant voltage',
  confidence: 91,
  recommendedAction: 'Start the resistance experiment',
  recommendedView: 'lab',
  followUpQuestion:
    'In the Ohm’s Law formula I = V / R, if V stays fixed at 12 V and R increases from 4 Ω to 12 Ω, does the fraction 12 / R get larger or smaller?',
  explanation:
    'Resistance is the electrical opposition to charge flow — like narrowing a water pipe. When potential difference (voltage) stays fixed and resistance rises, fewer charges pass per second, so current decreases.',
  resolved: false,
};

export const INITIAL_HISTORY: AssessmentHistoryItem[] = [
  {
    id: 'hist-1',
    title: 'Electric Current Charge Flow Check',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    dateLabel: 'Nov 19',
    scorePercent: 90,
    reasoningQuality: 'Strong',
    classification: 'Sound Understanding',
  },
  {
    id: 'hist-2',
    title: 'Potential Difference Concept Probe',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    dateLabel: 'Nov 18',
    scorePercent: 82,
    reasoningQuality: 'Strong',
    classification: 'Sound Understanding',
  },
  {
    id: 'hist-3',
    title: 'Resistance & Current Mentor Check',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    dateLabel: 'Nov 20',
    scorePercent: 35,
    reasoningQuality: 'Needs Review',
    classification: 'Incorrect Concept',
  },
  {
    id: 'hist-4',
    title: 'Ohm’s Law Ratio Drill',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    dateLabel: 'Nov 20',
    scorePercent: 48,
    reasoningQuality: 'Developing',
    classification: 'Arithmetic Mistake',
  },
];

export const INITIAL_ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'ach-first-mastered',
    title: 'First Concept Mastered',
    description: 'Mastered your first Class 10 science concept with verified conceptual clarity.',
    criteria: 'Reach ≥ 80% mastery with verified conceptual understanding',
    xpBonus: 150,
    unlocked: true,
    unlockedAt: 'Nov 19',
    unlockReason: 'Mastered Electric Current (86%) with verified charge-flow reasoning.',
    category: 'Conceptual',
  },
  {
    id: 'ach-misconception-slayer',
    title: 'Misconception Corrected',
    description: 'Diagnosed and corrected a core physics misconception through reasoned explanation.',
    criteria: 'Resolve an active misconception in AI Mentor or Counterfactual Trial',
    xpBonus: 220,
    unlocked: false,
    category: 'Conceptual',
  },
  {
    id: 'ach-streak-7',
    title: 'Learning Streak Champion',
    description: 'Maintained a 7-day adaptive revision streak without rushing drills.',
    criteria: 'Maintain a 7+ day deliberate learning streak',
    xpBonus: 150,
    unlocked: true,
    unlockedAt: 'Nov 20',
    unlockReason: 'Completed 7 consecutive days of physics practice & revision.',
    category: 'Consistency',
  },
  {
    id: 'ach-lab-explorer',
    title: 'Experiment Explorer',
    description: 'Collected real-time Ohm’s Law measurements across multiple voltage and resistance pairs.',
    criteria: 'Complete the 3D Ohm’s Law Lab with ≥ 3 tested combinations',
    xpBonus: 180,
    unlocked: false,
    category: 'Laboratory',
  },
  {
    id: 'ach-transfer-master',
    title: 'Challenge Completed',
    description: 'Predicted the effect of altering a circuit variable in the Counterfactual Challenge.',
    criteria: 'Pass the Counterfactual Challenge with valid causal explanation',
    xpBonus: 300,
    unlocked: false,
    category: 'Transfer',
  },
  {
    id: 'ach-weak-improved',
    title: 'Weak Concept Improved',
    description: 'Turned a weak concept (< 50%) around with ≥ 15% real mastery gain.',
    criteria: 'Improve any weak concept by at least +15% mastery through verified work',
    xpBonus: 240,
    unlocked: false,
    category: 'Conceptual',
  },
  {
    id: 'ach-understanding-verified',
    title: 'Understanding Verified',
    description: 'Passed multi-situation transfer verification without guessing or rote formulas.',
    criteria: 'Earn Understanding Verified on an active concept across 2 situations',
    xpBonus: 260,
    unlocked: false,
    category: 'Transfer',
  },
  {
    id: 'ach-light-master',
    title: 'Chapter Completed',
    description: 'Completed every concept in a Class 10 island chapter with ≥ 75% mastery.',
    criteria: 'Complete all concepts in any chapter island (Light Island mastered)',
    xpBonus: 250,
    unlocked: true,
    unlockedAt: 'Nov 19',
    unlockReason: 'Completed all Light Island concepts (Spherical Mirrors & Refraction).',
    category: 'Conceptual',
  },
  {
    id: 'ach-gate-guardian',
    title: 'Ohm’s Gatekeeper',
    description: 'Completed Explain-to-Unlock verification to open Series and Parallel Circuits.',
    criteria: 'Unlock Series & Parallel Circuits via Mastery Gate',
    xpBonus: 350,
    unlocked: false,
    category: 'Conceptual',
  },
];

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'diag-1',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    prompt:
      'If 20 Coulombs of charge flow past a cross-section of wire in 4 seconds, what is the electric current?',
    options: ['5 A', '80 A', '0.2 A', '16 A'],
    correctOption: '5 A',
    explanation: 'Current I = Q / t = 20 C / 4 s = 5 A.',
  },
  {
    id: 'diag-2',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    prompt:
      'Keeping battery voltage constant, you swap a 5 Ω resistor for a 15 Ω resistor. What happens to the current?',
    options: [
      'Current becomes one-third as large',
      'Current becomes three times larger',
      'Current remains unchanged',
      'Voltage drops to zero',
    ],
    correctOption: 'Current becomes one-third as large',
    explanation: 'Since I = V / R, tripling resistance reduces current to one-third.',
  },
  {
    id: 'diag-3',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    prompt:
      'A 12 V supply drives 2 A through a lamp. If you increase the supply to 24 V on the same lamp (constant R), what current flows?',
    options: ['4 A', '1 A', '6 A', '12 A'],
    correctOption: '4 A',
    explanation: 'R = 12 / 2 = 6 Ω. At 24 V, I = 24 / 6 = 4 A.',
  },
  {
    id: 'diag-4',
    conceptId: 'magnetic-fields',
    conceptName: 'Magnetic Field & Solenoid',
    prompt:
      'What happens to the magnetic field inside a solenoid when the current through its coils is increased?',
    options: [
      'Magnetic field strength increases proportionally',
      'Magnetic field disappears',
      'Magnetic field lines cross each other',
      'Poles vanish completely',
    ],
    correctOption: 'Magnetic field strength increases proportionally',
    explanation: 'Solenoid field strength is directly proportional to current and turns per unit length.',
  },
  {
    id: 'diag-5',
    conceptId: 'vision-defects',
    conceptName: 'Accommodation & Vision Defects',
    prompt:
      'A Class 10 student can read a textbook clearly at 25 cm, but the classroom whiteboard appears blurry. Which corrective lens is needed?',
    options: [
      'Concave lens (for myopia)',
      'Convex lens (for hypermetropia)',
      'Flat glass slab',
      'Bifocal prism only',
    ],
    correctOption: 'Concave lens (for myopia)',
    explanation: 'Difficulty seeing distant objects is myopia, corrected with a diverging concave lens.',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Weak concept requires attention: Resistance',
    detail: 'Mastery at 38% · Run 3D Circuit Lab or Verify Understanding',
    timeLabel: '18m ago',
    read: false,
    targetView: 'lab',
    category: 'weak-concept',
    conceptId: 'resistance',
  },
  {
    id: 'notif-2',
    title: 'Revision reminder: Potential Difference',
    detail: 'Retention at 74% · Due today to keep Mastery Achieved status',
    timeLabel: '45m ago',
    read: false,
    targetView: 'revision',
    category: 'revision',
    conceptId: 'potential-difference',
  },
  {
    id: 'notif-3',
    title: 'Personalized Challenge Ready',
    detail: 'Test Voltage-doubling Condition Flip in Challenge Arena',
    timeLabel: '1h ago',
    read: false,
    targetView: 'counterfactual',
    category: 'challenge',
    conceptId: 'ohms-law',
  },
  {
    id: 'notif-4',
    title: '7-Day Learning Streak Milestone',
    detail: 'Steady daily practice earned +150 XP bonus',
    timeLabel: 'Yesterday',
    read: true,
    targetView: 'rewards',
    category: 'streak',
  },
];

const STUDENT_NAMES = [
  'Aarav Sharma',
  'Ananya Nair',
  'Rohan Deshmukh',
  'Meera Krishnan',
  'Kabir Malhotra',
  'Diya Patel',
  'Vivaan Iyer',
  'Ishita Verma',
  'Arjun Reddy',
  'Saanvi Gupta',
  'Aditya Joshi',
  'Kavya Menon',
  'Siddharth Kulkarni',
  'Tanvi Chatterjee',
  'Devansh Kapoor',
  'Niharika Rao',
  'Pranav Bansal',
  'Riya Sengupta',
  'Karanveer Singh',
  'Aditi Saxena',
  'Harshvardhan Tiwari',
  'Pooja Nambiar',
  'Nikhil Chauhan',
  'Shruti Gokhale',
  'Yashwant Pillai',
  'Zoya Merchant',
  'Manav Bhatia',
  'Sneha Agarwal',
  'Reyansh Mishra',
  'Tara Choudhary',
];

const MISCONCEPTION_POOL = [
  'Believes higher resistance increases current at constant V',
  'Inverts Ohm’s Law formula as R = I / V',
  'Confuses series current sharing with parallel voltage sharing',
  'Assumes battery is a constant current source regardless of load',
  'No active conceptual errors detected',
];

export const TEACHER_CLASS_STUDENTS: TeacherStudentRecord[] = STUDENT_NAMES.map(
  (name, idx) => {
    const seed = (idx * 17 + 23) % 100;
    const ec = Math.min(98, 66 + ((idx * 11) % 30));
    const pd = Math.min(96, 58 + ((idx * 13) % 36));
    const res = idx % 3 === 0 ? 32 + (idx % 16) : 54 + ((idx * 7) % 38);
    const ohm = idx % 4 === 0 ? 38 + (idx % 14) : 58 + ((idx * 9) % 35);
    const sp = idx % 2 === 0 ? 36 + (idx % 20) : 60 + ((idx * 5) % 32);
    const mag = 48 + ((idx * 15) % 42);
    const light = 72 + ((idx * 6) % 25);

    const overallMastery = Math.round((ec + pd + res + ohm + sp + mag + light) / 7);
    const supportNeeded = res < 48 || ohm < 50 || overallMastery < 58;
    const primaryMisconception =
      res < 48
        ? MISCONCEPTION_POOL[0]
        : ohm < 50
          ? MISCONCEPTION_POOL[1]
          : sp < 48
            ? MISCONCEPTION_POOL[2]
            : supportNeeded
              ? MISCONCEPTION_POOL[3]
              : MISCONCEPTION_POOL[4];

    return {
      id: `stu-${idx + 1}`,
      name,
      rollNo: `10A-${String(idx + 1).padStart(2, '0')}`,
      overallMastery,
      reasoningScore: Math.min(96, Math.max(38, overallMastery + (seed % 11) - 5)),
      streakDays: 2 + (idx % 12),
      supportNeeded,
      primaryMisconception,
      conceptMastery: {
        'electric-current': ec,
        'potential-difference': pd,
        resistance: res,
        'ohms-law': ohm,
        'series-parallel': sp,
        'magnetic-fields': mag,
        'reflection-mirrors': light,
      },
      lastActive: idx % 5 === 0 ? '2 days ago' : idx % 2 === 0 ? 'Today' : 'Yesterday',
    };
  },
);

export const INITIAL_INTERVENTIONS: TeacherIntervention[] = [
  {
    id: 'int-1',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    title: '3D Rheostat Lab + Ratio Check',
    description: 'Addresses inverse resistance-current misconception.',
    targetCount: 10,
    assigned: false,
  },
  {
    id: 'int-2',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    title: 'V-I Slope & Formula Clinic',
    description: 'Fixes R = I / V rearrangement errors.',
    targetCount: 8,
    assigned: false,
  },
  {
    id: 'int-3',
    conceptId: 'series-parallel',
    conceptName: 'Series and Parallel Circuits',
    title: 'Branch Voltage & Current Pack',
    description: 'Pre-gate drill for domestic parallel circuits.',
    targetCount: 12,
    assigned: false,
  },
];

export const CLASS_PROGRESS_TIMELINE = [
  { week: 'Wk 1', mastery: 44, reasoning: 39 },
  { week: 'Wk 2', mastery: 49, reasoning: 45 },
  { week: 'Wk 3', mastery: 53, reasoning: 50 },
  { week: 'Wk 4', mastery: 58, reasoning: 56 },
  { week: 'Wk 5', mastery: 62, reasoning: 61 },
  { week: 'Wk 6', mastery: 67, reasoning: 66 },
  { week: 'Wk 7', mastery: 71, reasoning: 72 },
  { week: 'Wk 8', mastery: 74, reasoning: 76 },
];

export const INITIAL_BASELINE_MASTERY: Record<string, number> = {
  'electric-current': 54,
  'potential-difference': 50,
  resistance: 38,
  'ohms-law': 44,
  'series-parallel': 18,
  'reflection-mirrors': 62,
  'refraction-lenses': 58,
  'magnetic-fields': 48,
  electromagnetism: 28,
  'vision-defects': 12,
  'dispersion-scattering': 15,
};

export const INITIAL_VERIFICATION_RECORDS: Record<string, ConceptVerificationRecord> = {
  'electric-current': {
    conceptId: 'electric-current',
    status: 'Mastery Achieved',
    attemptsCount: 2,
    verifiedChecksCount: 2,
    completedScenarioIds: ['ver-ec-1', 'ver-ec-2'],
    lastIssueType: 'genuine',
    lastFeedback: 'Verified across two situations: charge rate I = Q / t and series ammeter placement.',
    lastEvaluatedAt: 'Nov 19',
    verifiedExplainSummary: 'Can explain why current stays identical along a single series path and how Coulombs per second defines Amperes.',
    history: [],
  },
  'potential-difference': {
    conceptId: 'potential-difference',
    status: 'Understanding Verified',
    attemptsCount: 2,
    verifiedChecksCount: 2,
    completedScenarioIds: ['ver-pd-1', 'ver-pd-2'],
    lastIssueType: 'genuine',
    lastFeedback: 'Verified work-per-unit-charge transfer and parallel voltmeter connection.',
    lastEvaluatedAt: 'Nov 18',
    verifiedExplainSummary: 'Can explain why voltage is measured across two points in parallel as energy transferred per Coulomb.',
    history: [],
  },
  resistance: {
    conceptId: 'resistance',
    status: 'Needs More Practice',
    attemptsCount: 1,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    lastIssueType: 'misconception',
    lastFeedback: 'Initial check showed confusion between resistance increasing vs opposing current.',
    recommendedAction: 'Test higher resistance in 3D Lab, then verify in two new situations.',
    recommendedView: 'lab',
    lastEvaluatedAt: 'Nov 20',
    history: [],
  },
  'ohms-law': {
    conceptId: 'ohms-law',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    recommendedAction: 'Practice V-I proportionality and complete 2 scenario verifications.',
    recommendedView: 'lab',
    history: [],
  },
  'series-parallel': {
    conceptId: 'series-parallel',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  },
  'reflection-mirrors': {
    conceptId: 'reflection-mirrors',
    status: 'Mastery Achieved',
    attemptsCount: 2,
    verifiedChecksCount: 2,
    completedScenarioIds: ['ver-rm-1', 'ver-rm-2'],
    lastIssueType: 'genuine',
    lastEvaluatedAt: 'Nov 19',
    verifiedExplainSummary: 'Can distinguish concave real-image cases from convex wide-field virtual images.',
    history: [],
  },
  'refraction-lenses': {
    conceptId: 'refraction-lenses',
    status: 'Mastery Achieved',
    attemptsCount: 2,
    verifiedChecksCount: 2,
    completedScenarioIds: ['ver-rl-1', 'ver-rl-2'],
    lastIssueType: 'genuine',
    lastEvaluatedAt: 'Nov 19',
    verifiedExplainSummary: 'Can explain light speed change across optical media and lens dioptre sign.',
    history: [],
  },
  'magnetic-fields': {
    conceptId: 'magnetic-fields',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  },
  electromagnetism: {
    conceptId: 'electromagnetism',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  },
  'vision-defects': {
    conceptId: 'vision-defects',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  },
  'dispersion-scattering': {
    conceptId: 'dispersion-scattering',
    status: 'Learning in Progress',
    attemptsCount: 0,
    verifiedChecksCount: 0,
    completedScenarioIds: [],
    history: [],
  },
};

export const INITIAL_LEARNING_TIMELINE: LearningTimelineEvent[] = [
  {
    id: 'tl-seed-1',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    eventType: 'verification',
    title: 'Verified Charge Rate & Series Ammeter Placement',
    summary: 'Passed two transfer checks explaining why electrons drift opposite to conventional current and ammeters sit in series.',
    masteryBefore: 54,
    masteryAfter: 86,
    misconceptionAddressed: 'Thought current gets used up after passing through a lamp',
    timestamp: 'Nov 19',
  },
  {
    id: 'tl-seed-2',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    eventType: 'practice',
    title: 'Energy-per-Charge Reasoning Completed',
    summary: 'Connected V = W / Q to parallel voltmeter readings across load terminals.',
    masteryBefore: 50,
    masteryAfter: 78,
    misconceptionAddressed: 'Confused potential difference with current flowing through a wire',
    timestamp: 'Nov 18',
  },
  {
    id: 'tl-seed-3',
    conceptId: 'reflection-mirrors',
    conceptName: 'Spherical Mirrors',
    eventType: 'verification',
    title: 'Light Island Sign Convention Mastered',
    summary: 'Explained why convex rear-view mirrors always form erect, diminished virtual images.',
    masteryBefore: 62,
    masteryAfter: 90,
    timestamp: 'Nov 19',
  },
  {
    id: 'tl-seed-4',
    conceptId: 'refraction-lenses',
    conceptName: 'Refraction & Lenses',
    eventType: 'verification',
    title: 'Optical Density & Bending Verified',
    summary: 'Connected refractive index n = c / v to light bending toward the normal in glass.',
    masteryBefore: 58,
    masteryAfter: 85,
    timestamp: 'Nov 19',
  },
];

export const VERIFICATION_SCENARIOS: VerificationScenario[] = [
  // Resistance (2 distinct new situations)
  {
    id: 'ver-res-1',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    situationTitle: 'Extension Cord Heating Scenario',
    prompt:
      'An engineer replaces a thick, short copper extension cable with a thin, much longer nichrome wire using the same 12 V battery. What happens to the circuit current and why?',
    options: [
      'Current decreases because longer length and smaller area increase opposition to electron flow',
      'Current increases because nichrome pulls more charge from the battery',
      'Current stays identical because the 12 V battery forces the same flow',
      'Voltage doubles to push electrons through the thin wire',
    ],
    correctOption:
      'Current decreases because longer length and smaller area increase opposition to electron flow',
    causalKeywords: [
      'length',
      'area',
      'thin',
      'collision',
      'oppos',
      'resist',
      'decrease',
      'drop',
      'less',
      'smaller',
      'lower',
      'narrow',
    ],
    roteTraps: ['r=rho l/a', 'r = rho l/a', 'v=ir'],
    expectedMechanism:
      'Longer length and smaller cross-sectional area increase resistance (R ∝ L / A), causing more electron-ion collisions and lowering current at fixed 12 V.',
    recommendedFollowUpLabel: 'Run 3D Rheostat Experiment',
    recommendedFollowUpView: 'lab',
  },
  {
    id: 'ver-res-2',
    conceptId: 'resistance',
    conceptName: 'Resistance',
    situationTitle: 'Dimmer Slider Calibration',
    prompt:
      'In a stage lamp dimmer circuit powered by a fixed 24 V supply, sliding the rheostat wiper introduces twice as much coil wire into the path. How does bulb brightness change and why?',
    options: [
      'Bulb becomes dimmer because higher resistance reduces current at fixed 24 V',
      'Bulb becomes brighter because extra coil wire generates more current',
      'Bulb brightness stays unchanged since battery voltage is fixed',
      'Bulb turns off immediately unless voltage is raised',
    ],
    correctOption:
      'Bulb becomes dimmer because higher resistance reduces current at fixed 24 V',
    causalKeywords: [
      'dim',
      'less',
      'decreas',
      'drop',
      'halv',
      'lower',
      'oppos',
      'invers',
      'resist',
      'i = v/r',
      'v/r',
      'v / r',
    ],
    roteTraps: ['v=ir', 'i=v/r'],
    expectedMechanism:
      'Doubling active wire length increases resistance, which inversely halves the current (I = V / R) at constant 24 V, reducing power delivered to the bulb.',
    recommendedFollowUpLabel: 'Review Resistance in AI Mentor',
    recommendedFollowUpView: 'mentor',
  },
  // Ohm's Law (2 distinct new situations)
  {
    id: 'ver-ohm-1',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    situationTitle: 'Solar Panel Bench Test',
    prompt:
      'A fixed 8 Ω resistor is connected first to a 4 V cell and then to a 16 V solar pack at constant room temperature. How does current change and why?',
    options: [
      'Current quadruples (0.5 A to 2 A) because I is directly proportional to V at fixed R',
      'Current stays 0.5 A because the resistor fixes the current',
      'Current drops to one-fourth because voltage pushes back',
      'Resistance quadruples so current stays equal',
    ],
    correctOption:
      'Current quadruples (0.5 A to 2 A) because I is directly proportional to V at fixed R',
    causalKeywords: [
      'proportion',
      'direct',
      'four',
      'quadrupl',
      'increas',
      'fixed r',
      'constant r',
      'v/r',
      'v / r',
      'divide',
    ],
    roteTraps: ['v=ir', 'v = ir'],
    expectedMechanism:
      'With constant resistance (8 Ω) and constant temperature, multiplying voltage by 4 multiplies current by 4 because I = V / R is directly proportional to V.',
    recommendedFollowUpLabel: 'Test V vs I in 3D Lab',
    recommendedFollowUpView: 'lab',
  },
  {
    id: 'ver-ohm-2',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    situationTitle: 'Hot Tungsten Filament Non-Ohmic Check',
    prompt:
      'At very high voltage, a glowing filament bulb’s V-I curve bends upward (slope ΔV/ΔI grows steeper). What physical reason explains this departure from ideal linearity?',
    options: [
      'Higher temperature increases lattice vibrations, raising filament resistance',
      'The battery loses voltage inside the glass bulb',
      'Electrons move faster so resistance drops to zero',
      'Current stops obeying conservation of charge',
    ],
    correctOption:
      'Higher temperature increases lattice vibrations, raising filament resistance',
    causalKeywords: [
      'temperat',
      'heat',
      'hot',
      'vibrat',
      'collision',
      'slope',
      'resist',
      'increas',
      'non-ohmic',
    ],
    roteTraps: ['r=v/i'],
    expectedMechanism:
      'Ohm’s Law requires constant temperature; intense Joule heating makes tungsten ions vibrate more, increasing electron collisions and raising R (the V-I slope).',
    recommendedFollowUpLabel: 'Practice Ohm’s Law Questions',
    recommendedFollowUpView: 'questions',
  },
  // Electric Current
  {
    id: 'ver-ec-1',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    situationTitle: 'Before vs After the Lamp Probe',
    prompt:
      'An ammeter placed before a glowing bulb reads 1.5 A. What will an identical ammeter placed right after the bulb in the same single loop read, and why?',
    options: [
      '1.5 A, because charge is conserved and rate of flow is equal everywhere in a series loop',
      '0.75 A, because the bulb consumes half the electric current to glow',
      '0 A, because electrons stop inside the filament',
      '3.0 A, because heat speeds up electrons leaving the bulb',
    ],
    correctOption:
      '1.5 A, because charge is conserved and rate of flow is equal everywhere in a series loop',
    causalKeywords: [
      'conserv',
      'same',
      'equal',
      'not used up',
      'energy',
      'loop',
      'series',
      'charge',
    ],
    roteTraps: ['i=q/t'],
    expectedMechanism:
      'The bulb transforms electrical energy into heat/light, not charge itself; charge is conserved around a single closed loop so current remains 1.5 A everywhere.',
    recommendedFollowUpLabel: 'Review Current Notes',
    recommendedFollowUpView: 'revision',
  },
  {
    id: 'ver-ec-2',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    situationTitle: 'Ammeter Wiring Mistake',
    prompt:
      'Why must a low-resistance ammeter be wired in series with a resistor rather than in parallel across the battery?',
    options: [
      'In parallel, its near-zero resistance would create a dangerous short-circuit surge',
      'In series, it blocks all voltage from reaching the resistor',
      'In parallel, it measures potential difference instead of charge',
      'It only works when attached to the positive terminal alone',
    ],
    correctOption:
      'In parallel, its near-zero resistance would create a dangerous short-circuit surge',
    causalKeywords: [
      'low resist',
      'short',
      'large current',
      'surge',
      'same current',
      'series',
      'damage',
    ],
    roteTraps: ['series'],
    expectedMechanism:
      'An ammeter has very low internal resistance so it doesn’t alter loop current; placing it in parallel lets huge current bypass the load and short the supply.',
    recommendedFollowUpLabel: 'Inspect Ammeter in 3D Lab',
    recommendedFollowUpView: 'lab',
  },
  // Potential Difference
  {
    id: 'ver-pd-1',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    situationTitle: 'Zero-Voltage Wire Segment',
    prompt:
      'You connect a voltmeter across a short, nearly zero-resistance copper wire carrying 2 A of current. Why does the voltmeter read almost 0 V even though current is flowing?',
    options: [
      'Almost no work is needed per Coulomb to push charges across negligible resistance (V = IR ≈ 0)',
      'Because current and voltage cannot exist in the same wire',
      'Because a voltmeter must be wired in series to detect current',
      'Because electrons stop moving whenever a voltmeter is attached',
    ],
    correctOption:
      'Almost no work is needed per Coulomb to push charges across negligible resistance (V = IR ≈ 0)',
    causalKeywords: ['work', 'energy', 'resist', 'negligible', 'drop', 'zero', 'same potential', 'joule'],
    roteTraps: ['v=w/q'],
    expectedMechanism:
      'Potential difference measures work/energy converted per unit charge between two points; with negligible resistance, negligible energy is dissipated across that wire.',
    recommendedFollowUpLabel: 'Practice Potential Difference',
    recommendedFollowUpView: 'questions',
  },
  {
    id: 'ver-pd-2',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    situationTitle: 'High-Resistance Voltmeter Design',
    prompt:
      'Why is a voltmeter built with extremely high internal resistance and connected in parallel across a bulb?',
    options: [
      'So it measures the voltage across the bulb while drawing negligible current away from it',
      'So all circuit current passes through the voltmeter coil',
      'To double the potential difference across the battery',
      'To increase charge flow through the filament',
    ],
    correctOption:
      'So it measures the voltage across the bulb while drawing negligible current away from it',
    causalKeywords: ['negligible current', 'divert', 'parallel', 'high resist', 'across', 'same voltage'],
    roteTraps: ['parallel'],
    expectedMechanism:
      'Connecting in parallel matches the bulb’s terminal potential difference, while very high resistance prevents current from leaking through the meter.',
    recommendedFollowUpLabel: 'Open Voltmeter Bench in 3D Lab',
    recommendedFollowUpView: 'lab',
  },
  // Series & Parallel
  {
    id: 'ver-sp-1',
    conceptId: 'series-parallel',
    conceptName: 'Series and Parallel Circuits',
    situationTitle: 'Adding a Parallel Kitchen Appliance',
    prompt:
      'At home (220 V mains), you switch on a toaster in parallel with an already running kettle. What happens to total circuit resistance and total mains current?',
    options: [
      'Total resistance decreases and total current drawn from mains increases',
      'Total resistance increases and kettle dims immediately',
      'Total resistance stays fixed because both devices are 220 V',
      'Current splits so neither appliance gets full 220 V',
    ],
    correctOption: 'Total resistance decreases and total current drawn from mains increases',
    causalKeywords: ['branch', 'path', 'decreas', 'lower', 'total resist', 'more current', '220', 'independent'],
    roteTraps: ['1/rp=1/r1+1/r2'],
    expectedMechanism:
      'Each added parallel branch provides an extra pathway at full 220 V, reducing equivalent resistance Rp and increasing total supply current.',
    recommendedFollowUpLabel: 'Practice Series-Parallel Drills',
    recommendedFollowUpView: 'questions',
  },
  {
    id: 'ver-sp-2',
    conceptId: 'series-parallel',
    conceptName: 'Series and Parallel Circuits',
    situationTitle: 'Fairy Lights Failure Comparison',
    prompt:
      'Why does one burnt-out bulb darken an entire old string of series fairy lights, while household ceiling lights stay lit if one room bulb fuses?',
    options: [
      'Series shares a single unbroken loop; parallel gives each bulb an independent branch across supply voltage',
      'Series bulbs use alternating current while parallel uses direct current',
      'Parallel bulbs have infinite resistance when switched on',
      'Series bulbs run at higher voltage than the supply',
    ],
    correctOption:
      'Series shares a single unbroken loop; parallel gives each bulb an independent branch across supply voltage',
    causalKeywords: ['single path', 'open', 'break', 'independent', 'branch', 'loop', 'parallel'],
    roteTraps: ['series'],
    expectedMechanism:
      'A break anywhere in a series loop opens the only current path; parallel branches each connect directly across supply terminals independently.',
    recommendedFollowUpLabel: 'Review Mastery Gate Notes',
    recommendedFollowUpView: 'mastery-gate',
  },
  // Light Island + Magnetism + Human Eye scenarios
  {
    id: 'ver-rm-1',
    conceptId: 'reflection-mirrors',
    conceptName: 'Spherical Mirrors',
    situationTitle: 'Dentist Mirror vs Rear-View Mirror',
    prompt:
      'A dentist holds a small mirror very close to a tooth to see an enlarged upright image. Which mirror is it and why does it work only up close?',
    options: [
      'Concave mirror with object inside focal length (between P and F)',
      'Convex mirror because it always magnifies objects',
      'Plane mirror tilted at 45 degrees',
      'Concave mirror with object beyond centre of curvature C',
    ],
    correctOption: 'Concave mirror with object inside focal length (between P and F)',
    causalKeywords: ['concave', 'focus', 'pole', 'virtual', 'erect', 'magnif', 'enlarg'],
    roteTraps: ['1/f=1/v+1/u'],
    expectedMechanism:
      'Only a concave mirror placed with the tooth within its focal length produces an enlarged, upright virtual image.',
    recommendedFollowUpLabel: 'Review Mirror Notes',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-rm-2',
    conceptId: 'reflection-mirrors',
    conceptName: 'Spherical Mirrors',
    situationTitle: 'Blind-Corner Traffic Mirror',
    prompt:
      'Why are convex mirrors mounted at blind street corners instead of plane or concave mirrors?',
    options: [
      'They always form diminished, upright images across a wider field of view',
      'They focus sunlight to illuminate oncoming cars',
      'They invert images so drivers notice hazards faster',
      'They magnify distant cars to look closer',
    ],
    correctOption: 'They always form diminished, upright images across a wider field of view',
    causalKeywords: ['wide', 'field', 'diminish', 'erect', 'upright', 'diverg', 'virtual'],
    roteTraps: ['convex'],
    expectedMechanism:
      'Outward curvature diverges reflected rays, squeezing a wide traffic field into an upright, diminished virtual view.',
    recommendedFollowUpLabel: 'Open Light Island',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-rl-1',
    conceptId: 'refraction-lenses',
    conceptName: 'Refraction & Lenses',
    situationTitle: 'Swimming Pool Depth Illusion',
    prompt:
      'A coin on the floor of a clear swimming pool looks shallower than its real depth when viewed from above. Explain why.',
    options: [
      'Light from the coin bends away from the normal exiting water into faster air, making rays appear from higher up',
      'Water magnifies the coin horizontally without bending light',
      'Light speeds up in water so rays bend toward the normal',
      'Total internal reflection doubles the image',
    ],
    correctOption:
      'Light from the coin bends away from the normal exiting water into faster air, making rays appear from higher up',
    causalKeywords: ['away from normal', 'faster', 'rarer', 'denser', 'speed', 'apparent', 'bend', 'refract'],
    roteTraps: ['n=c/v'],
    expectedMechanism:
      'Passing from optically denser water into air speeds light up, bending rays away from the normal so back-traced rays intersect above the true coin.',
    recommendedFollowUpLabel: 'Review Optics Concepts',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-rl-2',
    conceptId: 'refraction-lenses',
    conceptName: 'Refraction & Lenses',
    situationTitle: 'Prescribed -2.5 D Spectacle Lens',
    prompt:
      'An optician prescribes a lens of power -2.5 D. What type of lens is it, what is its focal length, and how does it affect parallel rays?',
    options: [
      'Concave diverging lens with f = -0.40 m (-40 cm)',
      'Convex converging lens with f = +0.40 m',
      'Concave lens with f = -2.5 m',
      'Plane glass slab with infinite focal length',
    ],
    correctOption: 'Concave diverging lens with f = -0.40 m (-40 cm)',
    causalKeywords: ['concave', 'diverg', 'negative', '0.4', '40 cm', '1/p'],
    roteTraps: ['p=1/f'],
    expectedMechanism:
      'Negative power denotes a diverging concave lens; f = 1 / (-2.5) = -0.40 m = -40 cm.',
    recommendedFollowUpLabel: 'Review Lens Formula',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-mag-1',
    conceptId: 'magnetic-fields',
    conceptName: 'Magnetic Field & Solenoid',
    situationTitle: 'Compass Near Vertical Wire',
    prompt:
      'Current flows vertically downward in a straight wire, and you double the current while holding the compass at the same distance from the wire. What happens to compass deflection and why?',
    options: [
      'Deflection increases because magnetic field around a conductor strengthens proportionally with current',
      'Deflection disappears because higher current cancels magnetic lines',
      'Field lines cross each other near the wire',
      'Compass aligns straight along the vertical wire',
    ],
    correctOption:
      'Deflection increases because magnetic field around a conductor strengthens proportionally with current',
    causalKeywords: ['proportion', 'stronger', 'increas', 'current', 'concentric', 'right-hand', 'thumb'],
    roteTraps: ['b prop i'],
    expectedMechanism:
      'By B ∝ I / r, larger current produces a stronger concentric magnetic field, exerting greater torque on the compass needle.',
    recommendedFollowUpLabel: 'Practice Magnetism Questions',
    recommendedFollowUpView: 'questions',
  },
  {
    id: 'ver-mag-2',
    conceptId: 'magnetic-fields',
    conceptName: 'Magnetic Field & Solenoid',
    situationTitle: 'Electromagnet Core Swap',
    prompt:
      'Why does inserting a soft-iron core inside a current-carrying solenoid create a much stronger temporary magnet than steel or air?',
    options: [
      'Soft iron strongly concentrates magnetic flux and demagnetizes quickly when current stops',
      'Soft iron generates its own electric current without a battery',
      'Steel blocks magnetic field lines from entering the coil',
      'Air prevents solenoid turns from having poles',
    ],
    correctOption:
      'Soft iron strongly concentrates magnetic flux and demagnetizes quickly when current stops',
    causalKeywords: ['soft iron', 'uniform', 'concentrat', 'temporary', 'demagnet', 'domain', 'strong'],
    roteTraps: ['solenoid'],
    expectedMechanism:
      'Soft iron aligns easily with the uniform solenoid field to amplify magnetic strength yet loses magnetism cleanly once switched off.',
    recommendedFollowUpLabel: 'Review Solenoid Notes',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-em-1',
    conceptId: 'electromagnetism',
    conceptName: 'Force on Conductor & Induction',
    situationTitle: 'Parallel Field Alignment Test',
    prompt:
      'A straight wire carrying 3 A is placed completely parallel to uniform magnetic field lines. What magnetic force acts on the wire and why?',
    options: [
      'Zero force, because magnetic force requires a perpendicular component between current and field',
      'Maximum force pushing the wire sideways',
      'Force reverses direction every second',
      'Wire melts immediately',
    ],
    correctOption:
      'Zero force, because magnetic force requires a perpendicular component between current and field',
    causalKeywords: ['zero', 'parallel', 'perpendicular', 'angle', 'fleming', 'component', '90'],
    roteTraps: ['f=bil'],
    expectedMechanism:
      'Fleming’s Left-Hand Rule applies to perpendicular field and current (F = BIL sin θ); when θ = 0° (parallel), force vanishes.',
    recommendedFollowUpLabel: 'Review Fleming’s Left-Hand Rule',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-em-2',
    conceptId: 'electromagnetism',
    conceptName: 'Force on Conductor & Induction',
    situationTitle: 'Fuse Wire Rating Failure',
    prompt:
      'Why is replacing a blown 5 A domestic fuse with a thick copper wire dangerous during an appliance short circuit?',
    options: [
      'Thick copper has very low resistance and high melting point, so fault current won’t melt it before wires overheat',
      'Copper reverses domestic AC voltage into DC',
      'Thick copper creates higher voltage than 220 V',
      'It reduces resistance to zero so appliances run cooler',
    ],
    correctOption:
      'Thick copper has very low resistance and high melting point, so fault current won’t melt it before wires overheat',
    causalKeywords: ['melt', 'joule', 'heat', 'low resist', 'overload', 'short', 'break'],
    roteTraps: ['fuse'],
    expectedMechanism:
      'A fuse relies on Joule heating (I²Rt) in a low-melting alloy to break the circuit safely; thick copper keeps conducting hazardous fault currents.',
    recommendedFollowUpLabel: 'Open Magnetism Island',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-vd-1',
    conceptId: 'vision-defects',
    conceptName: 'Accommodation & Vision Defects',
    situationTitle: 'Blurred Back-Bench Chalkboard',
    prompt:
      'A student sees notebook text at 25 cm clearly, but the far-away board is blurry. Where does the eye form the board’s image and which lens fixes it?',
    options: [
      'Image forms in front of the retina (myopia); a concave lens diverges incoming rays onto the retina',
      'Image forms behind the retina; a convex lens converges rays',
      'Lens loses elasticity completely; only reading glasses help',
      'Image forms on the blind spot',
    ],
    correctOption:
      'Image forms in front of the retina (myopia); a concave lens diverges incoming rays onto the retina',
    causalKeywords: ['front of retina', 'myopia', 'concave', 'diverg', 'distant', 'far point'],
    roteTraps: ['concave'],
    expectedMechanism:
      'Excessive eye convergence focuses distant rays before the retina; a concave lens slightly diverges rays first so they land cleanly on the retina.',
    recommendedFollowUpLabel: 'Open Human Eye Island',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-vd-2',
    conceptId: 'vision-defects',
    conceptName: 'Accommodation & Vision Defects',
    situationTitle: 'Newspaper Held at Arm’s Length',
    prompt:
      'An adult holds a newspaper 60 cm away to read small print clearly. Where would rays from 25 cm focus without glasses, and how does a convex lens help?',
    options: [
      'Rays would converge behind the retina (hypermetropia); a convex lens provides extra convergence onto the retina',
      'Rays converge in front of the retina; a concave lens pushes them back',
      'Cornea scatters blue light too strongly',
      'Ciliary muscles permanently shorten the eyeball',
    ],
    correctOption:
      'Rays would converge behind the retina (hypermetropia); a convex lens provides extra convergence onto the retina',
    causalKeywords: ['behind', 'hypermetropia', 'convex', 'converg', 'near point', '25 cm'],
    roteTraps: ['convex'],
    expectedMechanism:
      'Weak focusing power leaves near-object rays converging behind the retina; a convex lens pre-converges rays so they focus on the retina.',
    recommendedFollowUpLabel: 'Review Vision Defects',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-ds-1',
    conceptId: 'dispersion-scattering',
    conceptName: 'Prism Dispersion & Scattering',
    situationTitle: 'Recombining Rainbow Spectrum',
    prompt:
      'If a second identical glass prism is placed inverted behind the first dispersing prism, what emerges and why?',
    options: [
      'White light recombines because the second prism bends each wavelength back equally in the opposite direction',
      'Only pure violet light exits the second prism',
      'The spectrum splits into 14 colors',
      'Light stops refracting inside the second prism',
    ],
    correctOption:
      'White light recombines because the second prism bends each wavelength back equally in the opposite direction',
    causalKeywords: ['recombin', 'white', 'opposite', 'wavelength', 'speed', 'cancel', 'equal'],
    roteTraps: ['vibgyor'],
    expectedMechanism:
      'Inverted geometry reverses each wavelength’s angular dispersion, proving white light is a superposition of spectrum colors.',
    recommendedFollowUpLabel: 'Open Human Eye Island',
    recommendedFollowUpView: 'island-detail',
  },
  {
    id: 'ver-ds-2',
    conceptId: 'dispersion-scattering',
    conceptName: 'Prism Dispersion & Scattering',
    situationTitle: 'Reddish Sunset vs Deep Blue Zenith',
    prompt:
      'Why does the setting sun look reddish-orange while overhead daytime sky looks blue?',
    options: [
      'Long atmospheric paths at sunset scatter away shorter blue wavelengths, leaving longer red wavelengths to reach your eyes',
      'The sun cools down physically in the evening and emits red light',
      'Air molecules absorb red light during noon',
      'Ozone turns blue light into red light',
    ],
    correctOption:
      'Long atmospheric paths at sunset scatter away shorter blue wavelengths, leaving longer red wavelengths to reach your eyes',
    causalKeywords: ['wavelength', 'scatter', 'shorter', 'blue', 'longer', 'red', 'atmosphere', 'path'],
    roteTraps: ['1/lambda^4'],
    expectedMechanism:
      'Fine atmospheric particles scatter short blue wavelengths strongly (∝ 1/λ⁴); along the long horizon path at sunset, blue scatters out leaving red.',
    recommendedFollowUpLabel: 'Review Dispersion & Scattering',
    recommendedFollowUpView: 'island-detail',
  },
];

