import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Compass,
  FlaskConical,
  GraduationCap,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ASSETS } from '../data/assets';
import { useEdu } from '../context/EduContext';
import { SafeImage } from './shared/SafeImage';

export const LoginScreen: React.FC = () => {
  const { setRole, navigate } = useEdu();
  const [enteringRole, setEnteringRole] = useState<'student' | 'teacher' | null>(null);

  const handleEnter = (role: 'student' | 'teacher', startDiagnostic = false) => {
    setEnteringRole(role);
    window.setTimeout(() => {
      setRole(role);
      if (role === 'student' && startDiagnostic) {
        navigate('diagnostic');
      }
      setEnteringRole(null);
    }, 220);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B19] text-slate-100 flex flex-col justify-between">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <SafeImage
          src={ASSETS.worldBackdrop}
          alt=""
          width={1376}
          height={768}
          variant="backdrop"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B19]/80 via-[#0B122A]/70 to-[#070B19]" />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20">
            <Compass className="h-5 w-5 text-slate-950" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
            EduLevel
          </span>
        </div>
        <span className="text-sm text-slate-400">Class 10 Physics</span>
      </header>

      {/* Main Hero + Role Selection */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Hero */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-white [text-wrap:balance]">
              Your Mind. Your World. Your Way to Mastery.
            </h1>
            <p className="max-w-lg text-base sm:text-lg leading-relaxed text-slate-300">
              Interactive 3D physics labs, adaptive reasoning practice, and live class analytics.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/10 text-sm text-slate-300">
              <span className="font-display font-semibold text-white">5 Islands</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-display font-semibold text-white">Live 3D Circuit Lab</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-display font-semibold text-white">30-Student Analytics</span>
            </div>
          </div>

          {/* Right Role Cards */}
          <div className="lg:col-span-6 grid grid-cols-1 gap-5">
            {/* Student Card */}
            <div className="rounded-2xl border border-cyan-400/25 bg-[#0E1730]/92 p-6 transition-colors hover:border-cyan-400/55">
              <div className="flex items-center gap-4">
                <SafeImage
                  src={ASSETS.studentAvatar}
                  alt="Student Avatar"
                  width={1024}
                  height={1024}
                  fallbackLabel="AV"
                  className="h-14 w-14 rounded-xl object-cover border border-cyan-400/40 bg-slate-800 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Student</span>
                    <span aria-hidden="true">·</span>
                    <span>Aanya Verma (Class 10)</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mt-0.5">
                    Student Learning World
                  </h2>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleEnter('student', false)}
                  disabled={enteringRole !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer whitespace-nowrap"
                >
                  <FlaskConical className="h-4 w-4" />
                  <span>
                    {enteringRole === 'student' ? 'Launching...' : 'Enter Student'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleEnter('student', true)}
                  disabled={enteringRole !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Start Diagnostic</span>
                </button>
              </div>
            </div>

            {/* Teacher Card */}
            <div className="rounded-2xl border border-indigo-400/25 bg-[#0E1730]/92 p-6 transition-colors hover:border-indigo-400/55">
              <div className="flex items-center gap-4">
                <SafeImage
                  src={ASSETS.teacherAvatar}
                  alt="Teacher Avatar"
                  width={1024}
                  height={1024}
                  fallbackLabel="ED"
                  className="h-14 w-14 rounded-xl object-cover border border-indigo-400/40 bg-slate-800 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Teacher</span>
                    <span aria-hidden="true">·</span>
                    <span>Class 10A (30 Students)</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mt-0.5">
                    Teacher Analytics Console
                  </h2>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleEnter('teacher', false)}
                  disabled={enteringRole !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 cursor-pointer whitespace-nowrap"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>
                    {enteringRole === 'teacher' ? 'Opening...' : 'Enter Teacher'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 text-xs text-slate-500">
        <span>EduLevel · Class 10 Physics</span>
      </footer>
    </div>
  );
};
