export interface SyllabusTopic {
  id: string;
  name: string;
  chapter: string;
  formulas: string[];
  coreFacts: string[];
  commonMisconceptions: string[];
}

export interface ExperimentCatalogItem {
  experimentId:
    | 'ohms-law-bench'
    | 'resistance-rheostat'
    | 'series-parallel-explorer'
    | 'optics-prism-lab'
    | 'solenoid-field-lab';
  title: string;
  conceptIds: string[];
  defaultObjective: string;
  variables: string[];
}

export const SYLLABUS_TOPICS: Record<string, SyllabusTopic> = {
  'electric-current': {
    id: 'electric-current',
    name: 'Electric Current',
    chapter: 'Class 10 Electricity (Chapter 11)',
    formulas: ['I = Q / t', '1 A = 1 C / 1 s'],
    coreFacts: [
      'Electric current (I) is the rate of flow of electric charge (Q) across a conductor cross-section per unit time (t).',
      'SI unit is Ampere (A), measured by a low-resistance Ammeter connected in series.',
      'Conventional current direction is from positive terminal to negative terminal, opposite to electron drift.',
    ],
    commonMisconceptions: [
      'Confusing total charge Q with rate of charge flow I = Q / t.',
      'Forgetting to convert minutes into seconds before calculating Q = I × t.',
    ],
  },
  'potential-difference': {
    id: 'potential-difference',
    name: 'Potential Difference',
    chapter: 'Class 10 Electricity (Chapter 11)',
    formulas: ['V = W / Q', '1 V = 1 J / 1 C'],
    coreFacts: [
      'Potential difference (V) is work done per unit positive charge moved between two points in a circuit.',
      'SI unit is Volt (V), measured by a high-resistance Voltmeter connected in parallel.',
      'A cell or battery maintains potential difference across terminals to drive charges.',
    ],
    commonMisconceptions: [
      'Treating voltage as something that flows through wires instead of electrical potential difference across points.',
      'Connecting a voltmeter in series instead of parallel.',
    ],
  },
  resistance: {
    id: 'resistance',
    name: 'Resistance',
    chapter: 'Class 10 Electricity (Chapter 11)',
    formulas: ['R = V / I', 'R = ρ · (L / A)'],
    coreFacts: [
      'Resistance (R) is the opposition offered by conductor atoms/ions to drifting electrons.',
      'SI unit is Ohm (Ω). Resistance increases with length (L), decreases with cross-sectional area (A), and depends on material resistivity (ρ) and temperature.',
      'At constant potential difference, increasing resistance decreases current inversely (I = V / R).',
    ],
    commonMisconceptions: [
      'Assuming higher resistance increases current or pushes more electricity through a circuit.',
      'Believing resistance changes only when battery voltage changes rather than depending on conductor geometry and material.',
    ],
  },
  'ohms-law': {
    id: 'ohms-law',
    name: "Ohm's Law",
    chapter: 'Class 10 Electricity (Chapter 11)',
    formulas: ['V = I · R', 'I = V / R', 'R = V / I'],
    coreFacts: [
      'At constant temperature, current through an ohmic metallic conductor is directly proportional to potential difference across its ends (V ∝ I).',
      'On a V (y-axis) vs I (x-axis) graph, the straight-line slope ΔV / ΔI equals resistance R.',
      'A non-ohmic filament lamp heats up at high current, raising R and curving the V-I graph.',
    ],
    commonMisconceptions: [
      'Inverting the rearrangement as R = I / V or multiplying V × R to compute current.',
      'Assuming Ohm’s Law holds even when conductor temperature changes sharply.',
    ],
  },
  'series-parallel': {
    id: 'series-parallel',
    name: 'Series and Parallel Circuits',
    chapter: 'Class 10 Electricity (Chapter 11)',
    formulas: ['Rs = R1 + R2 + ...', '1/Rp = 1/R1 + 1/R2 + ...'],
    coreFacts: [
      'In series, current is identical through every resistor and total potential difference divides proportionally (V = V1 + V2).',
      'In parallel, each branch receives the full supply potential difference and total current divides across branches (I = I1 + I2).',
      'Adding resistors in parallel decreases total equivalent resistance below the smallest individual branch resistance.',
    ],
    commonMisconceptions: [
      'Adding parallel resistances directly like series resistances (Rp = R1 + R2).',
      'Thinking current splits equally in parallel branches even when branch resistances differ.',
    ],
  },
  'reflection-mirrors': {
    id: 'reflection-mirrors',
    name: 'Spherical Mirrors',
    chapter: 'Class 10 Light — Reflection and Refraction (Chapter 9)',
    formulas: ['1/f = 1/v + 1/u', 'm = h_i / h_o = -v / u', 'R = 2f'],
    coreFacts: [
      'Concave mirrors converge parallel rays at principal focus F and form real inverted images except when object is between P and F.',
      'Convex mirrors diverge rays and always form virtual, erect, diminished images.',
      'Under New Cartesian sign convention, object distance u is negative, concave focal length is negative, convex focal length is positive.',
    ],
    commonMisconceptions: [
      'Dropping negative signs for u or concave focal length f in mirror formula problems.',
      'Assuming convex mirrors can form real inverted images.',
    ],
  },
  'refraction-lenses': {
    id: 'refraction-lenses',
    name: 'Refraction & Lenses',
    chapter: 'Class 10 Light — Reflection and Refraction (Chapter 9)',
    formulas: ['n = sin i / sin r = c / v', '1/f = 1/v - 1/u', 'P = 1 / f(m)'],
    coreFacts: [
      'Light bends toward the normal when entering an optically denser medium because its speed decreases.',
      'Convex lens focal length and power (+D) are positive; concave lens focal length and power (-D) are negative.',
    ],
    commonMisconceptions: [
      'Using the mirror sign (+) in the lens formula 1/f = 1/v - 1/u.',
      'Forgetting to convert focal length from centimetres to metres before calculating Dioptre power P = 1/f.',
    ],
  },
  'magnetic-fields': {
    id: 'magnetic-fields',
    name: 'Magnetic Field & Solenoid',
    chapter: 'Class 10 Magnetic Effects of Electric Current (Chapter 12)',
    formulas: ['Right-Hand Thumb Rule', 'B inside solenoid is uniform'],
    coreFacts: [
      'Magnetic field lines emerge from North pole and enter South pole outside a magnet, forming closed continuous loops that never intersect.',
      'Inside a long current-carrying solenoid, field lines are parallel and equidistant (uniform magnetic field).',
    ],
    commonMisconceptions: [
      'Thinking magnetic field lines intersect at strong poles.',
      'Confusing magnetic field direction inside vs outside a solenoid.',
    ],
  },
  electromagnetism: {
    id: 'electromagnetism',
    name: 'Force on Conductor & Induction',
    chapter: 'Class 10 Magnetic Effects of Electric Current (Chapter 12)',
    formulas: ["Fleming's Left-Hand Rule: Thumb = Force, Forefinger = Field, Middle = Current"],
    coreFacts: [
      'A current-carrying conductor placed perpendicular to a magnetic field experiences maximum force.',
      'Domestic circuits connect appliances in parallel with live (red/brown), neutral (black/blue), and earth (green) wires plus fuse/MCB protection.',
    ],
    commonMisconceptions: [
      'Using right-hand rule for motor force instead of Fleming’s Left-Hand Rule.',
    ],
  },
  'vision-defects': {
    id: 'vision-defects',
    name: 'Accommodation & Vision Defects',
    chapter: 'Class 10 The Human Eye and the Colourful World (Chapter 10)',
    formulas: ['Near point (normal eye) = 25 cm', 'Far point = infinity'],
    coreFacts: [
      'Ciliary muscles adjust eye-lens curvature (accommodation) to focus near and distant objects on the retina.',
      'Myopia (near-sightedness) focuses distant light in front of retina and is corrected with a concave (diverging) lens.',
      'Hypermetropia (far-sightedness) focuses near light behind retina and is corrected with a convex (converging) lens.',
    ],
    commonMisconceptions: [
      'Swapping concave and convex corrective lenses for myopia and hypermetropia.',
    ],
  },
  'dispersion-scattering': {
    id: 'dispersion-scattering',
    name: 'Prism Dispersion & Scattering',
    chapter: 'Class 10 The Human Eye and the Colourful World (Chapter 10)',
    formulas: ['Deviation increases as wavelength decreases (Violet > Red)'],
    coreFacts: [
      'White light splits into VIBGYOR in a prism because glass has slightly different refractive indices for different wavelengths.',
      'Fine atmospheric particles scatter shorter blue wavelengths much more than red light, making the clear sky appear blue.',
    ],
    commonMisconceptions: [
      'Thinking red light bends more than violet light in a glass prism.',
    ],
  },
};

export const EXPERIMENT_CATALOG: ExperimentCatalogItem[] = [
  {
    experimentId: 'resistance-rheostat',
    title: '3D Ohm’s Law Rheostat & Current Bench',
    conceptIds: ['resistance', 'electric-current'],
    defaultObjective:
      'Hold battery voltage constant and sweep the rheostat resistance from 2 Ω to 20 Ω to observe inverse I = V / R behavior.',
    variables: ['Resistance (R in Ω)', 'Circuit Switch', 'Ammeter reading (I in A)'],
  },
  {
    experimentId: 'ohms-law-bench',
    title: '3D V-I Proportionality Bench',
    conceptIds: ['ohms-law', 'potential-difference'],
    defaultObjective:
      'Keep resistor R constant at 6 Ω and step battery voltage from 6 V to 24 V while logging ammeter readings and bulb brightness.',
    variables: ['Voltage (V in V)', 'Fixed Resistance (R in Ω)', 'Power output (P in W)'],
  },
  {
    experimentId: 'series-parallel-explorer',
    title: 'Series & Parallel Load Explorer',
    conceptIds: ['series-parallel'],
    defaultObjective:
      'Compare total current drawn across equivalent single and parallel resistances on the circuit bench.',
    variables: ['Effective Resistance (Ω)', 'Supply Voltage (V)', 'Branch Current (A)'],
  },
  {
    experimentId: 'optics-prism-lab',
    title: 'Light & Lens Ray Explorer',
    conceptIds: ['reflection-mirrors', 'refraction-lenses', 'vision-defects', 'dispersion-scattering'],
    defaultObjective:
      'Compare focal behavior and wavelength bending before verifying with concept practice.',
    variables: ['Focal length / curvature', 'Angle of incidence', 'Medium refractive index'],
  },
  {
    experimentId: 'solenoid-field-lab',
    title: 'Solenoid & Conductor Field Explorer',
    conceptIds: ['magnetic-fields', 'electromagnetism'],
    defaultObjective:
      'Observe how current magnitude controls magnetic field strength and force direction.',
    variables: ['Coil Current (I)', 'Current Direction', 'Turns per unit length'],
  },
];

export function getSyllabusContext(conceptId: string): SyllabusTopic {
  return SYLLABUS_TOPICS[conceptId] ?? SYLLABUS_TOPICS['ohms-law'];
}
