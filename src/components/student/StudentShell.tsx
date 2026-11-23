import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Brain,
  CalendarClock,
  CheckCheck,
  Compass,
  Flame,
  FlaskConical,
  Home,
  LineChart,
  LogOut,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { ASSETS } from '../../data/assets';
import { useEdu } from '../../context/EduContext';
import type { StudentView } from '../../types/edu';
import { SafeImage } from '../shared/SafeImage';
import { AchievementCelebrationModal } from './AchievementCelebrationModal';
import { VerificationModal } from './VerificationModal';

const NAV_ITEMS: Array<{
  id: StudentView;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'world', label: 'World', icon: Home },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'mentor', label: 'AI Mentor', icon: Brain },
  { id: 'lab', label: '3D Lab', icon: FlaskConical },
  { id: 'revision', label: 'Revision', icon: CalendarClock },
  { id: 'rewards', label: 'Rewards', icon: Award },
];

export const StudentShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    studentView,
    navigate,
    goBack,
    canGoBack,
    profile,
    updateProfile,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
    resetDemoProgress,
    setRole,
    toastMessage,
  } = useEdu();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifOpen(false);
  }, [studentView]);

  useEffect(() => {
    if (!notifOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications =
    notifFilter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1024]/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Brand + Back */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('world')}
              className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-lg cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
                <Compass className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
                EduLevel
              </span>
            </button>

            {canGoBack && studentView !== 'world' && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* Center: Clean Horizontal Nav */}
          <nav
            aria-label="Student Navigation"
            className="hidden lg:flex items-center gap-1 min-w-0"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                studentView === item.id ||
                (item.id === 'world' && studentView === 'island-detail');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-300'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('rewards')}
              className="hidden sm:inline-flex items-center gap-2 px-2 py-1 text-xs hover:text-white transition-colors cursor-pointer"
              title="Rewards"
            >
              <span className="font-semibold text-cyan-300 tabular-nums whitespace-nowrap">
                Lv {profile.level}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-amber-300 tabular-nums whitespace-nowrap">
                {profile.xp.toLocaleString()} XP
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-orange-300 tabular-nums whitespace-nowrap">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                {profile.streak}d
              </span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/15 bg-[#0E1730] p-4 shadow-2xl z-50">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-white">
                        Notification Centre
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNotifFilter('all')}
                          className={`rounded-md px-2 py-0.5 cursor-pointer ${
                            notifFilter === 'all'
                              ? 'bg-cyan-400/20 text-cyan-200 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All ({notifications.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifFilter('unread')}
                          className={`rounded-md px-2 py-0.5 cursor-pointer ${
                            notifFilter === 'unread'
                              ? 'bg-cyan-400/20 text-cyan-200 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Unread ({unreadCount})
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Mark read</span>
                      </button>
                      {notifications.some((n) => n.read) && (
                        <button
                          type="button"
                          onClick={clearReadNotifications}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-0.5">
                    {displayedNotifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        No unread notifications right now.
                      </p>
                    ) : (
                      displayedNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            navigate(n.targetView, n.conceptId ? { conceptId: n.conceptId } : undefined);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                            n.read
                              ? 'border-white/5 bg-white/[0.02] text-slate-400'
                              : 'border-cyan-400/25 bg-cyan-400/5 text-slate-100'
                          } hover:border-cyan-400/50`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white">{n.title}</span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {n.timeLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{n.detail}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Avatar -> Profile */}
            <button
              type="button"
              onClick={() => navigate('profile')}
              className={`flex items-center gap-2 rounded-xl border p-1 pr-2.5 transition cursor-pointer shrink-0 ${
                studentView === 'profile'
                  ? 'border-cyan-400 bg-cyan-400/15'
                  : 'border-white/15 bg-[#101935] hover:border-cyan-400/50'
              }`}
              title="Profile"
            >
              <SafeImage
                src={ASSETS.studentAvatar}
                alt={profile.name}
                width={1024}
                height={1024}
                fallbackLabel={profile.name}
                className="h-7 w-7 rounded-lg object-cover bg-slate-800 shrink-0"
              />
              <span className="hidden md:inline text-xs font-semibold text-white whitespace-nowrap">
                {profile.name.split(' ')[0]}
              </span>
            </button>
          </div>
        </div>

        {/* Tablet/Mobile Sub-Nav */}
        <div className="flex lg:hidden overflow-x-auto border-t border-white/5 px-4 py-1.5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              studentView === item.id ||
              (item.id === 'world' && studentView === 'island-detail');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-cyan-400/15 text-cyan-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0E1730] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 id="settings-title" className="font-display text-lg font-bold text-white">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Mentor Hints</div>
                  <div className="text-xs text-slate-400">Show tips below 50% mastery</div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.adaptiveHints}
                  onChange={(e) => updateProfile({ adaptiveHints: e.target.checked })}
                  className="h-4 w-4 accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Lab Audio</div>
                  <div className="text-xs text-slate-400">Feedback cues in simulations</div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.soundEffects}
                  onChange={(e) => updateProfile({ soundEffects: e.target.checked })}
                  className="h-4 w-4 accent-cyan-400 cursor-pointer"
                />
              </label>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">Daily Goal</span>
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {profile.dailyGoalMinutes} min
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={profile.dailyGoalMinutes}
                  onChange={(e) =>
                    updateProfile({ dailyGoalMinutes: Number(e.target.value) })
                  }
                  className="mt-2 w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    navigate('diagnostic');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Diagnostic</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setRole('teacher');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 cursor-pointer whitespace-nowrap"
                >
                  <span>Teacher View</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetDemoProgress();
                    setSettingsOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20 cursor-pointer"
                >
                  <span>Reset Demo Progress</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setRole(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Verification & Achievement Popups */}
      <VerificationModal />
      <AchievementCelebrationModal />

      {/* Global Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl border border-cyan-400/40 bg-[#0D1A38] px-4 py-3 text-sm font-medium text-cyan-100 shadow-2xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
