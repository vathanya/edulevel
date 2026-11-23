import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flame,
  FlaskConical,
  Lock,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { ISLANDS } from '../../data/mockData';
import { useEdu } from '../../context/EduContext';
import type { IslandId, LearningStatus } from '../../types/edu';
import { IslandIllustration } from './IslandArt';

const ISLAND_COORDS: Record<IslandId, { x: number; y: number; z: number; scale: number }> = {
  electricity: { x: 0, y: 1.65, z: 2.35, scale: 1.15 },
  light: { x: -7.1, y: 1.45, z: 0.45, scale: 1.04 },
  magnetism: { x: 7.1, y: 1.5, z: 0.35, scale: 1.04 },
  'human-eye': { x: -4.6, y: 2.15, z: -5.6, scale: 0.98 },
  'challenge-arena': { x: 4.8, y: 2.05, z: -5.4, scale: 1.06 },
};

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 9.8, 17.4);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 1.0, -1.1);

const STATUS_META: Record<
  LearningStatus,
  {
    label: string;
    dotClass: string;
    colorClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  completed: {
    label: 'Completed',
    dotClass: 'bg-emerald-400',
    colorClass: 'text-emerald-300',
    Icon: CheckCircle2,
  },
  'in-progress': {
    label: 'In Progress',
    dotClass: 'bg-cyan-400',
    colorClass: 'text-cyan-300',
    Icon: Flame,
  },
  available: {
    label: 'Available',
    dotClass: 'bg-amber-400',
    colorClass: 'text-amber-300',
    Icon: Compass,
  },
  locked: {
    label: 'Locked',
    dotClass: 'bg-slate-400',
    colorClass: 'text-slate-400',
    Icon: Lock,
  },
};

interface WorldTextures {
  rockTex: THREE.CanvasTexture;
  circuitTex: THREE.CanvasTexture;
  tileTex: THREE.CanvasTexture;
  irisTex: THREE.CanvasTexture;
  waterTex: THREE.CanvasTexture;
  dispose: () => void;
}

function createWorldTextures(): WorldTextures {
  const makeTex = (size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) draw(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };

  // Stratified fantasy cliff texture
  const rockTex = makeTex(256, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#7c5338');
    grad.addColorStop(0.5, '#593825');
    grad.addColorStop(1, '#3b2417');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    for (let y = 10; y < s; y += 22) {
      ctx.fillStyle = y % 44 === 10 ? 'rgba(255,215,170,0.08)' : 'rgba(15,10,8,0.16)';
      ctx.fillRect(0, y, s, 7);
    }
  });

  // Futuristic circuit deck texture for Electricity & Magnetism
  const circuitTex = makeTex(256, (ctx, s) => {
    ctx.fillStyle = '#071830';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
    ctx.lineWidth = 4;
    for (let i = 32; i < s; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(i, i, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Warm stone observatory & colosseum tile texture
  const tileTex = makeTex(256, (ctx, s) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= s; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
    }
  });

  // Biological iris texture for Human Eye Island centerpiece
  const irisTex = makeTex(256, (ctx, s) => {
    const cx = s / 2;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, s, s);
    const irisGrad = ctx.createRadialGradient(cx, cx, 22, cx, cx, 98);
    irisGrad.addColorStop(0, '#0f766e');
    irisGrad.addColorStop(0.65, '#14b8a6');
    irisGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cx, 98, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(204, 251, 241, 0.35)';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 34, cx + Math.sin(a) * 34);
      ctx.lineTo(cx + Math.cos(a) * 92, cx + Math.sin(a) * 92);
      ctx.stroke();
    }

    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(cx, cx, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx - 16, cx - 16, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  // Subtle caustic water shimmer texture
  const waterTex = makeTex(256, (ctx, s) => {
    ctx.fillStyle = '#09396e';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.16)';
    ctx.lineWidth = 2;
    for (let y = 16; y < s; y += 32) {
      ctx.beginPath();
      for (let x = 0; x <= s; x += 16) {
        const wy = y + Math.sin((x / s) * Math.PI * 4 + y) * 6;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  });
  waterTex.repeat.set(14, 14);

  return {
    rockTex,
    circuitTex,
    tileTex,
    irisTex,
    waterTex,
    dispose: () => {
      rockTex.dispose();
      circuitTex.dispose();
      tileTex.dispose();
      irisTex.dispose();
      waterTex.dispose();
    },
  };
}

interface PulseTarget {
  material: THREE.MeshStandardMaterial;
  baseIntensity: number;
  amp: number;
  speed: number;
  phase: number;
}

interface IslandBuildResult {
  group: THREE.Group;
  collider: THREE.Mesh;
  ring: THREE.Mesh;
  outerRing: THREE.Mesh;
  animatedParts: THREE.Object3D[];
  satellites: THREE.Object3D[];
  pulseTargets: PulseTarget[];
  lights: THREE.PointLight[];
}

function buildFloatingIslandGroup(
  id: IslandId,
  isLocked: boolean,
  textures: WorldTextures,
): IslandBuildResult {
  const group = new THREE.Group();
  const animatedParts: THREE.Object3D[] = [];
  const satellites: THREE.Object3D[] = [];
  const pulseTargets: PulseTarget[] = [];
  const lights: THREE.PointLight[] = [];

  const rockTint =
    id === 'magnetism'
      ? 0x7c72a6
      : id === 'challenge-arena'
        ? 0x6c6070
        : id === 'human-eye'
          ? 0x748078
          : 0xffffff;

  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.rockTex,
    color: rockTint,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
  });

  const turfColors: Record<IslandId, number> = {
    electricity: 0x0f766e,
    light: 0x10b981,
    magnetism: 0x4338ca,
    'human-eye': isLocked ? 0x475569 : 0x059669,
    'challenge-arena': 0xb45309,
  };

  const turfMat = new THREE.MeshStandardMaterial({
    color: turfColors[id],
    roughness: 0.65,
    metalness: 0.06,
  });

  // Multi-tier sculpted cliff underside
  const upperRock = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 1.95, 0.95, 11), rockMat);
  upperRock.position.y = -0.5;
  upperRock.castShadow = true;
  upperRock.receiveShadow = true;
  group.add(upperRock);

  const midRock = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.15, 0.9, 9), rockMat);
  midRock.position.y = -1.32;
  midRock.rotation.y = 0.35;
  midRock.castShadow = true;
  group.add(midRock);

  const lowerSpire = new THREE.Mesh(new THREE.ConeGeometry(1.12, 1.45, 7), rockMat);
  lowerSpire.rotation.x = Math.PI;
  lowerSpire.position.y = -2.42;
  lowerSpire.castShadow = true;
  group.add(lowerSpire);

  // Side boulder outcrops & underside energy crystal vein
  const outcropPositions: Array<[number, number, number, number]> = [
    [-1.7, -0.85, 0.75, 0.45],
    [1.65, -0.95, -0.7, 0.42],
    [0.2, -1.2, 1.4, 0.36],
  ];
  outcropPositions.forEach(([ox, oy, oz, os]) => {
    const outcrop = new THREE.Mesh(new THREE.DodecahedronGeometry(os, 0), rockMat);
    outcrop.position.set(ox, oy, oz);
    outcrop.scale.set(1.1, 1.4, 0.95);
    group.add(outcrop);
  });

  // Island top plateau cap + bevelled stone/sand rim
  const rimColors: Record<IslandId, number> = {
    electricity: 0x38bdf8,
    light: 0xfbbf24,
    magnetism: 0xa78bfa,
    'human-eye': isLocked ? 0x64748b : 0x34d399,
    'challenge-arena': 0xf59e0b,
  };
  const rimBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.62, 2.58, 0.16, 20),
    new THREE.MeshStandardMaterial({
      color: rimColors[id],
      roughness: 0.42,
      metalness: 0.35,
    }),
  );
  rimBand.position.y = -0.02;
  group.add(rimBand);

  const turfCap = new THREE.Mesh(new THREE.CylinderGeometry(2.58, 2.55, 0.32, 20), turfMat);
  turfCap.position.y = 0.08;
  turfCap.receiveShadow = true;
  group.add(turfCap);

  // Orbiting floating satellite rocks around each island
  const satOffsets: Array<[number, number, number, number]> = [
    [-3.05, -0.35, 1.1, 0.28],
    [3.15, 0.15, -0.95, 0.24],
    [0.9, -1.25, 2.75, 0.2],
  ];
  satOffsets.forEach(([sx, sy, sz, sr]) => {
    const sat = new THREE.Mesh(new THREE.DodecahedronGeometry(sr, 0), rockMat);
    sat.position.set(sx, sy, sz);
    group.add(sat);
    satellites.push(sat);
  });

  // Glowing dual selection halo rings around plateau
  const accentHex = rimColors[id];
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.82, 0.055, 10, 56),
    new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: id === 'electricity' ? 0.55 : 0.22,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  group.add(ring);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.025, 8, 56),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.14,
    }),
  );
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.06;
  group.add(outerRing);

  // Reusable stylized tree + glowing shrub helper
  const addTree = (tx: number, tz: number, scale = 1, tint = 0x16a34a, round = false) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0.24, tz);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07 * scale, 0.12 * scale, 0.52 * scale, 7),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }),
    );
    trunk.position.y = 0.24 * scale;
    tree.add(trunk);

    if (round) {
      const canopy = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.42 * scale, 1),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 0.65, flatShading: true }),
      );
      canopy.position.y = 0.68 * scale;
      tree.add(canopy);
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28 * scale, 1),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, flatShading: true }),
      );
      crown.position.set(0.14 * scale, 0.88 * scale, 0.08 * scale);
      tree.add(crown);
    } else {
      const leaves1 = new THREE.Mesh(
        new THREE.ConeGeometry(0.42 * scale, 0.72 * scale, 7),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 0.68, flatShading: true }),
      );
      leaves1.position.y = 0.68 * scale;
      tree.add(leaves1);

      const leaves2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.3 * scale, 0.56 * scale, 7),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.62, flatShading: true }),
      );
      leaves2.position.y = 1.04 * scale;
      tree.add(leaves2);
    }
    group.add(tree);
  };

  const addCrystal = (cx: number, cz: number, h: number, color: number) => {
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, h, 5),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isLocked ? 0.12 : 0.62,
        roughness: 0.18,
        metalness: 0.28,
      }),
    );
    crystal.position.set(cx, 0.24 + h / 2, cz);
    crystal.rotation.z = (cx > 0 ? -1 : 1) * 0.18;
    crystal.rotation.x = (cz > 0 ? 1 : -1) * 0.12;
    group.add(crystal);
  };

  if (id === 'electricity') {
    // Circuit-board laboratory deck with glowing pulsing traces
    const deckMat = new THREE.MeshStandardMaterial({
      map: textures.circuitTex,
      emissive: 0x0ea5e9,
      emissiveMap: textures.circuitTex,
      emissiveIntensity: 0.72,
      roughness: 0.34,
      metalness: 0.56,
    });
    pulseTargets.push({
      material: deckMat,
      baseIntensity: 0.72,
      amp: 0.42,
      speed: 3.4,
      phase: 0.2,
    });
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.2, 0.08, 18),
      deckMat,
    );
    deck.position.y = 0.26;
    deck.receiveShadow = true;
    group.add(deck);

    // Futuristic Electrical Research Lab Building + Glowing Front Entrance Portal
    const labGroup = new THREE.Group();
    labGroup.position.set(-0.72, 0.3, -0.15);
    const labWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.98, 0.74, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.28, metalness: 0.72 }),
    );
    labWall.position.y = 0.37;
    labWall.castShadow = true;
    labGroup.add(labWall);

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 1.05,
    });
    pulseTargets.push({
      material: windowMat,
      baseIntensity: 1.05,
      amp: 0.65,
      speed: 4.8,
      phase: 0.9,
    });
    const windowBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.16, 8),
      windowMat,
    );
    windowBand.position.y = 0.46;
    labGroup.add(windowBand);

    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.48,
      roughness: 0.2,
      metalness: 0.45,
    });
    pulseTargets.push({
      material: domeMat,
      baseIntensity: 0.48,
      amp: 0.34,
      speed: 3.9,
      phase: 1.7,
    });
    const labDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      domeMat,
    );
    labDome.position.y = 0.72;
    labGroup.add(labDome);

    // Lab Entrance Portal Archway (+Z front face) & Illuminated Walkway
    // Placed cleanly outside labWall outer radius (0.98) so cylinder walls never clip into doorway
    const entranceFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.28,
      metalness: 0.8,
    });
    const entranceGlowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.25,
      roughness: 0.18,
      metalness: 0.25,
    });
    pulseTargets.push({
      material: entranceGlowMat,
      baseIntensity: 1.25,
      amp: 0.75,
      speed: 5.2,
      phase: 0.4,
    });

    [-0.25, 0.25].forEach((px) => {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.56, 0.22),
        entranceFrameMat,
      );
      pylon.position.set(px, 0.28, 1.06);
      labGroup.add(pylon);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.48, 0.24),
        entranceGlowMat,
      );
      trim.position.set(px > 0 ? px - 0.045 : px + 0.045, 0.28, 1.06);
      labGroup.add(trim);
    });

    const portalHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.11, 0.24),
      entranceFrameMat,
    );
    portalHeader.position.set(0, 0.58, 1.06);
    labGroup.add(portalHeader);

    const portalArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.036, 8, 20, Math.PI),
      entranceGlowMat,
    );
    portalArch.position.set(0, 0.52, 1.1);
    labGroup.add(portalArch);

    const portalCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.9,
    });
    pulseTargets.push({
      material: portalCoreMat,
      baseIntensity: 1.15,
      amp: 0.65,
      speed: 4.2,
      phase: 1.1,
    });
    const portalCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.5, 0.08),
      portalCoreMat,
    );
    portalCore.position.set(0, 0.26, 1.02);
    labGroup.add(portalCore);

    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.04, 0.62),
      entranceFrameMat,
    );
    walkway.position.set(0, 0.01, 1.36);
    labGroup.add(walkway);

    const walkwayStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.048, 0.58),
      entranceGlowMat,
    );
    walkwayStrip.position.set(0, 0.014, 1.36);
    labGroup.add(walkwayStrip);

    const labLight = new THREE.PointLight(0x38bdf8, 2.2, 6.5);
    labLight.position.set(0, 0.85, 1.3);
    labGroup.add(labLight);
    lights.push(labLight);

    group.add(labGroup);

    // 3D Battery Bank Cells (positioned cleanly beside the walkway)
    const batteryRack = new THREE.Group();
    batteryRack.position.set(0.24, 0.3, 1.28);
    [-0.22, 0.22].forEach((bx, idx) => {
      const cell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.46, 12),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.75,
        }),
      );
      cell.position.set(bx, 0.23, 0);
      batteryRack.add(cell);

      const chargeMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0xf59e0b : 0x06b6d4,
        emissive: idx === 0 ? 0xd97706 : 0x0284c7,
        emissiveIntensity: 1.05,
      });
      pulseTargets.push({
        material: chargeMat,
        baseIntensity: 1.05,
        amp: 0.65,
        speed: 4.5,
        phase: idx * 1.4,
      });
      const chargeRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.13, 12),
        chargeMat,
      );
      chargeRing.position.set(bx, 0.33, 0);
      batteryRack.add(chargeRing);
    });
    group.add(batteryRack);

    // Dual Electric Tesla Towers + Energy Arc
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const addTeslaTower = (tx: number, tz: number, h: number, phase: number) => {
      const tower = new THREE.Group();
      tower.position.set(tx, 0.3, tz);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.24, h, 12),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.82 }),
      );
      mast.position.y = h / 2;
      tower.add(mast);
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 18), copperMat);
        coil.rotation.x = Math.PI / 2;
        coil.position.y = 0.4 + i * (h * 0.18);
        tower.add(coil);
      }
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.45,
      });
      pulseTargets.push({
        material: orbMat,
        baseIntensity: 1.45,
        amp: 1.05,
        speed: 7.2,
        phase,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), orbMat);
      orb.position.y = h + 0.16;
      tower.add(orb);
      animatedParts.push(orb);
      group.add(tower);
    };

    addTeslaTower(0.85, -0.55, 1.55, 0.0);
    addTeslaTower(1.15, 0.72, 1.18, 1.1);

    // Glowing arc connecting the two Tesla orbs
    const arcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.85, 2.01, -0.55),
      new THREE.Vector3(1.05, 2.15, 0.08),
      new THREE.Vector3(1.15, 1.64, 0.72),
    ]);
    const arcMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.5,
    });
    pulseTargets.push({
      material: arcMat,
      baseIntensity: 1.5,
      amp: 1.15,
      speed: 9.0,
      phase: 0.5,
    });
    const arcBeam = new THREE.Mesh(
      new THREE.TubeGeometry(arcCurve, 18, 0.036, 8, false),
      arcMat,
    );
    group.add(arcBeam);

    // Magical crystals & lush green trees framing the laboratory
    addCrystal(-1.68, 0.85, 0.88, 0x06b6d4);
    addCrystal(-1.42, 1.32, 0.58, 0x0ea5e9);
    addCrystal(1.68, -0.92, 0.82, 0x0284c7);
    addCrystal(1.52, 1.25, 0.55, 0x06b6d4);
    addTree(1.4, -1.25, 0.96, 0x16a34a, true);
    addTree(-1.55, -1.05, 0.94, 0x15803d);
    addTree(-1.86, 0.02, 0.88, 0x16a34a, true);
    addTree(0.22, -1.72, 1.0, 0x15803d);
  } else if (id === 'light') {
    // Sunlit observatory plaza
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 2.1, 0.08, 20),
      new THREE.MeshStandardMaterial({
        map: textures.tileTex,
        color: 0xf8fafc,
        roughness: 0.45,
      }),
    );
    plaza.position.y = 0.26;
    plaza.receiveShadow = true;
    group.add(plaza);

    // Optical Observatory Building + Brass Telescope
    const obsGroup = new THREE.Group();
    obsGroup.position.set(-0.92, 0.3, -0.45);
    const obsBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.62, 0.82, 14),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 }),
    );
    obsBody.position.y = 0.41;
    obsGroup.add(obsBody);

    const obsDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.65,
        roughness: 0.25,
      }),
    );
    obsDome.position.y = 0.82;
    obsGroup.add(obsDome);

    const telescope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.13, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.22 }),
    );
    telescope.position.set(0.32, 1.05, 0.15);
    telescope.rotation.z = -Math.PI / 3.4;
    obsGroup.add(telescope);
    group.add(obsGroup);

    // Pedestal + Faceted Dispersion Prism
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
    );
    pedestal.position.set(0.1, 0.42, 0.15);
    group.add(pedestal);

    const prism = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.85, 1.85, 3),
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
        roughness: 0.08,
        metalness: 0.18,
      }),
    );
    prism.position.set(0.1, 1.38, 0.15);
    prism.castShadow = true;
    animatedParts.push(prism);
    group.add(prism);

    // Incoming white ray + 6 rainbow dispersion rays onto angled mirror
    const whiteRay = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
    );
    whiteRay.rotation.z = Math.PI / 2 - 0.18;
    whiteRay.position.set(-0.62, 1.38, 0.15);
    group.add(whiteRay);

    const spectrum = [0xf43f5e, 0xfb923c, 0xfacc15, 0x34d399, 0x38bdf8, 0xa855f7];
    spectrum.forEach((col, i) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.55, 8),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      ray.rotation.z = Math.PI / 2 + 0.12 - i * 0.075;
      ray.position.set(0.92, 1.34 + (2.5 - i) * 0.09, 0.22);
      group.add(ray);
    });

    // Optical Mirror Stand catching the spectrum
    const mirrorStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.92, 0.68),
      new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        metalness: 0.92,
        roughness: 0.08,
      }),
    );
    mirrorStand.position.set(1.58, 0.95, 0.25);
    mirrorStand.rotation.y = -0.25;
    group.add(mirrorStand);

    addTree(-1.55, 0.95, 1.0, 0x10b981, true);
    addTree(1.25, -1.1, 0.95, 0x059669);
    addCrystal(-1.1, -1.25, 0.65, 0xfbbf24);
  } else if (id === 'magnetism') {
    // Magnetic metallic alloy deck
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.2, 0.08, 16),
      new THREE.MeshStandardMaterial({
        map: textures.circuitTex,
        color: 0xa78bfa,
        roughness: 0.32,
        metalness: 0.65,
      }),
    );
    deck.position.y = 0.26;
    group.add(deck);

    // Magnetic Research Bunker
    const bunker = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.62, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, metalness: 0.7 }),
    );
    bunker.position.set(-1.12, 0.58, -0.55);
    group.add(bunker);

    const radarDish = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.22, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xc4b5fd, metalness: 0.8, side: THREE.DoubleSide }),
    );
    radarDish.position.set(-1.12, 1.06, -0.55);
    radarDish.rotation.x = Math.PI * 0.7;
    animatedParts.push(radarDish);
    group.add(radarDish);

    // Detailed Red/Blue Horseshoe Electromagnet
    const magnetGroup = new THREE.Group();
    magnetGroup.position.set(0.25, 0.3, 0.1);

    const northArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 1.25, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.5 }),
    );
    northArm.position.set(-0.65, 0.62, 0);
    magnetGroup.add(northArm);

    const southArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 1.25, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.5 }),
    );
    southArm.position.set(0.65, 0.62, 0);
    magnetGroup.add(southArm);

    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25,
    });
    [-0.65, 0.65].forEach((cx) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.44, 14), coilMat);
      sleeve.position.set(cx, 0.48, 0);
      magnetGroup.add(sleeve);
    });

    const topArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.19, 12, 24, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3, metalness: 0.6 }),
    );
    topArch.position.set(0, 1.24, 0);
    magnetGroup.add(topArch);
    group.add(magnetGroup);

    // 3D Magnetic Flux Field Arcs looping around magnet
    [-0.45, 0, 0.45].forEach((fz) => {
      const fluxCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.4, 0.45, fz * 0.4),
        new THREE.Vector3(-0.95, 1.75, fz * 1.15),
        new THREE.Vector3(0.25, 2.2, fz * 1.35),
        new THREE.Vector3(1.45, 1.75, fz * 1.15),
        new THREE.Vector3(0.9, 0.45, fz * 0.4),
      ]);
      const fluxTube = new THREE.Mesh(
        new THREE.TubeGeometry(fluxCurve, 28, 0.022, 6, false),
        new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.72 }),
      );
      group.add(fluxTube);
    });

    // Floating levitating metallic objects orbiting the magnet
    const levGroup = new THREE.Group();
    levGroup.position.set(0.25, 1.15, 0.1);
    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.032, 8, 42),
      new THREE.MeshBasicMaterial({ color: 0xddd6fe, transparent: true, opacity: 0.65 }),
    );
    orbitRing.rotation.x = Math.PI / 2.6;
    levGroup.add(orbitRing);

    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const obj = new THREE.Mesh(
        k % 2 === 0
          ? new THREE.OctahedronGeometry(0.18, 0)
          : new THREE.BoxGeometry(0.24, 0.24, 0.24),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          emissive: 0x8b5cf6,
          emissiveIntensity: 0.5,
          metalness: 0.88,
          roughness: 0.18,
        }),
      );
      obj.position.set(Math.cos(a) * 1.48, Math.sin(a) * 0.35, Math.sin(a) * 1.48);
      levGroup.add(obj);
    }
    animatedParts.push(levGroup);
    group.add(levGroup);

    addCrystal(-1.55, 0.85, 0.85, 0xa855f7);
    addCrystal(1.55, -0.8, 0.78, 0x38bdf8);
    addTree(1.25, 1.05, 0.85, 0x4f46e5, true);
  } else if (id === 'human-eye') {
    // Organic Biological Stone Terrace
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.0, 0.12, 16),
      new THREE.MeshStandardMaterial({
        map: textures.tileTex,
        color: isLocked ? 0x64748b : 0xa7f3d0,
        roughness: 0.55,
      }),
    );
    terrace.position.y = 0.28;
    group.add(terrace);

    // Eye-themed Research Rotunda Columns
    [-0.95, 0.95].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 1.15, 10),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38 }),
      );
      pillar.position.set(px, 0.88, -0.2);
      group.add(pillar);
    });

    const archBeam = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.1, 8, 22, Math.PI),
      new THREE.MeshStandardMaterial({
        color: isLocked ? 0x475569 : 0x10b981,
        roughness: 0.35,
      }),
    );
    archBeam.position.set(0, 1.38, -0.2);
    group.add(archBeam);

    // Textured 3D Eye Sphere centerpiece
    const eyeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 20),
      new THREE.MeshStandardMaterial({
        map: textures.irisTex,
        color: isLocked ? 0x94a3b8 : 0xffffff,
        emissive: isLocked ? 0x000000 : 0x0f766e,
        emissiveIntensity: 0.28,
        roughness: 0.15,
        metalness: 0.1,
      }),
    );
    eyeSphere.position.set(0, 1.2, -0.15);
    eyeSphere.rotation.y = -Math.PI / 2;
    animatedParts.push(eyeSphere);
    group.add(eyeSphere);

    // Floating Biconvex Glass Lens Stand focusing rays
    const lensStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: isLocked ? 0.08 : 0.65,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
    );
    lensStand.rotation.x = Math.PI / 2;
    lensStand.position.set(0, 1.15, 1.05);
    group.add(lensStand);

    const lensPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6 }),
    );
    lensPost.position.set(0, 0.62, 1.05);
    group.add(lensPost);

    addTree(-1.45, -0.75, 0.92, isLocked ? 0x475569 : 0x059669, true);
    addTree(1.45, 0.75, 0.88, isLocked ? 0x475569 : 0x10b981, true);
    addCrystal(-1.25, 1.05, 0.6, isLocked ? 0x64748b : 0x34d399);
  } else if (id === 'challenge-arena') {
    // Grand Stepped Colosseum Ring & Arena Floor
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 0.18, 24),
      new THREE.MeshStandardMaterial({
        map: textures.tileTex,
        color: 0x334155,
        roughness: 0.45,
      }),
    );
    floor.position.set(0, 0.3, 0);
    group.add(floor);

    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }),
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.41;
    group.add(runeRing);

    const outerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.78, 1.9, 0.65, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    outerWall.position.set(0, 0.62, 0);
    group.add(outerWall);

    // 10 Colosseum Colonnade Pillars
    for (let p = 0; p < 10; p++) {
      const angle = (p / 10) * Math.PI * 2;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.72, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
      );
      col.position.set(Math.cos(angle) * 1.72, 0.98, Math.sin(angle) * 1.72);
      group.add(col);
    }

    // 4 Golden Ember Torch Pedestals
    [
      [1.45, 0],
      [-1.45, 0],
      [0, 1.45],
      [0, -1.45],
    ].forEach(([tx, tz]) => {
      const torch = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xfb923c,
          emissive: 0xf97316,
          emissiveIntensity: 2.0,
        }),
      );
      torch.position.set(tx, 1.25, tz);
      group.add(torch);
    });

    // Central Dais + Spinning Golden Mastery Core
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.68, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }),
    );
    dais.position.y = 0.48;
    group.add(dais);

    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(0, 1.25, 0);
    const trophyCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.16,
      }),
    );
    trophyGroup.add(trophyCore);

    const trophyHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfde047 }),
    );
    trophyHalo.rotation.x = Math.PI / 3;
    trophyGroup.add(trophyHalo);
    animatedParts.push(trophyGroup);
    group.add(trophyGroup);
  }

  // Invisible simplified proxy collider for raycasting
  const collider = new THREE.Mesh(
    new THREE.SphereGeometry(2.85, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  collider.userData = { islandId: id };
  collider.layers.set(1);
  group.add(collider);

  return { group, collider, ring, outerRing, animatedParts, satellites, pulseTargets, lights };
}

const _projVec = new THREE.Vector3();
const _moteVec = new THREE.Vector3();
const _moteMat = new THREE.Matrix4();
const _moteScale = new THREE.Vector3(1, 1, 1);
const _moteQuat = new THREE.Quaternion();
const _desiredCamPos = new THREE.Vector3();
const _desiredCamTarget = new THREE.Vector3();

interface LearningWorldProps {
  cinematicMode?: boolean;
}

export const LearningWorld: React.FC<LearningWorldProps> = ({ cinematicMode = false }) => {
  const {
    islandSummaries,
    concepts,
    overallMastery,
    weakestConcept,
    navigate,
    setSelectedConceptId,
    diagnosticCompleted,
  } = useEdu();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hoveredIslandRef = useRef<IslandId | null>(null);
  const selectedIslandRef = useRef<IslandId | null>(null);
  const cameraGoalRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: DEFAULT_CAMERA_POS.clone(),
    target: DEFAULT_CAMERA_TARGET.clone(),
  });
  const navigateRef = useRef(navigate);
  const summariesRef = useRef(islandSummaries);

  const [hoveredIsland, setHoveredIsland] = useState<IslandId | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  navigateRef.current = navigate;
  summariesRef.current = islandSummaries;
  selectedIslandRef.current = selectedIsland;

  const focusCameraOnIsland = (id: IslandId) => {
    const c = ISLAND_COORDS[id];
    _desiredCamTarget.set(c.x, c.y + 0.55, c.z);
    _desiredCamPos.set(c.x * 0.72, c.y + 4.35, c.z + 7.2);
    cameraGoalRef.current = {
      active: true,
      pos: _desiredCamPos.clone(),
      target: _desiredCamTarget.clone(),
    };
    setSelectedIsland(id);
  };

  const handleResetCamera = () => {
    setSelectedIsland(null);
    cameraGoalRef.current = {
      active: true,
      pos: DEFAULT_CAMERA_POS.clone(),
      target: DEFAULT_CAMERA_TARGET.clone(),
    };
  };

  const handleEnterIsland = (id: IslandId) => {
    const summary = summariesRef.current[id];
    if (summary.status === 'locked') {
      navigateRef.current('diagnostic');
      return;
    }
    const c = ISLAND_COORDS[id];
    cameraGoalRef.current = {
      active: true,
      pos: new THREE.Vector3(c.x, c.y + 2.2, c.z + 3.8),
      target: new THREE.Vector3(c.x, c.y + 0.6, c.z),
    };
    window.setTimeout(() => {
      if (id === 'challenge-arena') {
        navigateRef.current('counterfactual');
      } else {
        navigateRef.current('island-detail', { islandId: id });
      }
    }, 240);
  };

  const selectedIslandMeta = useMemo(
    () => ISLANDS.find((i) => i.id === selectedIsland) ?? null,
    [selectedIsland],
  );
  const selectedIslandConcepts = useMemo(
    () =>
      selectedIslandMeta
        ? concepts.filter((c) => selectedIslandMeta.conceptIds.includes(c.id))
        : [],
    [concepts, selectedIslandMeta],
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: cinematicMode || !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: isSoftwareGl || cinematicMode,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = cinematicMode ? 1.18 : 1.12;
    renderer.setPixelRatio(
      cinematicMode ? 1 : isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = cinematicMode || !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const initW = container.clientWidth || 1280;
    const initH = container.clientHeight || 680;
    renderer.setSize(initW, initH);
    container.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const onRestored = () => setWebglUnavailable(false);
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    const textures = createWorldTextures();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071230);
    scene.fog = new THREE.FogExp2(0x071436, cinematicMode ? 0.011 : 0.016);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const initAspect = initW / initH;
    const camera = new THREE.PerspectiveCamera(
      initAspect < 1 ? Math.min(78, 45 / Math.max(initAspect, 0.48)) : 45,
      initAspect,
      0.1,
      180,
    );
    camera.position.copy(DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 6.5;
    controls.maxDistance = 26;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.43;
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.addEventListener('start', () => {
      cameraGoalRef.current.active = false;
    });

    // Atmospheric 3-point lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0b1633, 1.05);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(11, 18, 12);
    keyLight.castShadow = cinematicMode || !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    // Animated Ocean Plane with caustic texture + multi-harmonic vertex swells
    const oceanUniforms = { uTime: { value: 0 } };
    const oceanGeo = new THREE.PlaneGeometry(145, 145, cinematicMode ? 84 : 58, cinematicMode ? 84 : 58);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      map: textures.waterTex,
      color: 0x0b67c2,
      emissive: 0x062f6b,
      emissiveIntensity: 0.65,
      roughness: 0.36,
      metalness: 0.28,
      flatShading: true,
    });
    oceanMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = oceanUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float wave1 = sin(transformed.x * 0.36 + uTime * 1.15) * 0.28;
          float wave2 = cos(transformed.z * 0.42 + uTime * 0.9) * 0.22;
          float wave3 = sin((transformed.x + transformed.z) * 0.26 + uTime * 1.45) * 0.12;
          transformed.y += wave1 + wave2 + wave3;
          `,
        );
    };
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.y = -1.35;
    ocean.receiveShadow = true;
    scene.add(ocean);

    // Soft Floating Low-Poly Cloud Clusters beneath archipelago
    const clouds: THREE.Group[] = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.9,
      transparent: true,
      opacity: 0.28,
      flatShading: true,
    });
    const cloudSpots: Array<[number, number, number]> = [
      [-10, -0.35, -3],
      [9.5, -0.2, -4],
      [-2.8, -0.45, -9],
      [4.2, -0.3, 5.5],
      [-6.5, -0.4, 5.2],
    ];
    cloudSpots.forEach(([cx, cy, cz], idx) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, cy, cz);
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95 - p * 0.16, 0), cloudMat);
        puff.position.set((p - 1) * 0.85, (p % 2) * 0.2, 0);
        puff.scale.set(1.4, 0.55, 1.0);
        cGroup.add(puff);
      }
      cGroup.userData = { baseX: cx, phase: idx * 1.4 };
      scene.add(cGroup);
      clouds.push(cGroup);
    });

    // Overhead Cosmic Starfield
    const STAR_COUNT = 220;
    const starGeo = new THREE.OctahedronGeometry(0.11, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const stars = new THREE.InstancedMesh(starGeo, starMat, STAR_COUNT);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const dist = 17 + (i % 22) * 1.15;
      dummy.position.set(
        Math.cos(angle) * dist,
        3.8 + (i % 12) * 1.15,
        Math.sin(angle) * dist - 10,
      );
      const s = 0.5 + (i % 4) * 0.3;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.computeBoundingSphere();
    scene.add(stars);

    // Floating Atmospheric Aether Fireflies
    const FIREFLY_COUNT = 110;
    const fireflyGeo = new THREE.SphereGeometry(0.068, 6, 6);
    const fireflyMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const fireflies = new THREE.InstancedMesh(fireflyGeo, fireflyMat, FIREFLY_COUNT);
    const fireflySeeds = Array.from({ length: FIREFLY_COUNT }, (_, i) =>
      i < 40
        ? {
            // Corridor & Electricity Island particles visible during ocean flyover
            x: -3.8 + (i % 10) * 0.82 + Math.sin(i * 1.7) * 0.4,
            y: 0.35 + (i % 6) * 0.68,
            z: 2.0 + (i % 12) * 1.1,
            speed: 0.42 + (i % 5) * 0.12,
            phase: i * 0.72,
          }
        : {
            x: Math.sin(i * 2.13) * 11.5,
            y: 0.4 + (i % 7) * 0.72,
            z: Math.cos(i * 1.67) * 8.5 - 1.5,
            speed: 0.35 + (i % 5) * 0.12,
            phase: i * 0.85,
          },
    );
    scene.add(fireflies);

    // Build 5 Floating Islands
    const islandEntries: Record<
      IslandId,
      IslandBuildResult & { baseY: number; phase: number }
    > = {} as never;
    const colliders: THREE.Mesh[] = [];

    ISLANDS.forEach((island, idx) => {
      const coords = ISLAND_COORDS[island.id];
      const locked = summariesRef.current[island.id]?.status === 'locked';
      const built = buildFloatingIslandGroup(island.id, locked, textures);
      built.group.position.set(coords.x, coords.y, coords.z);
      built.group.scale.setScalar(coords.scale);
      scene.add(built.group);

      colliders.push(built.collider);
      islandEntries[island.id] = {
        ...built,
        baseY: coords.y,
        phase: idx * 1.35,
      };
    });

    // Glowing Energy Bridges connecting the 5 islands
    const pathPairs: Array<[IslandId, IslandId, number]> = [
      ['light', 'electricity', 0x38bdf8],
      ['electricity', 'magnetism', 0xa78bfa],
      ['light', 'human-eye', 0x34d399],
      ['human-eye', 'challenge-arena', 0xfbbf24],
      ['magnetism', 'challenge-arena', 0xfb7185],
    ];

    const curves: THREE.CatmullRomCurve3[] = [];
    const pathGeos: THREE.TubeGeometry[] = [];
    const pathMats: THREE.MeshBasicMaterial[] = [];

    pathPairs.forEach(([from, to, hex]) => {
      const a = ISLAND_COORDS[from];
      const b = ISLAND_COORDS[to];
      const mid = new THREE.Vector3(
        (a.x + b.x) / 2,
        Math.max(a.y, b.y) + 0.75,
        (a.z + b.z) / 2,
      );
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.x, a.y + 0.12, a.z),
        mid,
        new THREE.Vector3(b.x, b.y + 0.12, b.z),
      ]);
      curves.push(curve);
      const geo = new THREE.TubeGeometry(curve, 36, 0.052, 8, false);
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.42,
      });
      pathGeos.push(geo);
      pathMats.push(mat);
      scene.add(new THREE.Mesh(geo, mat));
    });

    // Moving luminous motes along bridges
    const MOTES_PER_PATH = 6;
    const totalMotes = curves.length * MOTES_PER_PATH;
    const moteGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const motesMesh = new THREE.InstancedMesh(moteGeo, moteMat, totalMotes);
    scene.add(motesMesh);

    // Raycasting setup (Layer 1 simplified proxies)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    const pickIsland = (clientX: number, clientY: number): IslandId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(colliders, false);
      if (hits.length === 0) return null;
      return (hits[0].object.userData.islandId as IslandId) ?? null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const picked = pickIsland(e.clientX, e.clientY);
      if (picked !== hoveredIslandRef.current) {
        hoveredIslandRef.current = picked;
        setHoveredIsland(picked);
        renderer.domElement.style.cursor = picked ? 'pointer' : 'grab';
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y,
      );
      if (dist > 8) return;
      const picked = pickIsland(e.clientX, e.clientY);
      if (picked) {
        focusCameraOnIsland(picked);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const updateProjectedLabels = () => {
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 680;
      const padX = w < 560 ? 74 : 96;
      const padTop = w < 560 ? 185 : 88;
      const padBottom = w < 560 ? 78 : 90;

      (Object.keys(islandEntries) as IslandId[]).forEach((id) => {
        const entry = islandEntries[id];
        const el = labelRefs.current[id];
        if (!el) return;
        const hiddenByFocus =
          selectedIslandRef.current !== null && selectedIslandRef.current !== id;
        _projVec.copy(entry.group.position);
        _projVec.y += 2.65;
        _projVec.project(camera);
        const visible = _projVec.z < 1 && _projVec.z > -1;
        const sx = ((_projVec.x + 1) / 2) * w;
        const sy = ((-_projVec.y + 1) / 2) * h;
        const clampedX = Math.max(padX, Math.min(w - padX, sx));
        const clampedY = Math.max(padTop, Math.min(h - padBottom, sy));
        el.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(-50%, -100%)`;
        el.style.opacity = visible && !hiddenByFocus ? '1' : '0';
      });
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 680;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? Math.min(78, 45 / Math.max(aspect, 0.48)) : 45;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
      updateProjectedLabels();
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const CINEMATIC_DURATION = 8.0;
    const cinematicCamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.4, 3.45, 20.6),
      new THREE.Vector3(-2.1, 4.15, 13.8),
      new THREE.Vector3(-0.5, 3.65, 9.4),
      new THREE.Vector3(-0.45, 3.32, 7.05),
    ]);
    const cinematicLookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 1.85, 2.35),
      new THREE.Vector3(-0.3, 2.15, 2.35),
      new THREE.Vector3(-0.36, 2.42, 2.35),
      new THREE.Vector3(-0.35, 2.55, 2.35),
    ]);
    const _cinematicLook = new THREE.Vector3();

    function applyWorldAnimations(elapsed: number, delta: number, deterministic = false) {
      oceanUniforms.uTime.value = elapsed;
      textures.waterTex.offset.x = elapsed * 0.022;
      textures.waterTex.offset.y = elapsed * 0.014;

      (Object.keys(islandEntries) as IslandId[]).forEach((id) => {
        const entry = islandEntries[id];
        const isActive =
          !cinematicMode &&
          (hoveredIslandRef.current === id || selectedIslandRef.current === id);
        const targetY =
          entry.baseY + Math.sin(elapsed * 1.15 + entry.phase) * 0.22 + (isActive ? 0.5 : 0);
        entry.group.position.y = deterministic
          ? targetY
          : THREE.MathUtils.damp(entry.group.position.y, targetY, 7, delta);
        const targetScale = ISLAND_COORDS[id].scale * (isActive ? 1.07 : 1.0);
        const nextScale = deterministic
          ? targetScale
          : THREE.MathUtils.damp(entry.group.scale.x, targetScale, 8, delta);
        entry.group.scale.setScalar(nextScale);

        const ringMat = entry.ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = isActive ? 0.95 : id === 'electricity' ? 0.55 : 0.24;
        const outerMat = entry.outerRing.material as THREE.MeshBasicMaterial;
        outerMat.opacity = isActive ? 0.55 : 0.14;

        entry.pulseTargets.forEach((pt) => {
          const wave =
            Math.sin(elapsed * pt.speed + pt.phase) * 0.7 +
            Math.sin(elapsed * (pt.speed * 2.3) + pt.phase * 1.7) * 0.3;
          pt.material.emissiveIntensity = Math.max(0.25, pt.baseIntensity + wave * pt.amp);
        });
        entry.lights.forEach((light, lIdx) => {
          light.intensity = 2.1 + Math.sin(elapsed * 5.2 + lIdx) * 0.75;
        });

        entry.animatedParts.forEach((part, pIdx) => {
          if (deterministic) {
            part.rotation.y = elapsed * (0.55 + pIdx * 0.25);
          } else {
            part.rotation.y += delta * (0.55 + pIdx * 0.25);
          }
        });
        entry.satellites.forEach((sat, sIdx) => {
          if (deterministic) {
            sat.position.y += Math.sin(elapsed * 1.8 + sIdx * 2.1 + entry.phase) * 0.004;
            sat.rotation.y = elapsed * 0.4;
          } else {
            sat.position.y += Math.sin(elapsed * 1.8 + sIdx * 2.1 + entry.phase) * 0.004;
            sat.rotation.y += delta * 0.4;
          }
        });
      });

      // Drift clouds softly
      clouds.forEach((c) => {
        c.position.x = c.userData.baseX + Math.sin(elapsed * 0.18 + c.userData.phase) * 0.85;
      });

      // Animate glowing energy motes along paths
      let idx = 0;
      for (let c = 0; c < curves.length; c++) {
        for (let m = 0; m < MOTES_PER_PATH; m++) {
          const t = (m / MOTES_PER_PATH + elapsed * 0.19) % 1;
          curves[c].getPointAt(t, _moteVec);
          _moteMat.compose(_moteVec, _moteQuat, _moteScale);
          motesMesh.setMatrixAt(idx++, _moteMat);
        }
      }
      motesMesh.instanceMatrix.needsUpdate = true;

      // Animate atmospheric fireflies
      for (let f = 0; f < FIREFLY_COUNT; f++) {
        const seed = fireflySeeds[f];
        _moteVec.set(
          seed.x + Math.sin(elapsed * seed.speed + seed.phase) * 0.65,
          seed.y + Math.cos(elapsed * (seed.speed * 1.3) + seed.phase) * 0.45,
          seed.z + Math.cos(elapsed * seed.speed + seed.phase) * 0.65,
        );
        const s = 0.72 + Math.sin(elapsed * 2.6 + seed.phase) * 0.38;
        _moteScale.setScalar(s);
        _moteMat.compose(_moteVec, _moteQuat, _moteScale);
        fireflies.setMatrixAt(f, _moteMat);
      }
      _moteScale.set(1, 1, 1);
      fireflies.instanceMatrix.needsUpdate = true;
    }

    function renderCinematicAtTime(elapsedSec: number) {
      const clamped = Math.max(0, Math.min(CINEMATIC_DURATION, elapsedSec));
      const linearU = clamped / CINEMATIC_DURATION;
      // Smooth S-curve acceleration & deceleration into the island entrance
      const easedU =
        linearU * linearU * (3 - 2 * linearU) * 0.75 +
        (linearU < 0.5
          ? 4 * linearU * linearU * linearU
          : 1 - Math.pow(-2 * linearU + 2, 3) / 2) *
          0.25;

      cinematicCamCurve.getPointAt(easedU, camera.position);
      cinematicLookCurve.getPointAt(easedU, _cinematicLook);
      camera.lookAt(_cinematicLook);

      applyWorldAnimations(clamped, 1 / 30, true);
      renderer.render(scene, camera);
    }

    let cinematicControlledExternally = false;
    if (cinematicMode) {
      controls.enabled = false;
      (
        window as unknown as {
          __renderCinematicFrame?: (t: number) => boolean;
        }
      ).__renderCinematicFrame = (t: number) => {
        cinematicControlledExternally = true;
        renderCinematicAtTime(t);
        return true;
      };
      renderCinematicAtTime(0);
    }

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (cinematicMode) {
        if (cinematicControlledExternally) return;
        const elapsed = clock.getElapsedTime() % CINEMATIC_DURATION;
        renderCinematicAtTime(elapsed);
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min(0.08, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      // Smooth camera transition when inspecting an island or resetting view
      if (cameraGoalRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          cameraGoalRef.current.pos.x,
          8.5,
          delta,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          cameraGoalRef.current.pos.y,
          8.5,
          delta,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          cameraGoalRef.current.pos.z,
          8.5,
          delta,
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          cameraGoalRef.current.target.x,
          9,
          delta,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          cameraGoalRef.current.target.y,
          9,
          delta,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          cameraGoalRef.current.target.z,
          9,
          delta,
        );
        if (
          camera.position.distanceTo(cameraGoalRef.current.pos) < 0.08 &&
          controls.target.distanceTo(cameraGoalRef.current.target) < 0.06
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      applyWorldAnimations(elapsed, delta, false);

      controls.update();
      renderer.render(scene, camera);
      updateProjectedLabels();

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (cinematicMode) {
        delete (window as unknown as { __renderCinematicFrame?: (t: number) => boolean })
          .__renderCinematicFrame;
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      controls.dispose();
      textures.dispose();
      oceanGeo.dispose();
      oceanMat.dispose();
      cloudMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      fireflyGeo.dispose();
      fireflyMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      pathGeos.forEach((g) => g.dispose());
      pathMats.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [cinematicMode]);

  if (cinematicMode) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#060B1E]">
        <div ref={mountRef} className="absolute inset-0 h-full w-full" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[520px] overflow-hidden bg-[#060B1E]">
      {/* Full-Bleed 3D Floating Island Viewport */}
      {!webglUnavailable ? (
        <div
          ref={mountRef}
          className="absolute inset-0 h-full w-full"
          aria-label="EduLevel 3D Floating Island Learning World"
        />
      ) : (
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ISLANDS.map((island) => (
            <button
              key={island.id}
              type="button"
              onClick={() => setSelectedIsland(island.id)}
              className="rounded-2xl border border-white/15 bg-[#0D1733] p-4 text-left hover:border-cyan-400/50 cursor-pointer"
            >
              <div className="mx-auto max-w-[200px]">
                <IslandIllustration
                  id={island.id}
                  locked={islandSummaries[island.id].status === 'locked'}
                />
              </div>
              <div className="mt-2 font-display text-lg font-bold text-white">
                {island.name}
              </div>
              <div className="text-xs text-cyan-300 font-mono">
                Mastery {islandSummaries[island.id].mastery}%
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Compact Non-Overlapping Projected Island Badges */}
      {!webglUnavailable && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {ISLANDS.map((island) => {
            const summary = islandSummaries[island.id];
            const statusMeta = STATUS_META[summary.status];
            const isActive =
              hoveredIsland === island.id || selectedIsland === island.id;
            const dimmed = selectedIsland !== null && selectedIsland !== island.id;

            return (
              <div
                key={island.id}
                ref={(el) => {
                  labelRefs.current[island.id] = el;
                }}
                style={{ visibility: dimmed ? 'hidden' : 'visible' }}
                className={`absolute left-0 top-0 transition-opacity duration-200 ${
                  dimmed ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => focusCameraOnIsland(island.id)}
                  onMouseEnter={() => setHoveredIsland(island.id)}
                  onMouseLeave={() => setHoveredIsland(null)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 sm:px-3 sm:py-1.5 text-left shadow-xl transition-transform duration-150 cursor-pointer ${
                    isActive
                      ? 'scale-105 border-cyan-300 bg-[#081229]/95'
                      : 'border-white/20 bg-[#081229]/88 hover:border-cyan-400/70'
                  }`}
                >
                  {summary.status === 'locked' ? (
                    <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${statusMeta.dotClass}`}
                    />
                  )}
                  <span className="font-display text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                    {island.name.replace(' Island', '')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-bold text-cyan-300 tabular-nums">
                    {summary.mastery}%
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Top HUD */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 sm:left-4 sm:right-4 sm:top-4 z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-xl border border-white/15 bg-[#081229]/90 px-3.5 py-2 shadow-xl">
          <span className="font-display text-xs sm:text-sm font-semibold text-white">
            Focus: {weakestConcept.name} ({weakestConcept.mastery}%)
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono text-xs font-semibold text-emerald-300 tabular-nums">
            {overallMastery}% World
          </span>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {!diagnosticCompleted && (
            <button
              type="button"
              onClick={() => navigate('diagnostic')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-[#0C1631]/92 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:border-amber-300 transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Diagnostic</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('lab', { conceptId: 'ohms-law' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition shadow-lg shadow-cyan-500/20 cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>3D Lab</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Island Drawer */}
      {selectedIslandMeta && (
        <aside
          aria-label={`${selectedIslandMeta.name} Details`}
          className="pointer-events-auto absolute right-3 left-3 sm:left-auto sm:right-4 bottom-[4.4rem] sm:bottom-20 z-20 sm:w-[320px] rounded-2xl border border-cyan-400/35 bg-[#081229]/95 p-4 shadow-2xl space-y-3"
        >
          {(() => {
            const summary = islandSummaries[selectedIslandMeta.id];
            const statusMeta = STATUS_META[summary.status];
            const StatusIcon = statusMeta.Icon;
            const isLocked = summary.status === 'locked';

            return (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.colorClass}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusMeta.label}</span>
                      </span>
                      <span className="text-slate-500" aria-hidden="true">·</span>
                      <span className="text-slate-400">{selectedIslandMeta.chapterTag}</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-white mt-0.5">
                      {selectedIslandMeta.name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetCamera}
                    aria-label="Close island preview"
                    className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      {summary.completedConcepts}/{summary.totalConcepts} mastered
                    </span>
                    <span className="font-mono font-bold text-cyan-300 tabular-nums">
                      {summary.mastery}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${summary.mastery}%`,
                        backgroundColor: selectedIslandMeta.accentHex,
                      }}
                    />
                  </div>
                </div>

                {isLocked && (
                  <p className="text-xs text-slate-300">
                    {selectedIslandMeta.unlockRequirement}
                  </p>
                )}

                {selectedIslandConcepts.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {selectedIslandConcepts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="text-slate-200 truncate">{c.name}</span>
                        <span className="font-mono font-semibold text-cyan-300 tabular-nums ml-2">
                          {c.mastery}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEnterIsland(selectedIslandMeta.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {isLocked
                        ? 'Take Diagnostic'
                        : selectedIslandMeta.id === 'challenge-arena'
                          ? 'Enter Arena'
                          : 'Open Island'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {selectedIslandMeta.id === 'electricity' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConceptId('ohms-law');
                        navigate('lab', { conceptId: 'ohms-law' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer whitespace-nowrap"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span>3D Lab</span>
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </aside>
      )}

      {/* Bottom-Center Styled Island Progress Navigation Dock */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 overflow-x-auto max-w-[95vw] rounded-2xl border border-white/15 bg-[#081229]/92 p-1.5 shadow-2xl">
        {ISLANDS.map((island) => {
          const summary = islandSummaries[island.id];
          const isLocked = summary.status === 'locked';
          const isSelected = selectedIsland === island.id;
          return (
            <button
              key={island.id}
              type="button"
              onClick={() => focusCameraOnIsland(island.id)}
              className={`flex flex-col gap-1 rounded-xl px-3 py-1.5 text-left transition cursor-pointer whitespace-nowrap min-w-[104px] ${
                isSelected
                  ? 'bg-cyan-400/20 border border-cyan-400/50 text-white'
                  : isLocked
                    ? 'border border-transparent text-slate-400 hover:bg-white/5'
                    : 'border border-transparent text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1">
                  {isLocked && <Lock className="h-2.5 w-2.5 text-slate-400" />}
                  <span>{island.name.replace(' Island', '')}</span>
                </span>
                <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                  {summary.mastery}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${summary.mastery}%`,
                    backgroundColor: island.accentHex,
                  }}
                />
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset World Camera"
          aria-label="Reset World Camera"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white cursor-pointer shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
