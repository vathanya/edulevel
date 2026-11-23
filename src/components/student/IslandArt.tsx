import React from 'react';
import type { IslandId } from '../../types/edu';

export const IslandIllustration: React.FC<{ id: IslandId; locked?: boolean }> = ({
  id,
  locked = false,
}) => {
  const filterClass = locked ? 'grayscale opacity-75' : '';

  switch (id) {
    case 'electricity':
      return (
        <svg
          viewBox="0 0 260 190"
          className={`w-full h-auto drop-shadow-[0_14px_24px_rgba(14,165,233,0.35)] ${filterClass}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="elecRock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5E3C" />
              <stop offset="55%" stopColor="#5C3A21" />
              <stop offset="100%" stopColor="#2D1B12" />
            </linearGradient>
            <linearGradient id="elecTurf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="elecDome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* Floating rock underside */}
          <polygon points="35,105 225,105 190,152 145,178 108,175 68,148" fill="url(#elecRock)" />
          <polygon points="68,148 108,175 118,125 65,112" fill="#432818" opacity="0.65" />
          <polygon points="155,118 190,152 145,178 140,124" fill="#3A2214" opacity="0.55" />
          {/* Lush Island Cap */}
          <ellipse cx="130" cy="103" rx="98" ry="28" fill="url(#elecTurf)" />
          <ellipse cx="130" cy="98" rx="90" ry="22" fill="#4ADE80" opacity="0.45" />
          {/* Lab Dome Building */}
          <rect x="78" y="64" width="64" height="32" rx="6" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
          <path d="M84,64 A26,24 0 0,1 136,64 Z" fill="url(#elecDome)" />
          <rect x="92" y="74" width="12" height="14" rx="2" fill="#38BDF8" />
          <rect x="114" y="74" width="12" height="14" rx="2" fill="#FBBF24" />
          {/* Copper Tesla / Coil Tower */}
          <rect x="164" y="40" width="12" height="54" rx="3" fill="#CBD5E1" />
          <rect x="158" y="48" width="24" height="5" rx="2" fill="#F59E0B" />
          <rect x="158" y="58" width="24" height="5" rx="2" fill="#F59E0B" />
          <rect x="158" y="68" width="24" height="5" rx="2" fill="#F59E0B" />
          <circle cx="170" cy="34" r="10" fill="#38BDF8" />
          <circle cx="170" cy="34" r="5" fill="#E0F2FE" />
          {/* Glowing Lightning Bolt & Energy Crystals */}
          <polygon points="167,11 159,24 167,24 163,34 177,20 169,20" fill="#FDE047" />
          <polygon points="48,96 56,74 64,96" fill="#22D3EE" />
          <polygon points="56,99 63,83 70,99" fill="#06B6D4" />
          <circle cx="46" cy="84" r="9" fill="#22C55E" />
          <circle cx="204" cy="86" r="11" fill="#16A34A" />
          <rect x="202" y="92" width="4" height="10" fill="#78350F" />
        </svg>
      );

    case 'light':
      return (
        <svg
          viewBox="0 0 240 180"
          className={`w-full h-auto drop-shadow-[0_14px_22px_rgba(245,158,11,0.3)] ${filterClass}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lightRock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>
          </defs>
          <polygon points="34,102 206,102 178,148 124,168 72,146" fill="url(#lightRock)" />
          <ellipse cx="120" cy="100" rx="88" ry="25" fill="#FBBF24" />
          <ellipse cx="120" cy="96" rx="76" ry="18" fill="#86EFAC" />
          {/* Crystal Prism Tower */}
          <polygon points="120,24 94,88 146,88" fill="#E0F2FE" opacity="0.92" stroke="#38BDF8" strokeWidth="2" />
          <polygon points="120,24 120,88 146,88" fill="#7DD3FC" opacity="0.55" />
          {/* Rainbow Refraction Beams */}
          <line x1="60" y1="54" x2="108" y2="58" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
          <line x1="133" y1="56" x2="188" y2="44" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="135" y1="60" x2="192" y2="57" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="136" y1="64" x2="190" y2="70" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Palm trees */}
          <rect x="65" y="72" width="5" height="22" fill="#78350F" />
          <ellipse cx="67" cy="70" rx="14" ry="7" fill="#10B981" />
          <rect x="165" y="74" width="5" height="20" fill="#78350F" />
          <ellipse cx="168" cy="72" rx="13" ry="7" fill="#059669" />
        </svg>
      );

    case 'magnetism':
      return (
        <svg
          viewBox="0 0 240 180"
          className={`w-full h-auto drop-shadow-[0_14px_22px_rgba(167,139,250,0.32)] ${filterClass}`}
          aria-hidden="true"
        >
          <polygon points="36,104 204,104 176,152 120,170 66,148" fill="#334155" />
          <polygon points="66,148 120,170 120,115 62,108" fill="#1E293B" />
          <ellipse cx="120" cy="102" rx="86" ry="24" fill="#6366F1" />
          <ellipse cx="120" cy="97" rx="76" ry="17" fill="#818CF8" opacity="0.7" />
          {/* Flux Rings */}
          <ellipse cx="120" cy="64" rx="54" ry="18" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="6 5" />
          <ellipse cx="120" cy="54" rx="68" ry="22" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 6" />
          {/* Giant Horseshoe Magnet Arch */}
          <path
            d="M88,92 L88,52 A32,32 0 0,1 152,52 L152,92"
            fill="none"
            stroke="#EF4444"
            strokeWidth="14"
            strokeLinecap="butt"
          />
          <path
            d="M120,20 A32,32 0 0,1 152,52 L152,92"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="14"
          />
          <rect x="81" y="84" width="14" height="11" fill="#E2E8F0" />
          <rect x="145" y="84" width="14" height="11" fill="#E2E8F0" />
          {/* Crystals */}
          <polygon points="55,94 62,68 70,94" fill="#A855F7" />
          <polygon points="175,94 182,72 190,94" fill="#38BDF8" />
        </svg>
      );

    case 'human-eye':
      return (
        <svg
          viewBox="0 0 240 180"
          className={`w-full h-auto drop-shadow-[0_14px_22px_rgba(52,211,153,0.28)] ${filterClass}`}
          aria-hidden="true"
        >
          <polygon points="38,104 202,104 170,148 118,166 66,144" fill="#1E293B" />
          <ellipse cx="120" cy="100" rx="84" ry="24" fill="#10B981" />
          <ellipse cx="120" cy="96" rx="72" ry="17" fill="#6EE7B7" opacity="0.6" />
          {/* Optical Temple Pillars & Lens Observatory */}
          <rect x="76" y="72" width="88" height="22" rx="4" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
          <ellipse cx="120" cy="54" rx="34" ry="20" fill="#E0F2FE" stroke="#10B981" strokeWidth="3" />
          <circle cx="120" cy="54" r="13" fill="#0284C7" />
          <circle cx="120" cy="54" r="6" fill="#0F172A" />
          <circle cx="116" cy="50" r="2.5" fill="#FFFFFF" />
          {/* Mist / Trees */}
          <circle cx="56" cy="84" r="10" fill="#059669" />
          <circle cx="184" cy="84" r="10" fill="#059669" />
        </svg>
      );

    case 'challenge-arena':
      return (
        <svg
          viewBox="0 0 240 180"
          className={`w-full h-auto drop-shadow-[0_14px_22px_rgba(251,113,133,0.3)] ${filterClass}`}
          aria-hidden="true"
        >
          <polygon points="36,106 204,106 176,152 120,170 68,148" fill="#475569" />
          <ellipse cx="120" cy="104" rx="86" ry="24" fill="#FDE68A" />
          {/* Colosseum Arena Wall */}
          <path
            d="M58,86 A62,22 0 0,0 182,86 L182,62 A62,22 0 0,1 58,62 Z"
            fill="#CBD5E1"
            stroke="#94A3B8"
            strokeWidth="2"
          />
          <ellipse cx="120" cy="62" rx="62" ry="20" fill="#1E293B" stroke="#FB7185" strokeWidth="3" />
          <ellipse cx="120" cy="64" rx="44" ry="12" fill="#F59E0B" opacity="0.25" />
          {/* Torch Pillars & Trophy */}
          <rect x="66" y="42" width="8" height="24" fill="#E2E8F0" />
          <circle cx="70" cy="38" r="5" fill="#FB923C" />
          <rect x="166" y="42" width="8" height="24" fill="#E2E8F0" />
          <circle cx="170" cy="38" r="5" fill="#FB923C" />
          {/* Central Trophy Cup */}
          <path d="M112,50 L128,50 L124,62 L116,62 Z" fill="#FACC15" />
          <rect x="117" y="62" width="6" height="6" fill="#EAB308" />
        </svg>
      );
  }
};
