import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import type { TeacherStudentRecord } from '../../types/edu';

interface TeacherInsightsSectionProps {
  onInspectStudent: (student: TeacherStudentRecord) => void;
  onSelectConcept: (conceptId: string) => void;
}

export const TeacherInsightsSection: React.FC<TeacherInsightsSectionProps> = ({
  onInspectStudent,
  onSelectConcept,
}) => {
  const { teacherInsights, appliedSuggestionIds, toggleSuggestionApplied } = useEdu();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Verification, Improvement &amp; AI Teaching Insights
          </h2>
          <p className="text-xs text-slate-400">
            Live cohort alerts for repeated struggles, accelerated gains, and unverified conceptual understanding
          </p>
        </div>
      </div>

      {/* 3-Column Supplementary Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repeatedly Struggling */}
        <div className="rounded-xl border border-rose-500/25 bg-[#0F172A] p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Repeatedly Struggling ({teacherInsights.repeatedlyStruggling.length})</span>
          </h3>
          <div className="space-y-2">
            {teacherInsights.repeatedlyStruggling.map((stu) => (
              <button
                key={stu.id}
                type="button"
                onClick={() => onInspectStudent(stu)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B1222] px-3 py-2.5 text-left hover:border-rose-400/40 cursor-pointer transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {stu.name} <span className="font-mono text-slate-400">({stu.rollNo})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {stu.primaryMisconception}
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-rose-300 tabular-nums shrink-0">
                  {stu.conceptMastery.resistance ?? stu.overallMastery}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Significantly Improved */}
        <div className="rounded-xl border border-emerald-500/25 bg-[#0F172A] p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-emerald-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Significantly Improved ({teacherInsights.significantlyImproved.length})</span>
          </h3>
          <div className="space-y-2">
            {teacherInsights.significantlyImproved.map((entry) => (
              <button
                key={entry.student.id}
                type="button"
                onClick={() => onInspectStudent(entry.student)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B1222] px-3 py-2.5 text-left hover:border-emerald-400/40 cursor-pointer transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {entry.student.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{entry.focusArea}</div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums shrink-0">
                  +{entry.gainPercent}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Unverified Understanding */}
        <div className="rounded-xl border border-amber-500/25 bg-[#0F172A] p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-amber-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>Unverified Understanding ({teacherInsights.unverifiedUnderstanding.length})</span>
          </h3>
          <div className="space-y-2">
            {teacherInsights.unverifiedUnderstanding.map((entry) => (
              <button
                key={entry.student.id}
                type="button"
                onClick={() => onInspectStudent(entry.student)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B1222] px-3 py-2.5 text-left hover:border-amber-400/40 cursor-pointer transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {entry.student.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Needs 2-situation verification in {entry.gapConcept}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-amber-300 tabular-nums shrink-0">
                  {entry.masteryScore}% / {entry.reasoningScore}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Concepts Needing Classroom Attention + AI Teaching Suggestions */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>AI Teaching Suggestions &amp; Classroom Attention</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacherInsights.conceptsNeedingAttention.slice(0, 3).map((c) => (
              <button
                key={c.conceptId}
                type="button"
                onClick={() => onSelectConcept(c.conceptId)}
                className="rounded-lg border border-slate-700 bg-[#0B1222] px-2.5 py-1 text-[11px] text-slate-200 hover:border-indigo-400 cursor-pointer tabular-nums"
              >
                {c.label}: {c.avgMastery}% ({c.strugglingCount} flagged)
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teacherInsights.aiSuggestions.map((sug) => {
            const queued = appliedSuggestionIds.includes(sug.id);
            return (
              <div
                key={sug.id}
                className="rounded-xl border border-slate-800 bg-[#0B1222] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">{sug.conceptName}</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {sug.affectedCount} students
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{sug.insight}</p>
                  <p className="text-xs text-cyan-200 leading-relaxed pt-1">
                    {sug.suggestedAction}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSuggestionApplied(sug.id)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    queued
                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'bg-indigo-500 text-white hover:bg-indigo-400'
                  }`}
                >
                  {queued ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Queued for Class</span>
                    </>
                  ) : (
                    <span>Queue Teaching Action</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
