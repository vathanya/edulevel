import React from 'react';
import { Award, Sparkles, Trophy, X } from 'lucide-react';
import { useEdu } from '../../context/EduContext';

const CONFETTI_PARTICLES = [
  { left: '8%', top: '14%', color: '#38BDF8', delay: '0s', rotate: '18deg' },
  { left: '18%', top: '8%', color: '#34D399', delay: '0.1s', rotate: '-24deg' },
  { left: '30%', top: '12%', color: '#FBBF24', delay: '0.18s', rotate: '42deg' },
  { left: '46%', top: '6%', color: '#A78BFA', delay: '0.08s', rotate: '-15deg' },
  { left: '62%', top: '10%', color: '#FB7185', delay: '0.14s', rotate: '28deg' },
  { left: '76%', top: '8%', color: '#38BDF8', delay: '0.22s', rotate: '-35deg' },
  { left: '88%', top: '16%', color: '#FBBF24', delay: '0.05s', rotate: '20deg' },
  { left: '14%', top: '76%', color: '#FBBF24', delay: '0.2s', rotate: '-28deg' },
  { left: '84%', top: '78%', color: '#34D399', delay: '0.12s', rotate: '34deg' },
  { left: '50%', top: '84%', color: '#38BDF8', delay: '0.16s', rotate: '-12deg' },
];

export const AchievementCelebrationModal: React.FC = () => {
  const { pendingAchievement, dismissAchievementPopup, navigate } = useEdu();

  if (!pendingAchievement) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-popup-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/45 bg-gradient-to-b from-[#132248] via-[#0E1730] to-[#0A1024] p-7 text-center shadow-2xl">
        {/* Confetti / Particle Burst Layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {CONFETTI_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute h-2.5 w-2.5 rounded-sm animate-bounce opacity-85"
              style={{
                left: p.left,
                top: p.top,
                backgroundColor: p.color,
                animationDelay: p.delay,
                transform: `rotate(${p.rotate})`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={dismissAchievementPopup}
          aria-label="Dismiss achievement popup"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-400/15 text-amber-300 shadow-lg">
          <Trophy className="h-8 w-8" />
        </div>

        <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Achievement Unlocked · {pendingAchievement.category}</span>
        </div>

        <h2
          id="achievement-popup-title"
          className="relative mt-3 font-display text-2xl font-bold text-white"
        >
          {pendingAchievement.title}
        </h2>

        <p className="relative mt-2 text-sm text-slate-200 leading-relaxed">
          {pendingAchievement.unlockReason ?? pendingAchievement.description}
        </p>

        <div className="relative mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 font-mono text-sm font-bold text-amber-300 tabular-nums">
          <Award className="h-4 w-4" />
          <span>+{pendingAchievement.xpBonus} XP Earned</span>
        </div>

        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              dismissAchievementPopup();
              navigate('rewards');
            }}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
          >
            View Rewards
          </button>
          <button
            type="button"
            onClick={dismissAchievementPopup}
            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
};
