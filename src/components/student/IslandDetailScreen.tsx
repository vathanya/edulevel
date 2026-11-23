import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Flame,
  FlaskConical,
  HelpCircle,
  Lock,
  ShieldCheck,
  Swords,
  X,
} from 'lucide-react';
import { ISLANDS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import type { ConceptNode, LearningStatus } from '../../types/edu';
import { IslandIllustration } from './IslandArt';
import { VERIFICATION_STATUS_STYLE } from './VerificationModal';

const STATUS_DISPLAY: Record<
  LearningStatus,
  { label: string; color: string; Icon: React.FC<{ className?: string }> }
> = {
  completed: { label: 'Completed', color: 'text-emerald-300', Icon: CheckCircle2 },
  'in-progress': { label: 'In Progress', color: 'text-cyan-300', Icon: Flame },
  available: { label: 'Available', color: 'text-amber-300', Icon: Compass },
  locked: { label: 'Locked', color: 'text-slate-400', Icon: Lock },
};

export const IslandDetailScreen: React.FC = () => {
  const {
    selectedIslandId,
    concepts,
    islandSummaries,
    verificationRecords,
    openVerificationModal,
    navigate,
    setSelectedConceptId,
  } = useEdu();

  const island = ISLANDS.find((i) => i.id === selectedIslandId) ?? ISLANDS[0];
  const islandConcepts = concepts.filter((c) => island.conceptIds.includes(c.id));
  const summary = islandSummaries[island.id];

  const [libraryConcept, setLibraryConcept] = useState<ConceptNode | null>(null);

  const destinations = [
    {
      id: 'library',
      title: 'Concept Notes',
      desc: 'Formulas & key ideas',
      Icon: BookOpen,
      accent: 'border-sky-400/30 bg-sky-500/10 text-sky-200 hover:border-sky-400/60',
      action: () => setLibraryConcept(islandConcepts[0] ?? null),
    },
    {
      id: 'lab',
      title: '3D Circuit Lab',
      desc: 'Live I = V / R bench',
      Icon: FlaskConical,
      accent: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/70',
      action: () => navigate('lab', { conceptId: 'ohms-law' }),
    },
    {
      id: 'arena',
      title: 'Challenge Arena',
      desc: 'Counterfactual trials',
      Icon: Swords,
      accent: 'border-rose-400/30 bg-rose-500/10 text-rose-200 hover:border-rose-400/60',
      action: () => navigate('counterfactual'),
    },
    {
      id: 'gate',
      title: 'Mastery Gate',
      desc: 'Explain to unlock',
      Icon: ShieldCheck,
      accent:
        'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60',
      action: () => navigate('mastery-gate'),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-8 py-6 sm:py-8 space-y-8">
      {/* Island Hero Banner */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0E1B3D] via-[#0B1530] to-[#0A1124] p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
              <span>{island.chapterTag}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{summary.mastery}% Mastery</span>
              <span aria-hidden="true">·</span>
              <span>
                {summary.completedConcepts}/{summary.totalConcepts} mastered
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
              {island.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              {island.subtitle}
            </p>

            {/* Progress bar */}
            <div className="max-w-md pt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${summary.mastery}%`,
                    backgroundColor: island.accentHex,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="w-52 sm:w-60">
              <IslandIllustration id={island.id} />
            </div>
          </div>
        </div>

        {/* Destinations */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          {destinations.map((dest) => {
            const Icon = dest.Icon;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={dest.action}
                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${dest.accent}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-display text-base font-bold text-white">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{dest.title}</span>
                  </div>
                  <p className="text-xs text-slate-300">{dest.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 mt-1 opacity-75" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Concept List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-white">Concepts</h2>
          <button
            type="button"
            onClick={() => navigate('mentor')}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/15 px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 cursor-pointer whitespace-nowrap"
          >
            <span>AI Mentor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {islandConcepts.map((concept, index) => {
            const statusMeta = STATUS_DISPLAY[concept.status];
            const StatusIcon = statusMeta.Icon;
            const isLocked = concept.status === 'locked';
            const verRecord = verificationRecords[concept.id];
            const verStatus = verRecord?.status ?? 'Learning in Progress';
            const verStyle = VERIFICATION_STATUS_STYLE[verStatus];

            return (
              <div
                key={concept.id}
                className={`rounded-2xl border p-5 sm:p-6 transition ${
                  isLocked
                    ? 'border-white/10 bg-[#0A1124]/70 opacity-85'
                    : 'border-white/15 bg-[#0D1733]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 lg:max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-mono text-slate-400">0{index + 1}.</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${statusMeta.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{statusMeta.label}</span>
                      </span>
                      {!isLocked && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verStyle.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${verStyle.dot}`} />
                          <span>{verStatus}</span>
                        </span>
                      )}
                      {concept.formula && (
                        <>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className="font-mono text-cyan-300">{concept.formula}</span>
                        </>
                      )}
                      {isLocked && concept.prerequisites.length > 0 && (
                        <>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className="text-slate-400">
                            Requires {concept.prerequisites.join(', ')}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="font-display text-xl font-bold text-white">
                      {concept.name}
                    </h3>
                    <p className="text-sm text-slate-300">{concept.shortDesc}</p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs">
                      {concept.activities.map((act) => (
                        <span
                          key={act.id}
                          className={`inline-flex items-center gap-1.5 ${
                            act.completed ? 'text-emerald-300' : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${
                              act.completed ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          />
                          <span>{act.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mastery & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-4 shrink-0">
                    <div className="w-full sm:w-48">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Mastery</span>
                        <span className="font-mono font-bold text-white tabular-nums">
                          {concept.mastery}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${concept.mastery}%`,
                            backgroundColor:
                              concept.mastery >= 75
                                ? '#34D399'
                                : concept.mastery >= 45
                                  ? '#38BDF8'
                                  : '#F59E0B',
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLibraryConcept(concept)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Notes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConceptId(concept.id);
                          navigate('lab', { conceptId: concept.id });
                        }}
                        disabled={isLocked}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap ${
                          isLocked
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer'
                        }`}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        <span>3D Lab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConceptId(concept.id);
                          navigate('questions', { conceptId: concept.id });
                        }}
                        disabled={isLocked}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap ${
                          isLocked
                            ? 'border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                            : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 cursor-pointer'
                        }`}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Practice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openVerificationModal(concept.id)}
                        disabled={isLocked}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap ${
                          isLocked
                            ? 'border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                            : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 cursor-pointer'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Verify</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Concept Notes Modal */}
      {libraryConcept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0E1730] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-medium text-cyan-300">{island.name}</div>
                <h3 className="font-display text-2xl font-bold text-white mt-1">
                  {libraryConcept.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLibraryConcept(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close Notes"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {libraryConcept.formula && (
              <div className="rounded-xl border border-cyan-400/25 bg-[#091228] px-4 py-3 font-mono text-sm text-cyan-300">
                Formula: {libraryConcept.formula}
              </div>
            )}

            <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
              {libraryConcept.librarySummary.map((line, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-cyan-400 mt-1">
                    0{idx + 1}.
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <strong className="font-semibold">Key Takeaway:</strong>{' '}
              {libraryConcept.keyTakeaway}
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const id = libraryConcept.id;
                  setLibraryConcept(null);
                  navigate('lab', { conceptId: id });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Open 3D Lab</span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryConcept(null)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
