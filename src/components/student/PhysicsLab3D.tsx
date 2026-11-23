import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  Plus,
  Power,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Tag,
} from 'lucide-react';
import { ASSETS } from '../../data/assets';
import { useEdu } from '../../context/EduContext';
import { SafeImage } from '../shared/SafeImage';

function createBreadboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#252F42';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  for (let gx = 16; gx < 512; gx += 24) {
    for (let gy = 16; gy < 512; gy += 24) {
      ctx.beginPath();
      ctx.arc(gx, gy, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = '#0D1320';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx - 0.8, gy - 0.8, 4.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148,163,184,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1.4);
  return tex;
}

function drawMeterScreen(
  canvas: HTMLCanvasElement,
  title: string,
  valueText: string,
  unit: string,
  ratio: number,
  accentColor: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#081326';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = accentColor;
  ctx.fillRect(8, 8, w - 16, 46);
  ctx.fillStyle = '#071022';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 39);

  const cx = w / 2;
  const cy = 145;
  const r = 68;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 2.15);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 12;
  ctx.stroke();

  const clamped = Math.max(0, Math.min(1, ratio));
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * (0.85 + clamped * 1.3));
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 12;
  ctx.stroke();

  const angle = Math.PI * (0.85 + clamped * 1.3);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 8), cy + Math.sin(angle) * (r - 8));
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 48px monospace';
  ctx.fillText(`${valueText} ${unit}`, w / 2, 224);
}

interface LabLogRow {
  id: number;
  voltage: number;
  resistance: number;
  current: number;
  power: number;
}

const COMPONENT_MARKERS = [
  { id: 'battery', label: 'DC Battery', pos: new THREE.Vector3(-2.6, 1.45, 1.0) },
  { id: 'switch', label: 'Circuit Switch', pos: new THREE.Vector3(0, 0.72, 1.9) },
  { id: 'resistor', label: 'Rheostat (R)', pos: new THREE.Vector3(0, 1.35, 0.3) },
  { id: 'bulb', label: 'Filament Bulb', pos: new THREE.Vector3(2.5, 1.6, 1.0) },
  { id: 'ammeter', label: 'Ammeter (Series)', pos: new THREE.Vector3(-1.45, 1.95, -1.9) },
  { id: 'voltmeter', label: 'Voltmeter (Parallel)', pos: new THREE.Vector3(1.45, 1.95, -1.9) },
];

const _tempVec = new THREE.Vector3();
const _labelProj = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _tempScale = new THREE.Vector3(1, 1, 1);
const _tempQuat = new THREE.Quaternion();

export const PhysicsLab3D: React.FC = () => {
  const {
    labResult,
    recordLabObservation,
    completeLabExperiment,
    resetLabExperiment,
    openVerificationModal,
    navigate,
    showToast,
  } = useEdu();

  const [voltage, setVoltage] = useState<number>(labResult.voltage || 12);
  const [resistance, setResistance] = useState<number>(labResult.resistance || 6);
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [controlsOpen, setControlsOpen] = useState<boolean>(true);
  const [mentorOpen, setMentorOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [showLabels, setShowLabels] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [cameraPreset, setCameraPreset] = useState<'bench' | 'bulb' | 'meters'>('bench');
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const [testedHighR, setTestedHighR] = useState<boolean>(false);
  const [testedHighV, setTestedHighV] = useState<boolean>(false);
  const [testedSwitch, setTestedSwitch] = useState<boolean>(false);
  const [labLogs, setLabLogs] = useState<LabLogRow[]>([
    { id: 1, voltage: 12, resistance: 6, current: 2.0, power: 24.0 },
  ]);

  const [lastInteractionNote, setLastInteractionNote] = useState<string>(
    '12 V / 6 Ω = 2.00 A — raise R to see current drop.',
  );

  const current = switchClosed ? Number((voltage / resistance).toFixed(2)) : 0;
  const power = switchClosed ? Number((voltage * current).toFixed(2)) : 0;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const showLabelsRef = useRef<boolean>(showLabels);
  showLabelsRef.current = showLabels;

  const simRef = useRef({ voltage, resistance, switchClosed, current, power });
  const cameraTargetRef = useRef<{
    pos: THREE.Vector3;
    look: THREE.Vector3;
    transitioning: boolean;
  }>({
    pos: new THREE.Vector3(0, 6.4, 8.6),
    look: new THREE.Vector3(0, 0.4, 0),
    transitioning: false,
  });

  const screenRefs = useRef<{
    ammeterCanvas?: HTMLCanvasElement;
    ammeterTex?: THREE.CanvasTexture;
    voltmeterCanvas?: HTMLCanvasElement;
    voltmeterTex?: THREE.CanvasTexture;
    filamentMat?: THREE.MeshStandardMaterial;
    bulbLight?: THREE.PointLight;
    wiperGroup?: THREE.Group;
    switchCap?: THREE.Mesh;
    switchLedMat?: THREE.MeshStandardMaterial;
  }>({});

  useEffect(() => {
    simRef.current = { voltage, resistance, switchClosed, current, power };

    const {
      ammeterCanvas,
      ammeterTex,
      voltmeterCanvas,
      voltmeterTex,
      filamentMat,
      bulbLight,
      wiperGroup,
      switchCap,
      switchLedMat,
    } = screenRefs.current;

    if (ammeterCanvas && ammeterTex) {
      drawMeterScreen(
        ammeterCanvas,
        'AMMETER (I)',
        current.toFixed(2),
        'A',
        current / 12,
        '#38BDF8',
      );
      ammeterTex.needsUpdate = true;
    }

    if (voltmeterCanvas && voltmeterTex) {
      drawMeterScreen(
        voltmeterCanvas,
        'VOLTMETER (V)',
        (switchClosed ? voltage : 0).toFixed(1),
        'V',
        (switchClosed ? voltage : 0) / 24,
        '#F59E0B',
      );
      voltmeterTex.needsUpdate = true;
    }

    if (filamentMat && bulbLight) {
      const normalizedPower = Math.min(1, power / 90);
      filamentMat.emissiveIntensity = switchClosed ? 0.35 + normalizedPower * 4.6 : 0.05;
      bulbLight.intensity = switchClosed ? 0.4 + normalizedPower * 8.0 : 0;
    }

    if (wiperGroup) {
      const t = (resistance - 1) / 19;
      wiperGroup.position.x = -0.85 + t * 1.7;
    }

    if (switchCap && switchLedMat) {
      switchCap.position.y = switchClosed ? 0.23 : 0.31;
      switchLedMat.color.setHex(switchClosed ? 0x22c55e : 0xef4444);
      switchLedMat.emissive.setHex(switchClosed ? 0x22c55e : 0xef4444);
    }
  }, [voltage, resistance, switchClosed, current, power]);

  const selectPreset = (preset: 'bench' | 'bulb' | 'meters') => {
    setCameraPreset(preset);
    if (preset === 'bench') {
      cameraTargetRef.current.pos.set(0, 6.4, 8.6);
      cameraTargetRef.current.look.set(0, 0.4, 0);
    } else if (preset === 'bulb') {
      cameraTargetRef.current.pos.set(2.9, 3.3, 4.4);
      cameraTargetRef.current.look.set(2.4, 1.0, 0.9);
    } else {
      cameraTargetRef.current.pos.set(0, 4.3, 3.9);
      cameraTargetRef.current.look.set(0, 1.2, -2.0);
    }
    cameraTargetRef.current.transitioning = true;
  };

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
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: isSoftwareGl,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const initW = container.clientWidth || 960;
    const initH = container.clientHeight || 560;
    renderer.setSize(initW, initH);
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const handleContextRestored = () => setWebglUnavailable(false);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1224);
    scene.fog = new THREE.FogExp2(0x0b1224, 0.026);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const initAspect = initW / initH;
    const camera = new THREE.PerspectiveCamera(
      initAspect < 1 ? Math.min(68, 45 / Math.max(initAspect, 0.58)) : 45,
      initAspect,
      0.1,
      100,
    );
    camera.position.set(0, 6.4, 8.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.target.set(0, 0.4, 0);
    controls.addEventListener('start', () => {
      cameraTargetRef.current.transitioning = false;
    });

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.88);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    // 1. Optical Breadboard Table
    const tableGroup = new THREE.Group();
    const breadboardTex = createBreadboardTexture();
    breadboardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const tableTopMat = new THREE.MeshStandardMaterial({
      map: breadboardTex,
      roughness: 0.45,
      metalness: 0.45,
    });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.3, 6.0), tableTopMat);
    tableTop.position.set(0, -0.15, 0);
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 6.2), trimMat);
    trim.position.set(0, -0.26, 0);
    tableGroup.add(trim);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 2.4, 4.8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 }),
    );
    pedestal.position.set(0, -1.5, 0);
    tableGroup.add(pedestal);
    scene.add(tableGroup);

    // 2. DC Power Supply / Battery Pack
    const batteryGroup = new THREE.Group();
    batteryGroup.position.set(-2.6, 0, 1.0);
    const batBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.85, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.55 }),
    );
    batBase.position.y = 0.425;
    batBase.castShadow = true;
    batteryGroup.add(batBase);

    const batTopPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.12, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.7 }),
    );
    batTopPlate.position.y = 0.9;
    batteryGroup.add(batTopPlate);

    const posTerm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.4 }),
    );
    posTerm.position.set(0.42, 1.04, 0.24);
    batteryGroup.add(posTerm);

    const negTerm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 }),
    );
    negTerm.position.set(-0.42, 1.04, 0.24);
    batteryGroup.add(negTerm);

    const batStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
      }),
    );
    batStrip.position.set(0, 0.6, 0.66);
    batteryGroup.add(batStrip);
    scene.add(batteryGroup);

    // 3. Interactive Pushbutton Switch
    const switchGroup = new THREE.Group();
    switchGroup.position.set(0, 0, 1.9);
    const swBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.22, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.4 }),
    );
    swBase.position.y = 0.11;
    swBase.castShadow = true;
    switchGroup.add(swBase);

    const switchCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.25, metalness: 0.2 }),
    );
    switchCap.position.y = 0.23;
    switchCap.name = 'circuit-switch-cap';
    switchGroup.add(switchCap);

    const switchLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.2,
    });
    const swLed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), switchLedMat);
    swLed.position.set(0, 0.18, 0.46);
    switchGroup.add(swLed);
    scene.add(switchGroup);
    screenRefs.current.switchCap = switchCap;
    screenRefs.current.switchLedMat = switchLedMat;

    // 4. Variable Resistor / Rheostat
    const resistorGroup = new THREE.Group();
    resistorGroup.position.set(0, 0, 0.3);

    const resBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.18, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 }),
    );
    resBase.position.y = 0.09;
    resBase.castShadow = true;
    resistorGroup.add(resBase);

    const ceramicCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 1.9, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.1 }),
    );
    ceramicCore.rotation.z = Math.PI / 2;
    ceramicCore.position.y = 0.48;
    resistorGroup.add(ceramicCore);

    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85,
    });
    for (let i = -8; i <= 8; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 10, 24), coilMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(i * 0.1, 0.48, 0);
      resistorGroup.add(ring);
    }

    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 12), trimMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = 0.86;
    resistorGroup.add(rail);

    const wiperGroup = new THREE.Group();
    wiperGroup.position.set(-0.3, 0.86, 0);
    const wiperBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.22, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.4 }),
    );
    wiperGroup.add(wiperBody);
    const wiperContact = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.16), coilMat);
    wiperContact.position.y = -0.22;
    wiperGroup.add(wiperContact);
    resistorGroup.add(wiperGroup);
    screenRefs.current.wiperGroup = wiperGroup;
    scene.add(resistorGroup);

    // 5. Incandescent Bulb Assembly
    const bulbGroup = new THREE.Group();
    bulbGroup.position.set(2.5, 0, 1.0);
    const bulbStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.68, 0.24, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 }),
    );
    bulbStand.position.y = 0.12;
    bulbStand.castShadow = true;
    bulbGroup.add(bulbStand);

    const brassSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 24), coilMat);
    brassSocket.position.y = 0.38;
    bulbGroup.add(brassSocket);

    const filamentMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const filament = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 10, 24, Math.PI * 1.4),
      filamentMat,
    );
    filament.position.y = 0.78;
    filament.rotation.z = -Math.PI * 0.2;
    bulbGroup.add(filament);

    const glassBulbMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.42,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const glassDome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 28, 22), glassBulbMat);
    glassDome.position.y = 0.84;
    glassDome.renderOrder = 3;
    bulbGroup.add(glassDome);

    const bulbLight = new THREE.PointLight(0xfde047, 2.5, 7, 1.6);
    bulbLight.position.set(0, 0.9, 0);
    bulbGroup.add(bulbLight);
    scene.add(bulbGroup);
    screenRefs.current.filamentMat = filamentMat;
    screenRefs.current.bulbLight = bulbLight;

    // 6. Digital Ammeter & Voltmeter Stands
    const createMeterStand = (
      x: number,
      title: string,
      val: string,
      unit: string,
      ratio: number,
      accent: string,
    ) => {
      const g = new THREE.Group();
      g.position.set(x, 0, -1.9);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.24, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 }),
      );
      foot.position.y = 0.12;
      foot.castShadow = true;
      g.add(foot);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.45, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.6 }),
      );
      frame.position.set(0, 0.96, -0.06);
      frame.rotation.x = -0.14;
      frame.castShadow = true;
      g.add(frame);

      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 260;
      drawMeterScreen(canvas, title, val, unit, ratio, accent);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.02, 1.26),
        new THREE.MeshBasicMaterial({ map: tex }),
      );
      screenMesh.position.set(0, 0.96, 0.03);
      screenMesh.rotation.x = -0.14;
      g.add(screenMesh);

      scene.add(g);
      return { canvas, tex };
    };

    const ammeter = createMeterStand(
      -1.45,
      'AMMETER (I)',
      simRef.current.current.toFixed(2),
      'A',
      simRef.current.current / 12,
      '#38BDF8',
    );
    const voltmeter = createMeterStand(
      1.45,
      'VOLTMETER (V)',
      simRef.current.voltage.toFixed(1),
      'V',
      simRef.current.voltage / 24,
      '#F59E0B',
    );
    screenRefs.current.ammeterCanvas = ammeter.canvas;
    screenRefs.current.ammeterTex = ammeter.tex;
    screenRefs.current.voltmeterCanvas = voltmeter.canvas;
    screenRefs.current.voltmeterTex = voltmeter.tex;

    // 7. Color-coded Series Wire Loop + Parallel Voltmeter Sense Leads + Charge Particles
    const feedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.18, 0.95, 1.24),
      new THREE.Vector3(-1.3, 0.24, 1.9),
      new THREE.Vector3(0, 0.18, 1.9),
      new THREE.Vector3(1.5, 0.22, 1.9),
      new THREE.Vector3(2.5, 0.32, 1.2),
    ]);
    const returnCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.5, 0.32, 0.4),
      new THREE.Vector3(1.2, 0.38, 0.3),
      new THREE.Vector3(-1.2, 0.38, 0.3),
      new THREE.Vector3(-1.45, 0.24, -1.55),
      new THREE.Vector3(-2.8, 0.3, -0.5),
      new THREE.Vector3(-3.02, 0.95, 1.24),
    ]);

    const feedWireGeo = new THREE.TubeGeometry(feedCurve, 48, 0.048, 10, false);
    const feedWireMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      metalness: 0.4,
    });
    scene.add(new THREE.Mesh(feedWireGeo, feedWireMat));

    const retWireGeo = new THREE.TubeGeometry(returnCurve, 64, 0.048, 10, false);
    const retWireMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.35,
      metalness: 0.4,
    });
    scene.add(new THREE.Mesh(retWireGeo, retWireMat));

    // Parallel Voltmeter probe leads across the load
    const senseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.15, 0.24, -1.55),
      new THREE.Vector3(1.15, 0.2, 0.3),
      new THREE.Vector3(1.75, 0.2, 0.3),
      new THREE.Vector3(1.75, 0.24, -1.55),
    ]);
    const senseGeo = new THREE.TubeGeometry(senseCurve, 32, 0.032, 8, false);
    const senseMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.35,
    });
    scene.add(new THREE.Mesh(senseGeo, senseMat));

    // Closed full-loop curve for electron/charge particle animation
    const fullLoop = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-2.18, 0.95, 1.24),
        new THREE.Vector3(-1.3, 0.24, 1.9),
        new THREE.Vector3(0, 0.18, 1.9),
        new THREE.Vector3(1.5, 0.22, 1.9),
        new THREE.Vector3(2.5, 0.32, 1.2),
        new THREE.Vector3(2.5, 0.32, 0.4),
        new THREE.Vector3(1.2, 0.38, 0.3),
        new THREE.Vector3(-1.2, 0.38, 0.3),
        new THREE.Vector3(-1.45, 0.24, -1.55),
        new THREE.Vector3(-2.8, 0.3, -0.5),
        new THREE.Vector3(-3.02, 0.95, 1.24),
      ],
      true,
      'catmullrom',
      0.25,
    );

    const PARTICLE_COUNT = 36;
    const particleGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const particles = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particles.frustumCulled = false;
    scene.add(particles);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(switchCap, false);
      if (hits.length > 0) {
        setSwitchClosed((prev) => {
          const next = !prev;
          setTestedSwitch(true);
          setLastInteractionNote(
            next
              ? 'Circuit closed! Charges flow at I = V / R.'
              : 'Circuit opened — current drops to 0.00 A immediately.',
          );
          return next;
        });
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    const updateMarkers = () => {
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 560;
      COMPONENT_MARKERS.forEach((m) => {
        const el = markerRefs.current[m.id];
        if (!el) return;
        if (!showLabelsRef.current) {
          el.style.opacity = '0';
          return;
        }
        _labelProj.copy(m.pos).project(camera);
        const visible = _labelProj.z < 1 && _labelProj.z > -1;
        const sx = ((_labelProj.x + 1) / 2) * w;
        const sy = ((-_labelProj.y + 1) / 2) * h;
        el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
        el.style.opacity = visible ? '1' : '0';
      });
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 560;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? Math.min(68, 45 / Math.max(aspect, 0.58)) : 45;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
      updateMarkers();
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let chargeOffset = 0;
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
      const delta = Math.min(0.08, clock.getDelta());
      const { current: cur, switchClosed: closed } = simRef.current;

      if (closed && cur > 0) {
        chargeOffset = (chargeOffset + delta * (0.04 + cur * 0.032)) % 1;
      }
      const scaleVal = closed ? 1 : 0.45;
      _tempScale.set(scaleVal, scaleVal, scaleVal);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = (i / PARTICLE_COUNT + chargeOffset) % 1;
        fullLoop.getPointAt(t, _tempVec);
        _tempMatrix.compose(_tempVec, _tempQuat, _tempScale);
        particles.setMatrixAt(i, _tempMatrix);
      }
      particles.instanceMatrix.needsUpdate = true;

      if (cameraTargetRef.current.transitioning) {
        const k = 1 - Math.exp(-5.5 * delta);
        camera.position.lerp(cameraTargetRef.current.pos, k);
        controls.target.lerp(cameraTargetRef.current.look, k);
        if (camera.position.distanceTo(cameraTargetRef.current.pos) < 0.04) {
          cameraTargetRef.current.transitioning = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      updateMarkers();

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      feedWireGeo.dispose();
      feedWireMat.dispose();
      retWireGeo.dispose();
      retWireMat.dispose();
      senseGeo.dispose();
      senseMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      breadboardTex.dispose();
      ammeter.tex.dispose();
      voltmeter.tex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleVoltageChange = (v: number) => {
    setVoltage(v);
    if (v >= 18) setTestedHighV(true);
    recordLabObservation(v, resistance);
    const nextI = (v / resistance).toFixed(2);
    setLastInteractionNote(`${v} V / ${resistance} Ω = ${nextI} A`);
  };

  const handleResistanceChange = (r: number) => {
    setResistance(r);
    if (r >= 12) setTestedHighR(true);
    recordLabObservation(voltage, r);
    const nextI = (voltage / r).toFixed(2);
    setLastInteractionNote(`${voltage} V / ${r} Ω = ${nextI} A`);
  };

  const handleRecordReading = () => {
    setLabLogs((prev) => [
      {
        id: Date.now(),
        voltage: switchClosed ? voltage : 0,
        resistance,
        current,
        power,
      },
      ...prev.slice(0, 4),
    ]);
    recordLabObservation(voltage, resistance);
    showToast(`Logged: ${voltage} V / ${resistance} Ω = ${current.toFixed(2)} A`);
  };

  const handleReset = () => {
    setVoltage(12);
    setResistance(6);
    setSwitchClosed(true);
    resetLabExperiment();
    selectPreset('bench');
    setLastInteractionNote('Reset: 12 V / 6 Ω = 2.00 A');
  };

  const handleContinue = () => {
    completeLabExperiment(voltage, resistance);
    navigate('counterfactual');
  };

  return (
    <div className="relative flex-1 min-h-[540px] bg-[#070B19] overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-[420px] w-full">
        {!webglUnavailable ? (
          <div
            ref={mountRef}
            className="absolute inset-0 h-full w-full"
            aria-label="3D Ohm's Law Physics Laboratory Workbench"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1224] p-8 text-center">
            <h2 className="font-display text-2xl font-bold text-white">
              Ohm’s Law Bench Schematic View
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              WebGL preview is paused in this browser. Real-time Ohm’s Law calculations remain active below.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-white/15 bg-[#101935] p-6 font-mono">
              <div>
                <div className="text-xs text-slate-400">Voltage</div>
                <div className="text-2xl font-bold text-amber-300 tabular-nums">
                  {switchClosed ? voltage : 0} V
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Resistance</div>
                <div className="text-2xl font-bold text-cyan-300 tabular-nums">
                  {resistance} Ω
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Current (V/R)</div>
                <div className="text-2xl font-bold text-emerald-300 tabular-nums">
                  {current.toFixed(2)} A
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projected 3D Component Callout Tags */}
        {!webglUnavailable && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            {COMPONENT_MARKERS.map((m) => (
              <div
                key={m.id}
                ref={(el) => {
                  markerRefs.current[m.id] = el;
                }}
                className="absolute left-0 top-0 rounded-lg border border-white/15 bg-[#081229]/88 px-2 py-0.5 text-[10px] font-semibold text-slate-100 whitespace-nowrap shadow transition-opacity duration-150"
              >
                {m.label}
              </div>
            ))}
          </div>
        )}

        {/* Top Responsive HUD Bar */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 sm:left-4 sm:right-4 sm:top-4 z-20 flex flex-col lg:flex-row lg:items-start justify-between gap-2.5">
          {/* Top-Left Live Instrument Readout & Camera Bar */}
          <div className="pointer-events-auto flex flex-col gap-2 w-full sm:w-auto sm:max-w-sm">
            <div className="rounded-2xl border border-white/15 bg-[#091228]/92 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-display text-sm sm:text-base font-bold text-white">
                  Ohm’s Law Lab (I = V / R)
                </h1>
                <span
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                    switchClosed
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {switchClosed ? 'Closed' : 'Open'}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-2 border-t border-white/10 pt-2 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">V</div>
                  <div className="text-sm font-bold text-amber-300 tabular-nums">
                    {switchClosed ? voltage : 0} V
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">R</div>
                  <div className="text-sm font-bold text-sky-300 tabular-nums">
                    {resistance} Ω
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">I</div>
                  <div className="text-sm font-bold text-emerald-300 tabular-nums">
                    {current.toFixed(2)} A
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">P</div>
                  <div className="text-sm font-bold text-purple-300 tabular-nums">
                    {power.toFixed(1)} W
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#091228]/90 p-1 w-fit">
              {(
                [
                  { id: 'bench', label: 'Bench' },
                  { id: 'bulb', label: 'Bulb' },
                  { id: 'meters', label: 'Meters' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    cameraPreset === p.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>{p.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowLabels((s) => !s)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  showLabels
                    ? 'bg-white/10 text-cyan-200'
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <Tag className="h-3 w-3" />
                <span>Labels</span>
              </button>
            </div>
          </div>

          {/* Top-Right Compact Lab Guide */}
          <div className="pointer-events-auto w-full sm:w-80 shrink-0">
            <div className="rounded-2xl border border-white/15 bg-[#091228]/92 p-3.5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <SafeImage
                    src={ASSETS.mentorAvatar}
                    alt="Lab Guide"
                    width={1024}
                    height={1024}
                    fallbackLabel="PN"
                    className="h-8 w-8 rounded-lg object-cover border border-cyan-400/40 bg-slate-800 shrink-0"
                  />
                  <div className="text-xs font-semibold text-white">Lab Guide</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMentorOpen((v) => !v)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label={mentorOpen ? 'Collapse guide' : 'Expand guide'}
                >
                  {mentorOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {mentorOpen && (
                <div className="mt-2.5 space-y-2.5 border-t border-white/10 pt-2.5 text-xs">
                  <p className="font-mono text-cyan-200">{lastInteractionNote}</p>

                  {/* Tasks */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
                      <ClipboardList className="h-3.5 w-3.5 text-cyan-300" />
                      <span>Tasks</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        testedHighR ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          testedHighR ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span>Set Resistance ≥ 12 Ω</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        testedHighV ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          testedHighV ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span>Set Voltage ≥ 18 V</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        testedSwitch ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          testedSwitch ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span>Toggle circuit switch</span>
                    </div>
                  </div>

                  {/* Observation Log */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        Readings ({labLogs.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleRecordReading}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Log</span>
                      </button>
                    </div>
                    <div className="max-h-20 overflow-y-auto rounded-lg border border-white/10 bg-[#070E20] divide-y divide-white/5 font-mono text-[11px]">
                      {labLogs.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between px-2.5 py-1 text-slate-300 tabular-nums"
                        >
                          <span className="text-amber-300">{row.voltage} V</span>
                          <span className="text-sky-300">{row.resistance} Ω</span>
                          <span className="text-emerald-300 font-semibold">
                            {row.current.toFixed(2)} A
                          </span>
                          <span className="text-slate-400">{row.power.toFixed(1)} W</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Unified Bottom Control Dock */}
        <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(920px,95vw)] flex flex-col items-center">
          <button
            type="button"
            onClick={() => setControlsOpen((o) => !o)}
            className="mb-1.5 inline-flex items-center gap-1.5 rounded-t-xl border border-b-0 border-white/15 bg-[#091228]/95 px-4 py-1 text-xs font-medium text-slate-200 hover:text-white cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-300" />
            <span>{controlsOpen ? 'Hide Controls' : 'Show Controls'}</span>
            {controlsOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {controlsOpen && (
            <div className="w-full rounded-2xl border border-white/15 bg-[#091228]/95 p-4 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="voltage-slider" className="font-semibold text-white">
                      Voltage (V)
                    </label>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {voltage} V
                    </span>
                  </div>
                  <input
                    id="voltage-slider"
                    type="range"
                    min={1}
                    max={24}
                    step={1}
                    value={voltage}
                    onChange={(e) => handleVoltageChange(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="md:col-span-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="resistance-slider" className="font-semibold text-white">
                      Resistance (R)
                    </label>
                    <span className="font-mono font-bold text-cyan-300 tabular-nums">
                      {resistance} Ω
                    </span>
                  </div>
                  <input
                    id="resistance-slider"
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={resistance}
                    onChange={(e) => handleResistanceChange(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestedSwitch(true);
                      setSwitchClosed((s) => !s);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      switchClosed
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                        : 'border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{switchClosed ? 'Switch On' : 'Switch Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      completeLabExperiment(voltage, resistance);
                      openVerificationModal('resistance');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Verify</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
