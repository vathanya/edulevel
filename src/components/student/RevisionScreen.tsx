import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Play,
  X,
} from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import type { ConceptNode } from '../../types/edu';

const CALENDAR_DAYS = [
  { day: 'Fri', date: 'Nov 20', load: 'Overdue' },
  { day: 'Sat', date: 'Nov 21', load: '2 Due', active: true },
  { day: 'Sun', date: 'Nov 22', load: '1 Due' },
  { day: 'Mon', date: 'Nov 23', load: '2 Due' },
  { day: 'Tue', date: 'Nov 24', load: '1 Due' },
  { day: 'Wed', date: 'Nov 25', load: '1 Due' },
  { day: 'Thu', date: 'Nov 26', load: 'Review' },
];

export const RevisionScreen: React.FC = () => {
  const { concepts, completeRevisionCheck, navigate } = useEdu();
  const [activeRevision, setActiveRevision] = useState<ConceptNode | null>(null);
  const [recallNote, setRecallNote] = useState<string>('');
  const [revealed, setRevealed] = useState<boolean>(false);

  const overdue = concepts.filter(
    (c) => c.revisionUrgency === 'overdue' && c.status !== 'locked',
  );
  const dueToday = concepts.filter(
    (c) => c.revisionUrgency === 'due-today' && c.status !== 'locked',
  );
  const upcoming = concepts.filter(
    (c) =>
      (c.revisionUrgency === 'upcoming' || c.revisionUrgency === 'stable') &&
      c.status !== 'locked',
  );

  const openRevision = (concept: ConceptNode) => {
    setActiveRevision(concept);
    setRecallNote('');
    setRevealed(false);
  };

  const renderGroup = (
    title: string,
    items: ConceptNode[],
    accent: string,
    Icon: React.FC<{ className?: string }>,
  ) => (
    <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`font-display text-lg font-bold flex items-center gap-2 ${accent}`}>
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </h2>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#091228] p-4 text-xs text-slate-400">
          Nothing scheduled.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-white/10 bg-[#091228] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-display text-base font-bold text-white">{c.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {c.retention}% retention
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Practiced {c.lastPracticedLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Next: {c.nextRevisionDate}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openRevision(c)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Review</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
          <CalendarClock className="h-4 w-4" />
          <span>Spaced Repetition</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
          Revision Schedule
        </h1>
      </div>

      {/* Week Strip */}
      <section className="rounded-2xl border border-white/15 bg-[#0D1733] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
          <Calendar className="h-4 w-4 text-cyan-300" />
          <span>This Week</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CALENDAR_DAYS.map((d) => (
            <div
              key={d.date}
              className={`rounded-xl border p-3 ${
                d.active
                  ? 'border-cyan-400 bg-cyan-400/15'
                  : 'border-white/10 bg-[#091228]'
              }`}
            >
              <div className="text-xs text-slate-400">{d.day}</div>
              <div className="font-display text-sm font-bold text-white mt-0.5">
                {d.date}
              </div>
              <div
                className={`text-[11px] mt-1 font-medium ${
                  d.load === 'Overdue'
                    ? 'text-rose-300'
                    : d.active
                      ? 'text-cyan-300'
                      : 'text-slate-400'
                }`}
              >
                {d.load}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Queues */}
      <div className="grid grid-cols-1 gap-5">
        {renderGroup('Overdue', overdue, 'text-rose-300', AlertCircle)}
        {renderGroup('Due Today', dueToday, 'text-amber-300', CalendarClock)}
        {renderGroup('Upcoming', upcoming, 'text-emerald-300', CheckCircle2)}
      </div>

      {/* Active Recall Modal */}
      {activeRevision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-cyan-400/30 bg-[#0E1730] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs text-cyan-300 font-medium">
                  Active Recall · {activeRevision.name}
                </div>
                <h3 className="font-display text-xl font-bold text-white mt-0.5">
                  Explain Without Looking
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRevision(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close revision modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={recallNote}
              onChange={(e) => setRecallNote(e.target.value)}
              placeholder={`Write the core principle for ${activeRevision.name}...`}
              className="w-full rounded-xl border border-white/15 bg-[#080F22] p-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />

            {!revealed ? (
              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const id = activeRevision.id;
                    setActiveRevision(null);
                    navigate('lab', { conceptId: id });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Open 3D Lab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
                >
                  Show Answer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 space-y-1">
                  {activeRevision.formula && (
                    <div className="font-mono text-xs text-cyan-300">
                      {activeRevision.formula}
                    </div>
                  )}
                  <p>{activeRevision.keyTakeaway}</p>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      completeRevisionCheck(activeRevision.id, false);
                      setActiveRevision(null);
                    }}
                    className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
                  >
                    Review Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      completeRevisionCheck(activeRevision.id, true);
                      setActiveRevision(null);
                    }}
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                  >
                    Got It (+XP)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
