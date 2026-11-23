import React from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Flame,
  FlaskConical,
  Lock,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { ASSETS } from '../../data/assets';
import { ISLANDS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import { SafeImage } from '../shared/SafeImage';

export const RewardsScreen: React.FC = () => {
  const { profile, achievements, islandSummaries, navigate } = useEdu();

  const completedIslands = Object.values(islandSummaries).filter(
    (s) => s.status === 'completed',
  ).length;
  const levelProgress = Math.round(((profile.xp % 300) / 300) * 100);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
          <Trophy className="h-4 w-4" />
          <span>Milestones</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
          Rewards & Achievements
        </h1>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-cyan-400/25 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Level</div>
          <div className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
            Level {profile.level}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 font-mono tabular-nums">
            {profile.xp % 300} / 300 XP
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/25 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Total XP</div>
          <div className="font-mono text-3xl font-bold text-amber-300 mt-1 tabular-nums">
            {profile.xp.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-400/25 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Streak</div>
          <div className="font-display text-3xl font-bold text-orange-300 mt-1 flex items-center gap-2 tabular-nums">
            <Flame className="h-6 w-6 text-orange-400" />
            <span>{profile.streak}d</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/25 bg-[#0D1733] p-5">
          <div className="text-xs text-slate-400">Islands Completed</div>
          <div className="font-display text-3xl font-bold text-emerald-300 mt-1 tabular-nums">
            {completedIslands} / {ISLANDS.length - 1}
          </div>
        </div>
      </div>

      {/* Achievement Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${
              badge.unlocked
                ? 'border-cyan-400/35 bg-[#0E1B3B]'
                : 'border-white/10 bg-[#0A1124]/80 opacity-85'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-medium">{badge.category}</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    badge.unlocked ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {badge.unlocked ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Unlocked</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Locked</span>
                    </>
                  )}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-white mt-2 flex items-center gap-2">
                <Award
                  className={`h-5 w-5 shrink-0 ${
                    badge.unlocked ? 'text-amber-300' : 'text-slate-500'
                  }`}
                />
                <span>{badge.title}</span>
              </h2>
              <p className="text-sm text-slate-300 mt-1.5">{badge.description}</p>
              {badge.unlocked && badge.unlockReason && (
                <div className="mt-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  <span className="font-semibold">Earned: </span>
                  {badge.unlockReason}
                  {badge.unlockedAt ? ` (${badge.unlockedAt})` : ''}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">{badge.criteria}</span>
              <span className="font-mono font-semibold text-amber-300 shrink-0 tabular-nums">
                +{badge.xpBonus} XP
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Next Milestone */}
      <div className="rounded-2xl border border-white/15 bg-[#0D1733] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-white">
            Next: Ohm’s Gatekeeper (+350 XP)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete the 3D Lab, Condition Flip, and Mastery Gate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('lab')}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
        >
          <FlaskConical className="h-4 w-4" />
          <span>Open 3D Lab</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ProfileScreen: React.FC = () => {
  const {
    profile,
    overallMastery,
    weakestConcept,
    diagnosticCompleted,
    navigate,
    setRole,
  } = useEdu();

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="rounded-3xl border border-white/15 bg-[#0D1733] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <SafeImage
              src={ASSETS.studentAvatar}
              alt={profile.name}
              width={1024}
              height={1024}
              fallbackLabel={profile.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-cyan-400/50 bg-slate-800 shrink-0"
            />
            <div>
              <div className="text-xs font-medium text-cyan-300">
                Class 10 · Level {profile.level}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {profile.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5 font-mono">
                <span>{profile.xp.toLocaleString()} XP</span>
                <span aria-hidden="true">·</span>
                <span>{profile.streak}d streak</span>
                <span aria-hidden="true">·</span>
                <span>{overallMastery}% Mastery</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('diagnostic')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4" />
              <span>{diagnosticCompleted ? 'Retake Diagnostic' : 'Diagnostic'}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/35 bg-indigo-500/15 px-4 py-2.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 cursor-pointer whitespace-nowrap"
            >
              <span>Teacher View</span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/10">
          <div className="rounded-2xl border border-white/10 bg-[#091228] p-5 space-y-2">
            <div className="text-xs text-slate-400">Next Focus</div>
            <div className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-300" />
              <span>{weakestConcept.name} ({weakestConcept.mastery}%)</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('world')}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <span>Back to World</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#091228] p-5 space-y-1.5 text-xs text-slate-300">
            <div className="text-slate-400">Preferences</div>
            <div className="text-sm text-white font-medium">
              Daily Goal: {profile.dailyGoalMinutes} min
            </div>
            <div>Mentor Hints: {profile.adaptiveHints ? 'On' : 'Off'}</div>
            <div>
              Diagnostic: {diagnosticCompleted ? 'Completed' : 'Pending'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
