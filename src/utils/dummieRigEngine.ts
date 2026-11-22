import {
  AiPixelValidationStats,
  AiPoseFidelityLevel,
  DummieAnchorProfile,
  DummieAnchorSection,
  DummieAnchorVisualState,
  DummieChainMoveScope,
  DummieJoint,
  DummieJointAnchor,
  DummiePose,
  DummiePostureModifiers,
  DummieRigType,
  PerspectiveGuidesConfig,
} from '../types';
import { validateAndCleanAiPixelGrid } from './projectContextAi';

export const DEFAULT_JOINT_ANCHOR: DummieJointAnchor = {
  anchored: true,
  linkPosition: true,
  linkRotation: true,
  linkScale: true,
};

export const DEFAULT_SECTION_ANCHORS: Record<DummieAnchorSection, boolean> = {
  head_neck: true,
  arm_left: true,
  arm_right: true,
  torso: true,
  leg_left: true,
  leg_right: true,
  tail: true,
};

export const DUMMIE_ANCHOR_SECTIONS: { id: DummieAnchorSection; label: string }[] = [
  { id: 'head_neck', label: 'Cabeza y cuello' },
  { id: 'arm_left', label: 'Brazo izquierdo' },
  { id: 'arm_right', label: 'Brazo derecho' },
  { id: 'torso', label: 'Tronco' },
  { id: 'leg_left', label: 'Pierna izquierda' },
  { id: 'leg_right', label: 'Pierna derecha' },
  { id: 'tail', label: 'Cola' },
];

export const DEFAULT_DUMMIE_MODIFIERS: DummiePostureModifiers = {
  bodyLean: 0,
  centerOfGravityX: 0,
  weightBalance: 0,
  gazeAngle: 0,
  headTilt: 0,
  armSpread: 1,
  legSpread: 1,
  limbLengthScale: 1,
  autoSymmetry: false,
  skeletonMode: false,
  showBalanceLine: true,
  perspectiveMode: 'light',
  pixelArtSimplified: false,
  displayMode: 'joints_and_volumes',
  showTail: false,
  showEars: false,
  showWings: false,
  showHorns: false,
};

export const DUMMIE_RIG_TEMPLATES: { id: DummieRigType; label: string; category: string }[] = [
  { id: 'male', label: 'Adulto Masculino', category: 'Humanoide' },
  { id: 'female', label: 'Adulto Femenino', category: 'Humanoide' },
  { id: 'child', label: 'Niño / Joven', category: 'Humanoide' },
  { id: 'chibi', label: 'Chibi / SD', category: 'Estilizado' },
  { id: 'anime', label: 'Anime Fighter', category: 'Estilizado' },
  { id: 'muscular', label: 'Musculoso / Heavy', category: 'Humanoide' },
  { id: 'slim', label: 'Delgado / Ágil', category: 'Humanoide' },
  { id: 'quadruped', label: 'Animal Cuadrúpedo', category: 'Criatura' },
  { id: 'bird', label: 'Animal Bípedo / Ave', category: 'Criatura' },
  { id: 'dragon', label: 'Dragón / Alado', category: 'Criatura' },
  { id: 'custom', label: 'Criatura Personalizada', category: 'Personalizado' },
];

export interface DummiePresetDefinition {
  id: string;
  name: string;
  category: string;
  modifiers?: Partial<DummiePostureModifiers>;
}

export const BUILTIN_POSE_PRESETS: DummiePresetDefinition[] = [
  { id: 'idle', name: 'Idle', category: 'Básicas' },
  { id: 'walk', name: 'Caminar', category: 'Locomoción', modifiers: { bodyLean: 5 } },
  { id: 'run', name: 'Correr', category: 'Locomoción', modifiers: { bodyLean: 12 } },
  { id: 'jump', name: 'Saltar', category: 'Locomoción' },
  { id: 'crouch', name: 'Agachado', category: 'Combate' },
  { id: 'light_attack', name: 'Ataque Ligero (Jab)', category: 'Combate', modifiers: { bodyLean: 6 } },
  { id: 'heavy_attack', name: 'Ataque Pesado (Cross)', category: 'Combate', modifiers: { bodyLean: 12 } },
  { id: 'kick', name: 'Patada Alta', category: 'Combate', modifiers: { bodyLean: -10 } },
  { id: 'punch_upper', name: 'Gancho / Shoryu', category: 'Combate' },
  { id: 'guard', name: 'Defensa / Guardia', category: 'Combate', modifiers: { bodyLean: -4 } },
  { id: 'hitstun', name: 'Daño / Hitstun', category: 'Reacción', modifiers: { bodyLean: -14 } },
  { id: 'knockdown', name: 'Caída / Knockdown', category: 'Reacción' },
  { id: 'victory', name: 'Victoria', category: 'Expresión' },
  { id: 'defeat', name: 'Derrota', category: 'Expresión', modifiers: { bodyLean: 8 } },
];

// Helper: compute endpoint from start point, length and angle in degrees
// 0° = right (+X), 90° = down (+Y), -90° = up (-Y), 180° = left (-X)
function fkPoint(x: number, y: number, len: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [x + Math.cos(rad) * len, y + Math.sin(rad) * len];
}

function clamp01(v: number): number {
  return Math.max(0.03, Math.min(0.97, v));
}

interface HumanRigMetrics {
  pelvisY: number;
  spineStep: number; // per spine segment (pelvis->waist->abdomen->ribcage->chest)
  neckLen: number;
  headLen: number;
  headRadius: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  foreArm: number;
  palmLen: number;
  fingerLen: number;
  thigh: number;
  shin: number;
  heelLen: number;
  toeLen: number;
}

function getHumanRigMetrics(rigType: DummieRigType): HumanRigMetrics {
  switch (rigType) {
    case 'chibi':
      return {
        pelvisY: 0.60,
        spineStep: 0.036,
        neckLen: 0.035,
        headLen: 0.095,
        headRadius: 0.095,
        shoulderW: 0.09,
        hipW: 0.06,
        upperArm: 0.09,
        foreArm: 0.08,
        palmLen: 0.035,
        fingerLen: 0.03,
        thigh: 0.10,
        shin: 0.10,
        heelLen: 0.032,
        toeLen: 0.048,
      };
    case 'child':
      return {
        pelvisY: 0.56,
        spineStep: 0.046,
        neckLen: 0.04,
        headLen: 0.072,
        headRadius: 0.068,
        shoulderW: 0.095,
        hipW: 0.065,
        upperArm: 0.11,
        foreArm: 0.095,
        palmLen: 0.036,
        fingerLen: 0.032,
        thigh: 0.13,
        shin: 0.13,
        heelLen: 0.032,
        toeLen: 0.048,
      };
    case 'female':
      return {
        pelvisY: 0.52,
        spineStep: 0.052,
        neckLen: 0.045,
        headLen: 0.068,
        headRadius: 0.052,
        shoulderW: 0.102,
        hipW: 0.078,
        upperArm: 0.125,
        foreArm: 0.11,
        palmLen: 0.038,
        fingerLen: 0.034,
        thigh: 0.155,
        shin: 0.155,
        heelLen: 0.032,
        toeLen: 0.052,
      };
    case 'anime':
      return {
        pelvisY: 0.51,
        spineStep: 0.056,
        neckLen: 0.048,
        headLen: 0.072,
        headRadius: 0.056,
        shoulderW: 0.12,
        hipW: 0.075,
        upperArm: 0.135,
        foreArm: 0.12,
        palmLen: 0.04,
        fingerLen: 0.035,
        thigh: 0.165,
        shin: 0.165,
        heelLen: 0.035,
        toeLen: 0.055,
      };
    case 'muscular':
      return {
        pelvisY: 0.54,
        spineStep: 0.056,
        neckLen: 0.04,
        headLen: 0.066,
        headRadius: 0.052,
        shoulderW: 0.16,
        hipW: 0.092,
        upperArm: 0.145,
        foreArm: 0.125,
        palmLen: 0.044,
        fingerLen: 0.036,
        thigh: 0.162,
        shin: 0.155,
        heelLen: 0.038,
        toeLen: 0.058,
      };
    case 'slim':
      return {
        pelvisY: 0.50,
        spineStep: 0.058,
        neckLen: 0.05,
        headLen: 0.068,
        headRadius: 0.048,
        shoulderW: 0.098,
        hipW: 0.064,
        upperArm: 0.132,
        foreArm: 0.12,
        palmLen: 0.036,
        fingerLen: 0.032,
        thigh: 0.165,
        shin: 0.168,
        heelLen: 0.03,
        toeLen: 0.05,
      };
    case 'dragon':
    case 'custom':
      return {
        pelvisY: 0.53,
        spineStep: 0.054,
        neckLen: 0.048,
        headLen: 0.07,
        headRadius: 0.058,
        shoulderW: 0.13,
        hipW: 0.085,
        upperArm: 0.135,
        foreArm: 0.12,
        palmLen: 0.042,
        fingerLen: 0.038,
        thigh: 0.155,
        shin: 0.155,
        heelLen: 0.038,
        toeLen: 0.058,
      };
    case 'male':
    default:
      return {
        pelvisY: 0.52,
        spineStep: 0.055,
        neckLen: 0.045,
        headLen: 0.07,
        headRadius: 0.055,
        shoulderW: 0.125,
        hipW: 0.078,
        upperArm: 0.135,
        foreArm: 0.118,
        palmLen: 0.04,
        fingerLen: 0.035,
        thigh: 0.158,
        shin: 0.158,
        heelLen: 0.035,
        toeLen: 0.055,
      };
  }
}

interface HumanPoseAngles {
  pelvisOffsetX: number;
  pelvisOffsetY: number;
  spineDeg: number; // -90 is straight up
  headDeg: number;
  armL: [number, number, number]; // upperArm, foreArm, hand
  armR: [number, number, number];
  legL: [number, number, number]; // thigh, shin, foot (90 = down)
  legR: [number, number, number];
  shoulderFactor?: number;
}

function getHumanPresetAngles(presetId: string): HumanPoseAngles {
  switch (presetId) {
    case 'walk':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: 0.01,
        spineDeg: -84,
        headDeg: -88,
        armL: [115, 75, 70],
        armR: [55, 25, 15],
        legL: [118, 128, 30],
        legR: [62, 85, 5],
      };
    case 'run':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: 0.03,
        spineDeg: -68,
        headDeg: -80,
        armL: [135, 55, 45],
        armR: [32, -25, -30],
        legL: [135, 162, 65],
        legR: [42, 108, 15],
      };
    case 'jump':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: -0.09,
        spineDeg: -84,
        headDeg: -95,
        armL: [-135, -110, -105],
        armR: [-45, -70, -75],
        legL: [120, 145, 55],
        legR: [45, 118, 30],
      };
    case 'crouch':
      return {
        pelvisOffsetX: -0.02,
        pelvisOffsetY: 0.14,
        spineDeg: -72,
        headDeg: -86,
        armL: [105, 35, 20],
        armR: [65, 5, -10],
        legL: [148, 65, 0],
        legR: [32, 112, 0],
      };
    case 'light_attack':
      return {
        pelvisOffsetX: 0.01,
        pelvisOffsetY: 0.02,
        spineDeg: -80,
        headDeg: -86,
        armL: [120, 35, 15],
        armR: [-2, -2, -2],
        legL: [118, 112, 5],
        legR: [62, 82, 0],
      };
    case 'heavy_attack':
      return {
        pelvisOffsetX: 0.03,
        pelvisOffsetY: 0.04,
        spineDeg: -68,
        headDeg: -82,
        armL: [152, 170, 175],
        armR: [-8, -10, -10],
        legL: [135, 128, 10],
        legR: [48, 86, 0],
      };
    case 'kick':
      return {
        pelvisOffsetX: -0.03,
        pelvisOffsetY: 0.01,
        spineDeg: -106,
        headDeg: -92,
        armL: [135, 95, 80],
        armR: [40, -10, -15],
        legL: [94, 92, 0],
        legR: [-22, -26, -35],
      };
    case 'punch_upper':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: -0.06,
        spineDeg: -84,
        headDeg: -94,
        armL: [125, 65, 50],
        armR: [-55, -88, -90],
        legL: [110, 125, 25],
        legR: [55, 112, 20],
      };
    case 'guard':
      return {
        pelvisOffsetX: -0.02,
        pelvisOffsetY: 0.03,
        spineDeg: -94,
        headDeg: -88,
        armL: [62, -52, -70],
        armR: [45, -62, -80],
        legL: [114, 108, 5],
        legR: [65, 86, 0],
      };
    case 'hitstun':
      return {
        pelvisOffsetX: -0.02,
        pelvisOffsetY: 0.02,
        spineDeg: -112,
        headDeg: -128,
        armL: [155, 172, 178],
        armR: [35, 50, 55],
        legL: [115, 112, 5],
        legR: [62, 82, 0],
      };
    case 'knockdown':
      return {
        pelvisOffsetX: 0.02,
        pelvisOffsetY: 0.25,
        spineDeg: -175,
        headDeg: -162,
        armL: [-155, -135, -130],
        armR: [15, 5, 0],
        legL: [-8, 12, 30],
        legR: [6, 20, 40],
        shoulderFactor: 0.55,
      };
    case 'victory':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: 0,
        spineDeg: -90,
        headDeg: -92,
        armL: [-125, -108, -98],
        armR: [-55, -72, -82],
        legL: [102, 95, 5],
        legR: [78, 85, 0],
      };
    case 'defeat':
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: 0.18,
        spineDeg: -70,
        headDeg: 25,
        armL: [112, 95, 88],
        armR: [68, 85, 92],
        legL: [135, 175, 165],
        legR: [45, 5, 15],
      };
    case 'idle':
    default:
      return {
        pelvisOffsetX: 0,
        pelvisOffsetY: 0,
        spineDeg: -90,
        headDeg: -90,
        armL: [112, 98, 92],
        armR: [68, 82, 88],
        legL: [100, 93, 0],
        legR: [80, 87, 0],
      };
  }
}

function buildHumanoidPoseJoints(rigType: DummieRigType, presetId: string): DummieJoint[] {
  const m = getHumanRigMetrics(rigType);
  const a = getHumanPresetAngles(presetId);

  const px = 0.5 + a.pelvisOffsetX;
  const py = m.pelvisY + a.pelvisOffsetY;

  const [waistX, waistY] = fkPoint(px, py, m.spineStep, a.spineDeg);
  const [abX, abY] = fkPoint(waistX, waistY, m.spineStep, a.spineDeg);
  const [ribX, ribY] = fkPoint(abX, abY, m.spineStep, a.spineDeg);
  const [chestX, chestY] = fkPoint(ribX, ribY, m.spineStep, a.spineDeg);
  const [neckX, neckY] = fkPoint(chestX, chestY, m.neckLen, a.spineDeg * 0.65 + a.headDeg * 0.35);
  const [headX, headY] = fkPoint(neckX, neckY, m.headLen, a.headDeg);

  // Perpendicular axis to spine for shoulders & hips
  const perpDeg = a.spineDeg + 90;
  const sf = a.shoulderFactor ?? 1;
  const [shLX, shLY] = fkPoint(chestX, chestY, m.shoulderW * sf, perpDeg + 180);
  const [shRX, shRY] = fkPoint(chestX, chestY, m.shoulderW * sf, perpDeg);

  const [elLX, elLY] = fkPoint(shLX, shLY, m.upperArm, a.armL[0]);
  const [wrLX, wrLY] = fkPoint(elLX, elLY, m.foreArm, a.armL[1]);
  const [paLX, paLY] = fkPoint(wrLX, wrLY, m.palmLen, a.armL[2]);
  const [fiLX, fiLY] = fkPoint(paLX, paLY, m.fingerLen, a.armL[2]);

  const [elRX, elRY] = fkPoint(shRX, shRY, m.upperArm, a.armR[0]);
  const [wrRX, wrRY] = fkPoint(elRX, elRY, m.foreArm, a.armR[1]);
  const [paRX, paRY] = fkPoint(wrRX, wrRY, m.palmLen, a.armR[2]);
  const [fiRX, fiRY] = fkPoint(paRX, paRY, m.fingerLen, a.armR[2]);

  const [hipLX, hipLY] = fkPoint(px, py, m.hipW * sf, perpDeg + 180);
  const [hipRX, hipRY] = fkPoint(px, py, m.hipW * sf, perpDeg);

  const [knLX, knLY] = fkPoint(hipLX, hipLY, m.thigh, a.legL[0]);
  const [anLX, anLY] = fkPoint(knLX, knLY, m.shin, a.legL[1]);
  const [heLX, heLY] = fkPoint(anLX, anLY, m.heelLen, a.legL[2] + 150);
  const [toLX, toLY] = fkPoint(anLX, anLY, m.toeLen, a.legL[2] + 22);

  const [knRX, knRY] = fkPoint(hipRX, hipRY, m.thigh, a.legR[0]);
  const [anRX, anRY] = fkPoint(knRX, knRY, m.shin, a.legR[1]);
  const [heRX, heRY] = fkPoint(anRX, anRY, m.heelLen, a.legR[2] + 150);
  const [toRX, toRY] = fkPoint(anRX, anRY, m.toeLen, a.legR[2] + 22);

  const joints: DummieJoint[] = [
    { id: 'pelvis', label: 'Pelvis', parentId: null, x: clamp01(px), y: clamp01(py), depth: 0, rx: 0, ry: 0, rz: 0, group: 'torso' },
    { id: 'abdomen', label: 'Abdomen', parentId: 'pelvis', x: clamp01(abX), y: clamp01(abY), depth: 0.02, rx: 0, ry: 0, rz: 0, group: 'torso' },
    { id: 'chest', label: 'Pecho', parentId: 'abdomen', x: clamp01(chestX), y: clamp01(chestY), depth: 0.04, rx: 0, ry: 0, rz: 0, group: 'torso' },
    { id: 'neck', label: 'Cuello', parentId: 'chest', x: clamp01(neckX), y: clamp01(neckY), depth: 0.03, rx: 0, ry: 0, rz: 0, group: 'head' },
    { id: 'head', label: 'Cabeza', parentId: 'neck', x: clamp01(headX), y: clamp01(headY), radius: m.headRadius, depth: 0.08, rx: 0, ry: 12, rz: 0, group: 'head' },

    { id: 'shoulder_l', label: 'Hombro Izq', parentId: 'chest', x: clamp01(shLX), y: clamp01(shLY), mirrorId: 'shoulder_r', depth: -0.06, group: 'arm_l' },
    { id: 'elbow_l', label: 'Codo Izq', parentId: 'shoulder_l', x: clamp01(elLX), y: clamp01(elLY), mirrorId: 'elbow_r', depth: -0.08, group: 'arm_l' },
    { id: 'wrist_l', label: 'Muñeca / Mano Izq', parentId: 'elbow_l', x: clamp01(wrLX), y: clamp01(wrLY), mirrorId: 'wrist_r', depth: -0.05, group: 'arm_l' },

    { id: 'shoulder_r', label: 'Hombro Der', parentId: 'chest', x: clamp01(shRX), y: clamp01(shRY), mirrorId: 'shoulder_l', depth: 0.08, group: 'arm_r' },
    { id: 'elbow_r', label: 'Codo Der', parentId: 'shoulder_r', x: clamp01(elRX), y: clamp01(elRY), mirrorId: 'elbow_l', depth: 0.14, group: 'arm_r' },
    { id: 'wrist_r', label: 'Muñeca / Mano Der', parentId: 'elbow_r', x: clamp01(wrRX), y: clamp01(wrRY), mirrorId: 'wrist_l', depth: 0.18, group: 'arm_r' },

    { id: 'hip_l', label: 'Muslo / Cadera Izq', parentId: 'pelvis', x: clamp01(hipLX), y: clamp01(hipLY), mirrorId: 'hip_r', depth: -0.05, group: 'leg_l' },
    { id: 'knee_l', label: 'Rodilla Izq', parentId: 'hip_l', x: clamp01(knLX), y: clamp01(knLY), mirrorId: 'knee_r', depth: -0.04, group: 'leg_l' },
    { id: 'ankle_l', label: 'Tobillo / Pie Izq', parentId: 'knee_l', x: clamp01(anLX), y: clamp01(anLY), mirrorId: 'ankle_r', depth: -0.02, group: 'leg_l' },

    { id: 'hip_r', label: 'Muslo / Cadera Der', parentId: 'pelvis', x: clamp01(hipRX), y: clamp01(hipRY), mirrorId: 'hip_l', depth: 0.06, group: 'leg_r' },
    { id: 'knee_r', label: 'Rodilla Der', parentId: 'hip_r', x: clamp01(knRX), y: clamp01(knRY), mirrorId: 'knee_l', depth: 0.10, group: 'leg_r' },
    { id: 'ankle_r', label: 'Tobillo / Pie Der', parentId: 'knee_r', x: clamp01(anRX), y: clamp01(anRY), mirrorId: 'ankle_l', depth: 0.08, group: 'leg_r' },
  ];

  // Creature / optional articulated appendages
  if (rigType === 'dragon' || rigType === 'custom') {
    const tailAngle = presetId === 'knockdown' ? 160 : presetId === 'jump' ? 128 : 145;
    const [tmX, tmY] = fkPoint(px, py, 0.16, tailAngle);
    const [ttX, ttY] = fkPoint(tmX, tmY, 0.15, tailAngle + 15);
    const wingSpread = presetId === 'jump' || presetId === 'victory' ? -145 : presetId === 'guard' ? 115 : -130;
    const [wLX, wLY] = fkPoint(chestX, chestY, 0.22, wingSpread);
    const [wRX, wRY] = fkPoint(chestX, chestY, 0.22, 180 - wingSpread);

    joints.push(
      { id: 'tail_mid', label: 'Cola Media', parentId: 'pelvis', x: clamp01(tmX), y: clamp01(tmY), depth: -0.15, group: 'extra' },
      { id: 'tail_tip', label: 'Punta Cola', parentId: 'tail_mid', x: clamp01(ttX), y: clamp01(ttY), depth: -0.18, group: 'extra' },
      { id: 'wing_l', label: 'Ala Izq', parentId: 'chest', x: clamp01(wLX), y: clamp01(wLY), mirrorId: 'wing_r', depth: -0.18, group: 'extra' },
      { id: 'wing_r', label: 'Ala Der', parentId: 'chest', x: clamp01(wRX), y: clamp01(wRY), mirrorId: 'wing_l', depth: -0.12, group: 'extra' }
    );
  }

  return joints;
}

function buildQuadrupedPoseJoints(presetId: string): DummieJoint[] {
  // Quadruped facing right (+X)
  let px = 0.30;
  let py = 0.50;
  let spineDeg = -6;
  let neckDeg = -48;
  let headDeg = -18;
  let frontL: [number, number] = [84, 92];
  let frontR: [number, number] = [96, 95];
  let backL: [number, number] = [102, 78];
  let backR: [number, number] = [110, 82];
  let tailDeg = -140;

  switch (presetId) {
    case 'walk':
      spineDeg = -4; neckDeg = -42; headDeg = -10;
      frontL = [65, 92]; frontR = [115, 102];
      backL = [125, 76]; backR = [78, 86];
      tailDeg = -132;
      break;
    case 'run':
      py = 0.48; spineDeg = -10; neckDeg = -22; headDeg = -4;
      frontL = [35, 65]; frontR = [52, 80];
      backL = [148, 128]; backR = [155, 138];
      tailDeg = -170;
      break;
    case 'jump':
      py = 0.38; spineDeg = -26; neckDeg = -42; headDeg = -15;
      frontL = [38, 68]; frontR = [48, 78];
      backL = [145, 125]; backR = [152, 132];
      tailDeg = 148;
      break;
    case 'crouch':
      py = 0.64; spineDeg = 4; neckDeg = -28; headDeg = 0;
      frontL = [45, 135]; frontR = [55, 138];
      backL = [132, 48]; backR = [140, 52];
      tailDeg = 175;
      break;
    case 'light_attack':
      py = 0.50; spineDeg = -14; neckDeg = -32; headDeg = -5;
      frontL = [-10, 12]; frontR = [92, 95];
      backL = [118, 72]; backR = [124, 78];
      tailDeg = -150;
      break;
    case 'heavy_attack':
      px = 0.34; py = 0.47; spineDeg = -22; neckDeg = -18; headDeg = 5;
      frontL = [15, 45]; frontR = [25, 55];
      backL = [138, 84]; backR = [144, 92];
      tailDeg = -165;
      break;
    case 'kick':
      px = 0.36; py = 0.48; spineDeg = 12; neckDeg = -35; headDeg = -10;
      frontL = [78, 92]; frontR = [88, 96];
      backL = [168, -172]; backR = [105, 86];
      tailDeg = -110;
      break;
    case 'punch_upper':
      px = 0.38; py = 0.54; spineDeg = -55; neckDeg = -68; headDeg = -25;
      frontL = [-15, -35]; frontR = [20, 45];
      backL = [104, 82]; backR = [112, 86];
      tailDeg = 155;
      break;
    case 'guard':
      py = 0.56; spineDeg = 6; neckDeg = -52; headDeg = -8;
      frontL = [72, 102]; frontR = [84, 104];
      backL = [122, 72]; backR = [130, 76];
      tailDeg = 160;
      break;
    case 'hitstun':
      px = 0.26; py = 0.51; spineDeg = -24; neckDeg = -85; headDeg = -110;
      frontL = [55, 85]; frontR = [68, 95];
      backL = [115, 75]; backR = [122, 82];
      tailDeg = 140;
      break;
    case 'knockdown':
      px = 0.26; py = 0.72; spineDeg = 6; neckDeg = 15; headDeg = 22;
      frontL = [22, 18]; frontR = [36, 28];
      backL = [18, 12]; backR = [30, 22];
      tailDeg = 175;
      break;
    case 'victory':
      px = 0.36; py = 0.52; spineDeg = -46; neckDeg = -82; headDeg = -96;
      frontL = [25, 45]; frontR = [38, 60];
      backL = [102, 82]; backR = [110, 86];
      tailDeg = -125;
      break;
    case 'defeat':
      px = 0.30; py = 0.68; spineDeg = 8; neckDeg = 28; headDeg = 42;
      frontL = [35, 150]; frontR = [42, 155];
      backL = [142, 25]; backR = [148, 30];
      tailDeg = 165;
      break;
    default:
      break;
  }

  const seg = 0.115;
  const [waX, waY] = fkPoint(px, py, seg, spineDeg);
  const [abX, abY] = fkPoint(waX, waY, seg, spineDeg);
  const [chX, chY] = fkPoint(abX, abY, seg, spineDeg);
  const [neX, neY] = fkPoint(chX, chY, 0.10, neckDeg);
  const [heX, heY] = fkPoint(neX, neY, 0.095, headDeg);

  const [fElLX, fElLY] = fkPoint(chX + 0.02, chY + 0.02, 0.15, frontL[0]);
  const [fWrLX, fWrLY] = fkPoint(fElLX, fElLY, 0.15, frontL[1]);
  const [fElRX, fElRY] = fkPoint(chX - 0.03, chY + 0.02, 0.15, frontR[0]);
  const [fWrRX, fWrRY] = fkPoint(fElRX, fElRY, 0.15, frontR[1]);

  const [bKnLX, bKnLY] = fkPoint(px + 0.02, py + 0.02, 0.15, backL[0]);
  const [bAnLX, bAnLY] = fkPoint(bKnLX, bKnLY, 0.15, backL[1]);
  const [bKnRX, bKnRY] = fkPoint(px - 0.03, py + 0.02, 0.15, backR[0]);
  const [bAnRX, bAnRY] = fkPoint(bKnRX, bKnRY, 0.15, backR[1]);

  const [tMX, tMY] = fkPoint(px, py, 0.13, tailDeg);
  const [tTX, tTY] = fkPoint(tMX, tMY, 0.12, tailDeg - 15);

  return [
    { id: 'pelvis', label: 'Pelvis / Anca', parentId: null, x: clamp01(px), y: clamp01(py), group: 'torso' },
    { id: 'waist', label: 'Cintura / Lomo', parentId: 'pelvis', x: clamp01(waX), y: clamp01(waY), group: 'torso' },
    { id: 'abdomen', label: 'Abdomen', parentId: 'waist', x: clamp01(abX), y: clamp01(abY), group: 'torso' },
    { id: 'chest', label: 'Pecho', parentId: 'abdomen', x: clamp01(chX), y: clamp01(chY), group: 'torso' },
    { id: 'neck', label: 'Cuello', parentId: 'chest', x: clamp01(neX), y: clamp01(neY), group: 'head' },
    { id: 'head', label: 'Cabeza', parentId: 'neck', x: clamp01(heX), y: clamp01(heY), radius: 0.055, group: 'head' },

    { id: 'elbow_l', label: 'Rodilla Del. Izq', parentId: 'chest', x: clamp01(fElLX), y: clamp01(fElLY), mirrorId: 'elbow_r', group: 'arm_l' },
    { id: 'wrist_l', label: 'Pata Del. Izq', parentId: 'elbow_l', x: clamp01(fWrLX), y: clamp01(fWrLY), mirrorId: 'wrist_r', group: 'arm_l' },
    { id: 'elbow_r', label: 'Rodilla Del. Der', parentId: 'chest', x: clamp01(fElRX), y: clamp01(fElRY), mirrorId: 'elbow_l', group: 'arm_r' },
    { id: 'wrist_r', label: 'Pata Del. Der', parentId: 'elbow_r', x: clamp01(fWrRX), y: clamp01(fWrRY), mirrorId: 'wrist_l', group: 'arm_r' },

    { id: 'knee_l', label: 'Corvejón Tras. Izq', parentId: 'pelvis', x: clamp01(bKnLX), y: clamp01(bKnLY), mirrorId: 'knee_r', group: 'leg_l' },
    { id: 'ankle_l', label: 'Pata Tras. Izq', parentId: 'knee_l', x: clamp01(bAnLX), y: clamp01(bAnLY), mirrorId: 'ankle_r', group: 'leg_l' },
    { id: 'knee_r', label: 'Corvejón Tras. Der', parentId: 'pelvis', x: clamp01(bKnRX), y: clamp01(bKnRY), mirrorId: 'knee_l', group: 'leg_r' },
    { id: 'ankle_r', label: 'Pata Tras. Der', parentId: 'knee_r', x: clamp01(bAnRX), y: clamp01(bAnRY), mirrorId: 'ankle_l', group: 'leg_r' },

    { id: 'tail_mid', label: 'Cola Media', parentId: 'pelvis', x: clamp01(tMX), y: clamp01(tMY), group: 'extra' },
    { id: 'tail_tip', label: 'Punta Cola', parentId: 'tail_mid', x: clamp01(tTX), y: clamp01(tTY), group: 'extra' },
  ];
}

function buildBirdPoseJoints(presetId: string): DummieJoint[] {
  let px = 0.48;
  let py = 0.56;
  let torsoDeg = -55;
  let neckDeg = -60;
  let headDeg = -15;
  let wL: [number, number] = [140, 118];
  let wR: [number, number] = [38, 62];
  let legL: [number, number] = [100, 12];
  let legR: [number, number] = [80, 12];
  let tailDeg = 148;

  switch (presetId) {
    case 'walk':
      torsoDeg = -48; wL = [148, 125]; wR = [30, 55];
      legL = [112, 18]; legR = [72, 10];
      break;
    case 'run':
      py = 0.54; torsoDeg = -25; neckDeg = -32; headDeg = -5;
      wL = [-145, -165]; wR = [-35, -15];
      legL = [128, 35]; legR = [58, 10];
      break;
    case 'jump':
      py = 0.44; torsoDeg = -50;
      wL = [-145, -165]; wR = [-35, -15];
      legL = [115, 35]; legR = [75, 25];
      break;
    case 'crouch':
      py = 0.66; torsoDeg = -28;
      wL = [148, 155]; wR = [32, 25];
      legL = [132, 5]; legR = [55, 5];
      break;
    case 'light_attack':
      torsoDeg = -22; neckDeg = -10; headDeg = 5;
      wL = [-135, -150]; wR = [-12, -5];
      break;
    case 'heavy_attack':
      py = 0.46; torsoDeg = -15; neckDeg = -5; headDeg = 12;
      wL = [-155, -172]; wR = [-25, -10];
      legL = [140, 40]; legR = [132, 35];
      break;
    case 'kick':
      torsoDeg = -78;
      wL = [-135, -150]; wR = [-45, -30];
      legR = [-10, -25]; legL = [95, 10];
      break;
    case 'punch_upper':
      py = 0.42; torsoDeg = -75;
      wL = [-120, -105]; wR = [-60, -75];
      break;
    case 'guard':
      torsoDeg = -65;
      wL = [80, -70]; wR = [100, -110];
      break;
    case 'hitstun':
      torsoDeg = -105; neckDeg = -125; headDeg = -140;
      wL = [-155, 165]; wR = [-25, 15];
      break;
    case 'knockdown':
      py = 0.76; torsoDeg = -168; neckDeg = -160; headDeg = 175;
      wL = [170, 178]; wR = [10, 2];
      legL = [15, 20]; legR = [8, 12];
      break;
    case 'victory':
      torsoDeg = -68;
      wL = [-130, -112]; wR = [-50, -68];
      break;
    case 'defeat':
      py = 0.68; torsoDeg = -45; neckDeg = 35; headDeg = 55;
      wL = [125, 105]; wR = [55, 75];
      break;
    default:
      break;
  }

  const [chX, chY] = fkPoint(px, py, 0.14, torsoDeg);
  const [neX, neY] = fkPoint(chX, chY, 0.12, neckDeg);
  const [heX, heY] = fkPoint(neX, neY, 0.10, headDeg);

  const [wL1X, wL1Y] = fkPoint(chX, chY, 0.18, wL[0]);
  const [wL2X, wL2Y] = fkPoint(wL1X, wL1Y, 0.19, wL[1]);
  const [wR1X, wR1Y] = fkPoint(chX, chY, 0.18, wR[0]);
  const [wR2X, wR2Y] = fkPoint(wR1X, wR1Y, 0.19, wR[1]);

  const [aLX, aLY] = fkPoint(px - 0.02, py, 0.19, legL[0]);
  const [tLX, tLY] = fkPoint(aLX, aLY, 0.08, legL[1]);
  const [aRX, aRY] = fkPoint(px + 0.03, py, 0.19, legR[0]);
  const [tRX, tRY] = fkPoint(aRX, aRY, 0.08, legR[1]);

  const [taX, taY] = fkPoint(px, py, 0.20, tailDeg);

  return [
    { id: 'pelvis', label: 'Pelvis', parentId: null, x: clamp01(px), y: clamp01(py), group: 'torso' },
    { id: 'chest', label: 'Pecho / Quilla', parentId: 'pelvis', x: clamp01(chX), y: clamp01(chY), group: 'torso' },
    { id: 'neck', label: 'Cuello', parentId: 'chest', x: clamp01(neX), y: clamp01(neY), group: 'head' },
    { id: 'head', label: 'Cabeza / Pico', parentId: 'neck', x: clamp01(heX), y: clamp01(heY), radius: 0.052, group: 'head' },
    { id: 'wing_l_1', label: 'Ala Izq Codo', parentId: 'chest', x: clamp01(wL1X), y: clamp01(wL1Y), mirrorId: 'wing_r_1', group: 'arm_l' },
    { id: 'wing_l_2', label: 'Ala Izq Punta', parentId: 'wing_l_1', x: clamp01(wL2X), y: clamp01(wL2Y), mirrorId: 'wing_r_2', group: 'arm_l' },
    { id: 'wing_r_1', label: 'Ala Der Codo', parentId: 'chest', x: clamp01(wR1X), y: clamp01(wR1Y), mirrorId: 'wing_l_1', group: 'arm_r' },
    { id: 'wing_r_2', label: 'Ala Der Punta', parentId: 'wing_r_1', x: clamp01(wR2X), y: clamp01(wR2Y), mirrorId: 'wing_l_2', group: 'arm_r' },
    { id: 'ankle_l', label: 'Garra Izq', parentId: 'pelvis', x: clamp01(aLX), y: clamp01(aLY), mirrorId: 'ankle_r', group: 'leg_l' },
    { id: 'toe_l', label: 'Dedos Izq', parentId: 'ankle_l', x: clamp01(tLX), y: clamp01(tLY), mirrorId: 'toe_r', group: 'leg_l' },
    { id: 'ankle_r', label: 'Garra Der', parentId: 'pelvis', x: clamp01(aRX), y: clamp01(aRY), mirrorId: 'ankle_l', group: 'leg_r' },
    { id: 'toe_r', label: 'Dedos Der', parentId: 'ankle_r', x: clamp01(tRX), y: clamp01(tRY), mirrorId: 'toe_l', group: 'leg_r' },
    { id: 'tail_tip', label: 'Plumas Cola', parentId: 'pelvis', x: clamp01(taX), y: clamp01(taY), group: 'extra' },
  ];
}

export function createRigJoints(rigType: DummieRigType, presetId: string = 'idle'): DummieJoint[] {
  const baseJoints =
    rigType === 'quadruped'
      ? buildQuadrupedPoseJoints(presetId)
      : rigType === 'bird'
      ? buildBirdPoseJoints(presetId)
      : buildHumanoidPoseJoints(rigType, presetId);
  return autoConfigureDummieAnchorsForRig(baseJoints, rigType);
}

export function applyPresetToDummiePose(
  rigType: DummieRigType,
  presetId: string
): DummiePose {
  const preset = BUILTIN_POSE_PRESETS.find((p) => p.id === presetId) || BUILTIN_POSE_PRESETS[0];
  const joints = createRigJoints(rigType, preset.id);

  return {
    id: `pose-${preset.id}-${Date.now()}`,
    name: preset.name,
    category: preset.category,
    rigType,
    joints,
    modifiers: { ...DEFAULT_DUMMIE_MODIFIERS, ...(preset.modifiers || {}) },
    overlayMode: 'panel',
    overlayOpacity: 0.72,
    overlayColor: '#38bdf8',
    lineWidth: 2.5,
    canvasX: 0,
    canvasY: 0,
    canvasScale: 1,
    chainMoveScope: 'branch',
    rigViewEnabled: false,
    respectPerspective: false,
    sectionAnchors: computeSectionAnchorsFromJoints(joints),
    activeAnchorProfileId: getDefaultAnchorProfileIdForRig(rigType),
  };
}

export interface DummiePerspectiveProjectionInfo {
  active: boolean;
  depthScale: number;
  leanShiftDeg: number;
  feetYCanvasPx: number;
  horizonYCanvasPx: number;
}

/**
 * Computes coherent perspective scaling and directional lean for a Dummie based on
 * where its feet sit relative to the active perspective horizon and ground plane.
 */
export function computeDummiePerspectiveAdjustment(
  pose: DummiePose,
  perspective?: PerspectiveGuidesConfig | null,
  canvasSize?: { width: number; height: number } | null
): DummiePerspectiveProjectionInfo {
  if (!pose.respectPerspective || !perspective || !perspective.enabled || !canvasSize) {
    return {
      active: false,
      depthScale: 1,
      leanShiftDeg: 0,
      feetYCanvasPx: canvasSize ? canvasSize.height * 0.85 : 100,
      horizonYCanvasPx: canvasSize ? canvasSize.height * 0.54 : 64,
    };
  }

  const cw = Math.max(1, canvasSize.width);
  const ch = Math.max(1, canvasSize.height);
  const ankles = pose.joints.filter(
    (j) => j.id.includes('ankle') || j.id.includes('toe')
  );
  const footNormY =
    ankles.length > 0
      ? Math.max(...ankles.map((a) => a.y))
      : 0.86;
  const footNormX =
    ankles.length > 0
      ? ankles.reduce((acc, a) => acc + a.x, 0) / ankles.length
      : 0.5;

  const feetYCanvasPx = pose.canvasY + footNormY * ch * pose.canvasScale;
  const feetXCanvasPx = pose.canvasX + footNormX * cw * pose.canvasScale;
  const horizonYCanvasPx = perspective.horizonY;

  // Isometric / Dimetric / Trimetric maintain uniform depth scale
  if (
    perspective.type === 'isometric' ||
    perspective.type === 'dimetric' ||
    perspective.type === 'trimetric'
  ) {
    return {
      active: true,
      depthScale: 1,
      leanShiftDeg: 0,
      feetYCanvasPx,
      horizonYCanvasPx,
    };
  }

  const floorRefY = ch * Math.max(0.65, perspective.floorGrid?.floorYRatio || 0.92);
  const refSpan = Math.max(12, Math.abs(floorRefY - horizonYCanvasPx));
  const distFromHorizon = feetYCanvasPx - horizonYCanvasPx;
  // Scale shrinks cleanly as character moves closer to horizon, expands in foreground
  const normalizedDepth = Math.max(0.28, Math.min(1.55, distFromHorizon / refSpan));
  const depthScale = Math.max(0.35, Math.min(1.45, 0.35 + normalizedDepth * 0.65));

  // Subtle vertical convergence when 3-point perspective has an active vertical VP
  let leanShiftDeg = 0;
  if (perspective.type === '3point') {
    const vertVp = perspective.vanishingPoints.find(
      (vp) => vp.visible && Math.abs(vp.y - horizonYCanvasPx) > ch * 0.25
    );
    if (vertVp) {
      const dx = vertVp.x - feetXCanvasPx;
      const dy = vertVp.y - feetYCanvasPx;
      if (Math.abs(dy) > 10) {
        const tilt = (Math.atan2(dx, -dy) * 180) / Math.PI;
        leanShiftDeg = Math.max(-14, Math.min(14, tilt * 0.32));
      }
    }
  }

  return {
    active: true,
    depthScale,
    leanShiftDeg,
    feetYCanvasPx,
    horizonYCanvasPx,
  };
}

export function getEffectivePoseJoints(
  pose: DummiePose,
  perspective?: PerspectiveGuidesConfig | null,
  canvasSize?: { width: number; height: number } | null
): DummieJoint[] {
  const { modifiers } = pose;
  const pelvis = pose.joints.find((j) => j.id === 'pelvis') || pose.joints[0];
  if (!pelvis) return pose.joints;
  const perspAdj = computeDummiePerspectiveAdjustment(pose, perspective, canvasSize);
  const leanRad = (((modifiers.bodyLean || 0) + perspAdj.leanShiftDeg) * Math.PI) / 180;
  const headRad = (modifiers.headTilt * Math.PI) / 180;

  // Foot anchor baseline for perspective depth scaling (keeps feet planted on floor!)
  const ankles = pose.joints.filter((j) => j.id.includes('ankle'));
  const footAnchorX =
    ankles.length > 0
      ? ankles.reduce((acc, j) => acc + j.x, 0) / ankles.length
      : pelvis.x;
  const footAnchorY =
    ankles.length > 0
      ? Math.max(...ankles.map((j) => j.y))
      : 0.86;

  return pose.joints.map((j) => {
    let x = j.x;
    let y = j.y;

    // Limb scale relative to pelvis (plus local per-joint scale)
    const effectiveLimbScale = modifiers.limbLengthScale * (j.scale ?? 1);
    if (effectiveLimbScale !== 1 && j.id !== 'pelvis') {
      x = pelvis.x + (x - pelvis.x) * effectiveLimbScale;
      y = pelvis.y + (y - pelvis.y) * effectiveLimbScale;
    }

    // Arm / Leg spread
    if (j.group === 'arm_l' || j.group === 'arm_r') {
      x = pelvis.x + (x - pelvis.x) * modifiers.armSpread;
    }
    if (j.group === 'leg_l' || j.group === 'leg_r') {
      x = pelvis.x + (x - pelvis.x) * modifiers.legSpread;
    }

    // Lean upper body around pelvis
    if (j.group === 'torso' || j.group === 'head' || j.group === 'arm_l' || j.group === 'arm_r') {
      const dx = x - pelvis.x;
      const dy = y - pelvis.y;
      x = pelvis.x + dx * Math.cos(leanRad) - dy * Math.sin(leanRad);
      y = pelvis.y + dx * Math.sin(leanRad) + dy * Math.cos(leanRad);
    }

    // Head tilt + gaze
    if (j.id === 'head') {
      const neck = pose.joints.find((n) => n.id === 'neck') || pelvis;
      const dx = x - neck.x;
      const dy = y - neck.y;
      x = neck.x + dx * Math.cos(headRad) - dy * Math.sin(headRad) + modifiers.gazeAngle * 0.0005;
      y = neck.y + dx * Math.sin(headRad) + dy * Math.cos(headRad);
    }

    // Center of gravity shift
    x += modifiers.centerOfGravityX + modifiers.weightBalance * 0.03;

    // Perspective depth projection around foot contact baseline
    if (perspAdj.active && Math.abs(perspAdj.depthScale - 1) > 0.005) {
      x = footAnchorX + (x - footAnchorX) * perspAdj.depthScale;
      y = footAnchorY + (y - footAnchorY) * perspAdj.depthScale;
    }

    return {
      ...j,
      x: Math.max(0.02, Math.min(0.98, x)),
      y: Math.max(0.02, Math.min(0.98, y)),
    };
  });
}

export interface DetectedSpriteAnatomy {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  headBox: { x: number; y: number; w: number; h: number };
  torsoBox: { x: number; y: number; w: number; h: number };
  armsBox: { x: number; y: number; w: number; h: number };
  legsBox: { x: number; y: number; w: number; h: number };
  pixelCount: number;
}

export function detectCharacterSilhouetteRegions(
  grid: (string | null)[][]
): DetectedSpriteAnatomy | null {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y]?.[x]) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count === 0) return null;

  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: bw,
    height: bh,
    centerX: minX + bw / 2,
    centerY: minY + bh / 2,
    headBox: { x: minX + Math.round(bw * 0.25), y: minY, w: Math.max(2, Math.round(bw * 0.5)), h: Math.max(2, Math.round(bh * 0.26)) },
    torsoBox: { x: minX + Math.round(bw * 0.2), y: minY + Math.round(bh * 0.25), w: Math.max(2, Math.round(bw * 0.6)), h: Math.max(2, Math.round(bh * 0.32)) },
    armsBox: { x: minX, y: minY + Math.round(bh * 0.24), w: bw, h: Math.max(2, Math.round(bh * 0.34)) },
    legsBox: { x: minX + Math.round(bw * 0.12), y: minY + Math.round(bh * 0.56), w: Math.max(2, Math.round(bw * 0.76)), h: Math.max(2, Math.round(bh * 0.44)) },
    pixelCount: count,
  };
}

interface BoneDeformSegment {
  bx0: number;
  by0: number;
  bx1: number;
  by1: number;
  tx0: number;
  ty0: number;
  tx1: number;
  ty1: number;
  baseLen: number;
  tgtLen: number;
  bux: number;
  buy: number;
  tux: number;
  tuy: number;
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-4) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq));
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  const dx = px - projX;
  const dy = py - projY;
  return dx * dx + dy * dy;
}

/**
 * Holistic continuous Inverse-Distance-Weighted (IDW) skeletal bone-segment deformation.
 * Uses smooth inverse coordinate mapping across ALL connected bones rather than rectangular slicing,
 * ensuring the entire character adapts as one cohesive silhouette with zero fragmentation or tearing.
 */
export function retargetSpriteGridToPoseDetailed(
  sourceGrid: (string | null)[][],
  pose: DummiePose,
  canvasWidth: number,
  canvasHeight: number,
  intensity01: number = 1,
  pixelPerfectOutlines: boolean = true,
  poseFidelity: AiPoseFidelityLevel = 'high'
): { grid: (string | null)[][]; stats: AiPixelValidationStats } {
  const out: (string | null)[][] = Array.from({ length: canvasHeight }, () =>
    new Array(canvasWidth).fill(null)
  );
  const anatomy = detectCharacterSilhouetteRegions(sourceGrid);
  if (!anatomy) {
    return {
      grid: out,
      stats: {
        removedOrphans: 0,
        filledHoles: 0,
        prunedFragments: 0,
        repairedEdges: 0,
        quantizedColors: 0,
        totalPixelsAfter: 0,
      },
    };
  }

  const idleJoints = createRigJoints(pose.rigType, 'idle');
  const joints = getEffectivePoseJoints(pose);
  const idleById = new Map(idleJoints.map((j) => [j.id, j]));

  // Fit neutral rig bounds neatly over the sprite's detected silhouette box
  let rigMinX = Infinity, rigMaxX = -Infinity, rigMinY = Infinity, rigMaxY = -Infinity;
  for (const j of idleJoints) {
    if (j.x < rigMinX) rigMinX = j.x;
    if (j.x > rigMaxX) rigMaxX = j.x;
    if (j.y < rigMinY) rigMinY = j.y;
    if (j.y > rigMaxY) rigMaxY = j.y;
  }
  const rigSpanX = Math.max(0.15, rigMaxX - rigMinX);
  const rigSpanY = Math.max(0.15, rigMaxY - rigMinY);

  const fidelityMult =
    poseFidelity === 'exact' ? 1.08 : poseFidelity === 'high' ? 1.0 : poseFidelity === 'medium' ? 0.85 : 0.65;
  const effIntensity = Math.max(0, Math.min(1.25, intensity01 * fidelityMult));

  const mapNormToCanvas = (nx: number, ny: number): [number, number] => [
    anatomy.minX + ((nx - rigMinX) / rigSpanX) * anatomy.width,
    anatomy.minY + ((ny - rigMinY) / rigSpanY) * anatomy.height,
  ];

  // Build paired base -> target positions for all joints
  const basePos = new Map<string, [number, number]>();
  const targetPos = new Map<string, [number, number]>();
  for (const j of joints) {
    const bj = idleById.get(j.id);
    if (!bj) continue;
    const [bx, by] = mapNormToCanvas(bj.x, bj.y);
    const ix = bj.x + (j.x - bj.x) * effIntensity;
    const iy = bj.y + (j.y - bj.y) * effIntensity;
    const [tx, ty] = mapNormToCanvas(ix, iy);
    basePos.set(j.id, [bx, by]);
    targetPos.set(j.id, [tx, ty]);
  }

  // Construct connected bone segments along parent->child hierarchy
  const segments: BoneDeformSegment[] = [];
  for (const j of joints) {
    if (!j.parentId) continue;
    const b0 = basePos.get(j.parentId);
    const b1 = basePos.get(j.id);
    const t0 = targetPos.get(j.parentId);
    const t1 = targetPos.get(j.id);
    if (!b0 || !b1 || !t0 || !t1) continue;

    const bdx = b1[0] - b0[0];
    const bdy = b1[1] - b0[1];
    const baseLen = Math.max(1.5, Math.hypot(bdx, bdy));
    const tdx = t1[0] - t0[0];
    const tdy = t1[1] - t0[1];
    const tgtLen = Math.max(1.5, Math.hypot(tdx, tdy));

    segments.push({
      bx0: b0[0],
      by0: b0[1],
      bx1: b1[0],
      by1: b1[1],
      tx0: t0[0],
      ty0: t0[1],
      tx1: t1[0],
      ty1: t1[1],
      baseLen,
      tgtLen,
      bux: bdx / baseLen,
      buy: bdy / baseLen,
      tux: tdx / tgtLen,
      tuy: tdy / tgtLen,
    });
  }

  // Fallback if rig has no segments
  if (segments.length === 0) {
    const fallbackOut = sourceGrid.map((r) => [...r]);
    return validateAndCleanAiPixelGrid(fallbackOut, 'pose', { repairOutlines: pixelPerfectOutlines });
  }

  // Smooth influence radius scales with character dimensions (prevents rigid block boundaries)
  const charScale = Math.max(6, Math.max(anatomy.width, anatomy.height));
  const sigma =
    poseFidelity === 'exact'
      ? Math.max(2.5, charScale * 0.085)
      : poseFidelity === 'high'
      ? Math.max(3.0, charScale * 0.11)
      : Math.max(3.5, charScale * 0.15);
  const sigmaSq = sigma * sigma;

  // Compute safe evaluation bounding box covering both target joints & padded source anatomy
  let scanMinX = anatomy.minX;
  let scanMaxX = anatomy.maxX;
  let scanMinY = anatomy.minY;
  let scanMaxY = anatomy.maxY;
  for (const [tx, ty] of targetPos.values()) {
    if (tx < scanMinX) scanMinX = Math.floor(tx);
    if (tx > scanMaxX) scanMaxX = Math.ceil(tx);
    if (ty < scanMinY) scanMinY = Math.floor(ty);
    if (ty > scanMaxY) scanMaxY = Math.ceil(ty);
  }
  const pad = Math.max(8, Math.ceil(charScale * 0.35));
  scanMinX = Math.max(0, scanMinX - pad);
  scanMaxX = Math.min(canvasWidth - 1, scanMaxX + pad);
  scanMinY = Math.max(0, scanMinY - pad);
  scanMaxY = Math.min(canvasHeight - 1, scanMaxY + pad);

  // Inverse mapping for every destination pixel guarantees zero gaps & smooth skeletal coherence
  for (let y = scanMinY; y <= scanMaxY; y++) {
    for (let x = scanMinX; x <= scanMaxX; x++) {
      let sumW = 0;
      let sumSx = 0;
      let sumSy = 0;

      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const dSq = pointToSegmentDistSq(x, y, seg.tx0, seg.ty0, seg.tx1, seg.ty1);
        const w = 1 / Math.pow(dSq + sigmaSq, 1.35);

        // Local coordinates along target bone frame
        const px = x - seg.tx0;
        const py = y - seg.ty0;
        const alongT = px * seg.tux + py * seg.tuy;
        const perpT = px * -seg.tuy + py * seg.tux;

        // Preserve limb length proportionality cleanly
        const lenRatio = Math.max(0.65, Math.min(1.45, seg.baseLen / seg.tgtLen));
        const mappedAlong = alongT * lenRatio;

        const sx = seg.bx0 + mappedAlong * seg.bux - perpT * seg.buy;
        const sy = seg.by0 + mappedAlong * seg.buy + perpT * seg.bux;

        sumW += w;
        sumSx += w * sx;
        sumSy += w * sy;
      }

      if (sumW <= 0) continue;
      const sampleX = Math.round(sumSx / sumW);
      const sampleY = Math.round(sumSy / sumW);
      if (sampleX >= 0 && sampleX < canvasWidth && sampleY >= 0 && sampleY < canvasHeight) {
        const col = sourceGrid[sampleY]?.[sampleX];
        if (col) {
          out[y][x] = col;
        }
      }
    }
  }

  return validateAndCleanAiPixelGrid(out, 'pose', {
    coherenceLevel: poseFidelity === 'exact' ? 'max' : 'high',
    repairOutlines: pixelPerfectOutlines,
  });
}

// Local holistic pixel-retargeting based on continuous skeletal bone-segment inverse mapping
export function retargetSpriteGridToPose(
  sourceGrid: (string | null)[][],
  pose: DummiePose,
  canvasWidth: number,
  canvasHeight: number,
  intensity01: number = 1,
  pixelPerfectOutlines: boolean = true,
  poseFidelity: AiPoseFidelityLevel = 'high'
): (string | null)[][] {
  return retargetSpriteGridToPoseDetailed(
    sourceGrid,
    pose,
    canvasWidth,
    canvasHeight,
    intensity01,
    pixelPerfectOutlines,
    poseFidelity
  ).grid;
}

export function interpolateDummiePoses(
  poseA: DummiePose,
  poseB: DummiePose,
  t: number
): DummiePose {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    ...poseB,
    id: `pose-tween-${Date.now()}-${Math.round(clamped * 100)}`,
    name: `${poseB.name} (${Math.round(clamped * 100)}%)`,
    joints: poseB.joints.map((jb) => {
      const ja = poseA.joints.find((j) => j.id === jb.id);
      if (!ja) return jb;
      return {
        ...jb,
        x: ja.x + (jb.x - ja.x) * clamped,
        y: ja.y + (jb.y - ja.y) * clamped,
      };
    }),
  };
}

// =========================================================
// 2.5D VOLUMETRIC PROJECTION, BALANCE ASSISTANT & IMAGE->DUMMIE
// =========================================================
export interface DummieVolumeFace25D {
  id: string;
  jointId: string;
  zOrder: number;
  points: { x: number; y: number }[];
  fill: string;
  stroke: string;
  opacity?: number;
}

export interface DummieVolumeShape25D {
  id: string;
  jointId: string;
  kind: 'sphere' | 'box' | 'cylinder' | 'wedge' | 'appendage';
  zOrder: number;
  faces?: DummieVolumeFace25D[];
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  yawDeg?: number;
  pitchDeg?: number;
  frontAxisEnd?: { x: number; y: number };
  polyPoints?: { x: number; y: number }[];
  fill: string;
  stroke: string;
}

function project3DPoint(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  perspStrength: number
): { x: number; y: number; z: number } {
  const factor = perspStrength > 0 ? 1 / Math.max(0.45, 1 - z * perspStrength) : 1;
  return {
    x: cx + (x - cx) * factor,
    y: cy + (y - cy) * factor,
    z,
  };
}

function makeOrientedBoxFaces(
  id: string,
  jointId: string,
  cx: number,
  cy: number,
  cz: number,
  halfW: number,
  halfH: number,
  halfD: number,
  rxDeg: number,
  ryDeg: number,
  rzDeg: number,
  perspStrength: number,
  baseColor: string
): { faces: DummieVolumeFace25D[]; frontAxis: { x: number; y: number }; avgZ: number } {
  const rx = (rxDeg * Math.PI) / 180;
  const ry = (ryDeg * Math.PI) / 180;
  const rz = (rzDeg * Math.PI) / 180;

  const rot = (vx: number, vy: number, vz: number): [number, number, number] => {
    // Rotate X (pitch)
    const y1 = vy * Math.cos(rx) - vz * Math.sin(rx);
    const z1 = vy * Math.sin(rx) + vz * Math.cos(rx);
    // Rotate Y (yaw)
    const x2 = vx * Math.cos(ry) + z1 * Math.sin(ry);
    const z2 = -vx * Math.sin(ry) + z1 * Math.cos(ry);
    // Rotate Z (roll)
    const x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
    const y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
    return [x3, y3, z2];
  };

  const cornersLocal: [number, number, number][] = [
    [-halfW, -halfH, halfD],
    [halfW, -halfH, halfD],
    [halfW, halfH, halfD],
    [-halfW, halfH, halfD],
    [-halfW, -halfH, -halfD],
    [halfW, -halfH, -halfD],
    [halfW, halfH, -halfD],
    [-halfW, halfH, -halfD],
  ];

  const world = cornersLocal.map(([lx, ly, lz]) => {
    const [wx, wy, wz] = rot(lx, ly, lz);
    return project3DPoint(cx + wx, cy + wy, cz + wz, cx, cy, perspStrength);
  });

  const [fx, fy, fz] = rot(0, 0, halfD * 1.65);
  const frontProj = project3DPoint(cx + fx, cy + fy, cz + fz, cx, cy, perspStrength);

  const quadDefs: { idx: [number, number, number, number]; shade: string; tag: string }[] = [
    { idx: [0, 1, 2, 3], shade: baseColor, tag: 'front' },
    { idx: [5, 4, 7, 6], shade: 'rgba(15, 23, 42, 0.45)', tag: 'back' },
    { idx: [4, 0, 3, 7], shade: 'rgba(30, 41, 59, 0.55)', tag: 'left' },
    { idx: [1, 5, 6, 2], shade: 'rgba(56, 189, 248, 0.25)', tag: 'right' },
    { idx: [4, 5, 1, 0], shade: 'rgba(224, 242, 254, 0.22)', tag: 'top' },
    { idx: [3, 2, 6, 7], shade: 'rgba(9, 13, 22, 0.6)', tag: 'bottom' },
  ];

  const faces: DummieVolumeFace25D[] = quadDefs
    .map((q) => {
      const pts = q.idx.map((i) => world[i]);
      // Back-face culling via 2D shoelace cross product
      const area =
        (pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) -
        (pts[2].x - pts[0].x) * (pts[1].y - pts[0].y);
      const zAvg = (pts[0].z + pts[1].z + pts[2].z + pts[3].z) / 4;
      return {
        id: `${id}-${q.tag}`,
        jointId,
        zOrder: zAvg,
        points: pts.map((p) => ({ x: p.x, y: p.y })),
        fill: q.shade,
        stroke: baseColor,
        visible: area >= -1 || q.tag === 'front',
      };
    })
    .filter((f) => f.visible)
    .sort((a, b) => a.zOrder - b.zOrder);

  return {
    faces,
    frontAxis: { x: frontProj.x, y: frontProj.y },
    avgZ: cz,
  };
}

export function computeDummieVolumes25D(
  pose: DummiePose,
  viewW: number,
  viewH: number,
  perspective?: PerspectiveGuidesConfig | null,
  canvasSize?: { width: number; height: number } | null
): DummieVolumeShape25D[] {
  const joints = getEffectivePoseJoints(pose, perspective, canvasSize);
  const perspAdj = computeDummiePerspectiveAdjustment(pose, perspective, canvasSize);
  const jMap = new Map(joints.map((j) => [j.id, j]));
  const perspMode = pose.modifiers.perspectiveMode || 'light';
  const perspStrength = perspMode === 'dynamic' ? 0.0042 : perspMode === 'light' ? 0.002 : 0;
  const simplified = Boolean(pose.modifiers.pixelArtSimplified);
  const baseCol = pose.overlayColor || '#38bdf8';

  const pt = (id: string) => {
    const j = jMap.get(id);
    if (!j) return null;
    const zPx = (j.depth ?? 0) * viewW * 0.25;
    const p = project3DPoint(j.x * viewW, j.y * viewH, zPx, viewW / 2, viewH / 2, perspStrength);
    return { ...p, j };
  };

  const shapes: DummieVolumeShape25D[] = [];
  const baseScaleMod =
    pose.rigType === 'muscular'
      ? 1.28
      : pose.rigType === 'slim'
      ? 0.78
      : pose.rigType === 'chibi'
      ? 1.08
      : 1;
  const scaleMod = baseScaleMod * (perspAdj.active ? perspAdj.depthScale : 1);

  // 1. Torso 2.5D Volumes (Chest, Abdomen, Pelvis)
  const chest = pt('chest');
  const abdomen = pt('abdomen');
  const pelvis = pt('pelvis');

  if (chest) {
    const ang = chest.j.rz ?? pose.modifiers.bodyLean * 0.5;
    const box = makeOrientedBoxFaces(
      'vol-chest',
      'chest',
      chest.x,
      chest.y,
      chest.z,
      viewW * 0.11 * scaleMod,
      viewH * 0.068,
      viewW * 0.062 * scaleMod,
      chest.j.rx ?? 4,
      chest.j.ry ?? 14,
      ang,
      perspStrength,
      'rgba(56, 189, 248, 0.22)'
    );
    shapes.push({
      id: 'vol-chest',
      jointId: 'chest',
      kind: 'box',
      zOrder: chest.z,
      faces: box.faces,
      frontAxisEnd: box.frontAxis,
      fill: 'rgba(56, 189, 248, 0.22)',
      stroke: baseCol,
    });
  }

  if (abdomen) {
    const box = makeOrientedBoxFaces(
      'vol-abdomen',
      'abdomen',
      abdomen.x,
      abdomen.y,
      abdomen.z,
      viewW * 0.08 * scaleMod,
      viewH * 0.045,
      viewW * 0.052 * scaleMod,
      abdomen.j.rx ?? 0,
      abdomen.j.ry ?? 10,
      abdomen.j.rz ?? pose.modifiers.bodyLean * 0.3,
      perspStrength,
      'rgba(14, 165, 233, 0.18)'
    );
    shapes.push({
      id: 'vol-abdomen',
      jointId: 'abdomen',
      kind: 'box',
      zOrder: abdomen.z,
      faces: box.faces,
      fill: 'rgba(14, 165, 233, 0.18)',
      stroke: baseCol,
    });
  }

  if (pelvis) {
    const box = makeOrientedBoxFaces(
      'vol-pelvis',
      'pelvis',
      pelvis.x,
      pelvis.y,
      pelvis.z,
      viewW * 0.09 * scaleMod,
      viewH * 0.044,
      viewW * 0.058 * scaleMod,
      pelvis.j.rx ?? 0,
      pelvis.j.ry ?? 12,
      pelvis.j.rz ?? 0,
      perspStrength,
      'rgba(244, 63, 94, 0.18)'
    );
    shapes.push({
      id: 'vol-pelvis',
      jointId: 'pelvis',
      kind: 'box',
      zOrder: pelvis.z,
      faces: box.faces,
      frontAxisEnd: box.frontAxis,
      fill: 'rgba(244, 63, 94, 0.18)',
      stroke: baseCol,
    });
  }

  // 2. Segmented Limb Cylinders & Hands/Feet
  const addLimbCylinder = (idA: string, idB: string, radiusNorm: number, fillCol: string) => {
    const a = pt(idA);
    const b = pt(idB);
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (viewW * radiusNorm * scaleMod);
    const ny = (dx / len) * (viewW * radiusNorm * scaleMod);
    const polyPoints = [
      { x: a.x + nx * 1.05, y: a.y + ny * 1.05 },
      { x: b.x + nx * 0.78, y: b.y + ny * 0.78 },
      { x: b.x - nx * 0.78, y: b.y - ny * 0.78 },
      { x: a.x - nx * 1.05, y: a.y - ny * 1.05 },
    ];
    shapes.push({
      id: `cyl-${idA}-${idB}`,
      jointId: idB,
      kind: 'cylinder',
      zOrder: (a.z + b.z) / 2,
      polyPoints,
      fill: fillCol,
      stroke: baseCol,
    });
  };

  addLimbCylinder('chest', 'neck', 0.028, 'rgba(56, 189, 248, 0.20)');
  addLimbCylinder('shoulder_l', 'elbow_l', 0.029, 'rgba(56, 189, 248, 0.18)');
  addLimbCylinder('elbow_l', 'wrist_l', 0.023, 'rgba(56, 189, 248, 0.22)');
  addLimbCylinder('shoulder_r', 'elbow_r', 0.029, 'rgba(56, 189, 248, 0.22)');
  addLimbCylinder('elbow_r', 'wrist_r', 0.023, 'rgba(56, 189, 248, 0.26)');

  addLimbCylinder('hip_l', 'knee_l', 0.038, 'rgba(56, 189, 248, 0.18)');
  addLimbCylinder('knee_l', 'ankle_l', 0.028, 'rgba(56, 189, 248, 0.22)');
  addLimbCylinder('hip_r', 'knee_r', 0.038, 'rgba(56, 189, 248, 0.22)');
  addLimbCylinder('knee_r', 'ankle_r', 0.028, 'rgba(56, 189, 248, 0.26)');

  // Hands (small blocks) & Feet (wedges)
  for (const wristId of ['wrist_l', 'wrist_r']) {
    const wPt = pt(wristId);
    if (wPt) {
      const box = makeOrientedBoxFaces(
        `hand-${wristId}`,
        wristId,
        wPt.x,
        wPt.y + viewH * 0.014,
        wPt.z,
        viewW * 0.022 * scaleMod,
        viewH * 0.024,
        viewW * 0.016,
        wPt.j.rx ?? 0,
        wPt.j.ry ?? 0,
        wPt.j.rz ?? 0,
        perspStrength,
        'rgba(251, 191, 36, 0.24)'
      );
      shapes.push({
        id: `hand-${wristId}`,
        jointId: wristId,
        kind: 'box',
        zOrder: wPt.z + 2,
        faces: box.faces,
        fill: 'rgba(251, 191, 36, 0.24)',
        stroke: baseCol,
      });
    }
  }

  for (const ankleId of ['ankle_l', 'ankle_r']) {
    const aPt = pt(ankleId);
    if (aPt) {
      const fw = viewW * (simplified ? 0.042 : 0.048);
      const fh = viewH * 0.026;
      const dir = ankleId === 'ankle_l' ? -0.35 : 1;
      shapes.push({
        id: `foot-${ankleId}`,
        jointId: ankleId,
        kind: 'wedge',
        zOrder: aPt.z + 1,
        polyPoints: [
          { x: aPt.x - fw * 0.35, y: aPt.y - fh * 0.3 },
          { x: aPt.x + fw * 0.85 * dir, y: aPt.y + fh * 0.8 },
          { x: aPt.x - fw * 0.45 * dir, y: aPt.y + fh * 0.8 },
        ],
        fill: 'rgba(16, 185, 129, 0.24)',
        stroke: baseCol,
      });
    }
  }

  // 3. Head Loomis Sphere + Crosshair Axes
  const head = pt('head');
  if (head) {
    const hr = (head.j.radius || 0.055) * viewW * (simplified ? 0.94 : 1.05);
    shapes.push({
      id: 'vol-head',
      jointId: 'head',
      kind: 'sphere',
      zOrder: head.z + 4,
      cx: head.x,
      cy: head.y,
      rx: hr,
      ry: hr * 1.12,
      yawDeg: head.j.ry ?? pose.modifiers.gazeAngle * 0.5 + 12,
      pitchDeg: head.j.rx ?? pose.modifiers.headTilt * 0.4,
      fill: 'rgba(56, 189, 248, 0.20)',
      stroke: baseCol,
    });
  }

  // 4. Optional Articulated Appendages (Tail, Ears, Wings, Horns)
  if (pose.modifiers.showTail && pelvis) {
    const t1 = { x: pelvis.x - viewW * 0.12, y: pelvis.y + viewH * 0.05 };
    const t2 = { x: pelvis.x - viewW * 0.22, y: pelvis.y - viewH * 0.02 };
    shapes.push({
      id: 'app-tail',
      jointId: 'pelvis',
      kind: 'appendage',
      zOrder: pelvis.z - 25,
      polyPoints: [
        { x: pelvis.x, y: pelvis.y - 3 },
        { x: t1.x, y: t1.y - 3 },
        { x: t2.x, y: t2.y },
        { x: t1.x, y: t1.y + 4 },
        { x: pelvis.x, y: pelvis.y + 4 },
      ],
      fill: 'rgba(168, 85, 247, 0.24)',
      stroke: '#c084fc',
    });
  }
  if (pose.modifiers.showWings && chest) {
    shapes.push({
      id: 'app-wing-l',
      jointId: 'chest',
      kind: 'appendage',
      zOrder: chest.z - 30,
      polyPoints: [
        { x: chest.x, y: chest.y },
        { x: chest.x - viewW * 0.25, y: chest.y - viewH * 0.16 },
        { x: chest.x - viewW * 0.20, y: chest.y + viewH * 0.06 },
      ],
      fill: 'rgba(168, 85, 247, 0.18)',
      stroke: '#c084fc',
    });
    shapes.push({
      id: 'app-wing-r',
      jointId: 'chest',
      kind: 'appendage',
      zOrder: chest.z - 32,
      polyPoints: [
        { x: chest.x, y: chest.y },
        { x: chest.x + viewW * 0.25, y: chest.y - viewH * 0.16 },
        { x: chest.x + viewW * 0.20, y: chest.y + viewH * 0.06 },
      ],
      fill: 'rgba(168, 85, 247, 0.18)',
      stroke: '#c084fc',
    });
  }
  if (pose.modifiers.showEars && head) {
    const hr = (head.j.radius || 0.055) * viewW;
    shapes.push({
      id: 'app-ears',
      jointId: 'head',
      kind: 'appendage',
      zOrder: head.z + 5,
      polyPoints: [
        { x: head.x - hr * 0.7, y: head.y - hr * 0.6 },
        { x: head.x - hr * 1.15, y: head.y - hr * 1.5 },
        { x: head.x - hr * 0.25, y: head.y - hr * 0.9 },
        { x: head.x + hr * 0.25, y: head.y - hr * 0.9 },
        { x: head.x + hr * 1.15, y: head.y - hr * 1.5 },
        { x: head.x + hr * 0.7, y: head.y - hr * 0.6 },
      ],
      fill: 'rgba(251, 191, 36, 0.25)',
      stroke: '#fbbf24',
    });
  }
  if (pose.modifiers.showHorns && head) {
    const hr = (head.j.radius || 0.055) * viewW;
    shapes.push({
      id: 'app-horns',
      jointId: 'head',
      kind: 'appendage',
      zOrder: head.z + 6,
      polyPoints: [
        { x: head.x - hr * 0.55, y: head.y - hr * 0.85 },
        { x: head.x - hr * 1.05, y: head.y - hr * 1.85 },
        { x: head.x - hr * 0.2, y: head.y - hr * 1.05 },
        { x: head.x + hr * 0.2, y: head.y - hr * 1.05 },
        { x: head.x + hr * 1.05, y: head.y - hr * 1.85 },
        { x: head.x + hr * 0.55, y: head.y - hr * 0.85 },
      ],
      fill: 'rgba(244, 63, 94, 0.28)',
      stroke: '#fb7185',
    });
  }

  return shapes.sort((a, b) => a.zOrder - b.zOrder);
}

export interface DummieBalanceReport {
  balanced: boolean;
  centerX: number;
  supportMinX: number;
  supportMaxX: number;
  message: string;
}

export function analyzeDummieBalance(pose: DummiePose): DummieBalanceReport {
  const joints = getEffectivePoseJoints(pose);
  const pelvis = joints.find((j) => j.id === 'pelvis');
  const ankleL = joints.find((j) => j.id === 'ankle_l');
  const ankleR = joints.find((j) => j.id === 'ankle_r');

  if (!pelvis || !ankleL || !ankleR) {
    return {
      balanced: true,
      centerX: 0.5,
      supportMinX: 0.35,
      supportMaxX: 0.65,
      message: 'Equilibrio estable',
    };
  }

  const minFoot = Math.min(ankleL.x, ankleR.x) - 0.06;
  const maxFoot = Math.max(ankleL.x, ankleR.x) + 0.06;
  const balanced = pelvis.x >= minFoot && pelvis.x <= maxFoot;
  const delta = pelvis.x < minFoot ? minFoot - pelvis.x : pelvis.x > maxFoot ? pelvis.x - maxFoot : 0;

  return {
    balanced,
    centerX: pelvis.x,
    supportMinX: minFoot,
    supportMaxX: maxFoot,
    message: balanced
      ? 'Centro de gravedad equilibrado sobre apoyos'
      : `Postura en desequilibrio dinámico (${Math.round(delta * 100)}% fuera de base)`,
  };
}

/**
 * Generates an editable DummiePose from a bitmap image / reference URL by scanning
 * horizontal/vertical silhouette mass bands across Head, Torso, Arms, and Legs.
 */
export function generateDummiePoseFromImageDataUrl(
  dataUrl: string,
  rigType: DummieRigType = 'male',
  sourceName: string = 'Referencia'
): Promise<DummiePose> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const S = 64;
      const canvas = document.createElement('canvas');
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(applyPresetToDummiePose(rigType, 'idle'));
        return;
      }
      ctx.drawImage(img, 0, 0, S, S);
      const data = ctx.getImageData(0, 0, S, S).data;

      // Detect background color from corner pixels when image is opaque (JPG)
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      const bgA = data[3];
      const isFg = (idx: number) => {
        const a = data[idx + 3];
        if (a < 40) return false;
        if (bgA > 220) {
          const dr = Math.abs(data[idx] - bgR);
          const dg = Math.abs(data[idx + 1] - bgG);
          const db = Math.abs(data[idx + 2] - bgB);
          if (dr + dg + db < 42) return false;
        }
        return true;
      };

      let minX = S, maxX = -1, minY = S, maxY = -1;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          if (isFg((y * S + x) * 4)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        resolve(applyPresetToDummiePose(rigType, 'idle'));
        return;
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const bandCenter = (yStartFrac: number, yEndFrac: number, side: 'all' | 'left' | 'right' = 'all') => {
        const y0 = Math.max(0, Math.floor(minY + bh * yStartFrac));
        const y1 = Math.min(S - 1, Math.ceil(minY + bh * yEndFrac));
        let sumX = 0, sumY = 0, count = 0;
        let outerLeft = maxX, outerRight = minX;
        const midX = minX + bw * 0.5;
        for (let y = y0; y <= y1; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (!isFg((y * S + x) * 4)) continue;
            if (side === 'left' && x > midX) continue;
            if (side === 'right' && x < midX) continue;
            sumX += x;
            sumY += y;
            count++;
            if (x < outerLeft) outerLeft = x;
            if (x > outerRight) outerRight = x;
          }
        }
        if (count === 0) return null;
        return {
          cx: clamp01((sumX / count) / S),
          cy: clamp01((sumY / count) / S),
          minX: clamp01(outerLeft / S),
          maxX: clamp01(outerRight / S),
        };
      };

      const base = applyPresetToDummiePose(rigType, 'idle');
      const headB = bandCenter(0.0, 0.22);
      const chestB = bandCenter(0.22, 0.42);
      const pelvisB = bandCenter(0.45, 0.58);
      const armLB = bandCenter(0.24, 0.55, 'left');
      const armRB = bandCenter(0.24, 0.55, 'right');
      const legLB = bandCenter(0.62, 0.98, 'left');
      const legRB = bandCenter(0.62, 0.98, 'right');

      const mappedJoints = base.joints.map((j) => {
        if (j.id === 'head' && headB) return { ...j, x: headB.cx, y: headB.cy };
        if (j.id === 'chest' && chestB) return { ...j, x: chestB.cx, y: chestB.cy };
        if (j.id === 'pelvis' && pelvisB) return { ...j, x: pelvisB.cx, y: pelvisB.cy };
        if (j.id === 'wrist_l' && armLB) return { ...j, x: armLB.minX, y: armLB.cy };
        if (j.id === 'wrist_r' && armRB) return { ...j, x: armRB.maxX, y: armRB.cy };
        if (j.id === 'ankle_l' && legLB) return { ...j, x: legLB.cx, y: clamp01((maxY - 2) / S) };
        if (j.id === 'ankle_r' && legRB) return { ...j, x: legRB.cx, y: clamp01((maxY - 2) / S) };
        return j;
      });

      const anchoredJoints = autoConfigureDummieAnchorsForRig(mappedJoints, rigType);

      resolve({
        ...base,
        id: `pose-img-${Date.now()}`,
        name: `Pose desde ${sourceName.slice(0, 14)}`,
        category: 'Generada',
        joints: anchoredJoints,
        sectionAnchors: computeSectionAnchorsFromJoints(anchoredJoints),
        activeAnchorProfileId: getDefaultAnchorProfileIdForRig(rigType),
      });
    };
    img.onerror = () => resolve(applyPresetToDummiePose(rigType, 'idle'));
    img.src = dataUrl;
  });
}

// =========================================================
// DUMMIE RIG ANCHORING SYSTEM, PARTIAL LINKS, RIG VIEW & PROFILES
// =========================================================
export const DUMMIE_ANCHOR_PROFILES_STORAGE_KEY = 'pixelclash_dummie_anchor_profiles_v1';

export function getJointAnchor(joint: DummieJoint): DummieJointAnchor {
  if (!joint.anchor) {
    return { ...DEFAULT_JOINT_ANCHOR };
  }
  return {
    anchored: Boolean(joint.anchor.anchored),
    linkPosition: Boolean(joint.anchor.linkPosition),
    linkRotation: Boolean(joint.anchor.linkRotation),
    linkScale: Boolean(joint.anchor.linkScale),
  };
}

/**
 * Returns semantic visual status of an articulation:
 * - locked: blocked joint (cannot move)
 * - anchored (Verde): full anchor (position + rotation + scale linked)
 * - partial (Amarillo): partial anchor (subset of pos/rot/scale linked)
 * - independent (Rojo): unanchored free joint
 */
export function getJointAnchorVisualState(joint: DummieJoint): DummieAnchorVisualState {
  if (joint.locked) return 'locked';
  const a = getJointAnchor(joint);
  if (!a.anchored || (!a.linkPosition && !a.linkRotation && !a.linkScale)) {
    return 'independent';
  }
  if (a.linkPosition && a.linkRotation && a.linkScale) {
    return 'anchored';
  }
  return 'partial';
}

export function getJointAnchorColor(state: DummieAnchorVisualState): string {
  switch (state) {
    case 'anchored':
      return '#22c55e'; // Verde: Anclada
    case 'partial':
      return '#facc15'; // Amarillo: Anclaje parcial
    case 'independent':
      return '#ef4444'; // Rojo: Independiente
    case 'locked':
      return '#94a3b8'; // Bloqueada
  }
}

export function getJointAnchorLabel(state: DummieAnchorVisualState): string {
  switch (state) {
    case 'anchored':
      return 'Anclada';
    case 'partial':
      return 'Parcial';
    case 'independent':
      return 'Independiente';
    case 'locked':
      return 'Bloqueada';
  }
}

export function getJointAnchorSection(joint: DummieJoint): DummieAnchorSection {
  if (joint.id.includes('tail')) return 'tail';
  switch (joint.group) {
    case 'head':
      return 'head_neck';
    case 'arm_l':
      return 'arm_left';
    case 'arm_r':
      return 'arm_right';
    case 'torso':
      return 'torso';
    case 'leg_l':
      return 'leg_left';
    case 'leg_r':
      return 'leg_right';
    case 'extra':
    default:
      if (joint.id.includes('wing_l')) return 'arm_left';
      if (joint.id.includes('wing_r')) return 'arm_right';
      return 'tail';
  }
}

export function computeSectionAnchorsFromJoints(
  joints: DummieJoint[]
): Record<DummieAnchorSection, boolean> {
  const result: Record<DummieAnchorSection, boolean> = { ...DEFAULT_SECTION_ANCHORS };
  for (const sec of DUMMIE_ANCHOR_SECTIONS) {
    const members = joints.filter((j) => getJointAnchorSection(j) === sec.id);
    if (members.length === 0) {
      result[sec.id] = true;
    } else {
      result[sec.id] = members.some((j) => getJointAnchor(j).anchored);
    }
  }
  return result;
}

export function autoConfigureDummieAnchorsForRig(
  joints: DummieJoint[],
  rigType: DummieRigType
): DummieJoint[] {
  return joints.map((j) => {
    // Intelligent anatomical defaults based on rig type
    if (rigType === 'chibi') {
      const isExtremity = j.id.includes('wrist') || j.id.includes('ankle');
      return {
        ...j,
        scale: j.scale ?? 1,
        anchor: isExtremity
          ? { anchored: true, linkPosition: true, linkRotation: false, linkScale: true }
          : { ...DEFAULT_JOINT_ANCHOR },
      };
    }
    if (rigType === 'quadruped') {
      const isPaw = j.id.includes('wrist') || j.id.includes('ankle');
      return {
        ...j,
        scale: j.scale ?? 1,
        anchor: isPaw
          ? { anchored: true, linkPosition: true, linkRotation: false, linkScale: true }
          : { ...DEFAULT_JOINT_ANCHOR },
      };
    }
    if (rigType === 'dragon') {
      const isWingTip = j.id.includes('wing');
      return {
        ...j,
        scale: j.scale ?? 1,
        anchor: isWingTip
          ? { anchored: true, linkPosition: true, linkRotation: true, linkScale: false }
          : { ...DEFAULT_JOINT_ANCHOR },
      };
    }
    if (rigType === 'custom') {
      const isExtra = j.group === 'extra';
      return {
        ...j,
        scale: j.scale ?? 1,
        anchor: isExtra
          ? { anchored: true, linkPosition: true, linkRotation: false, linkScale: false }
          : { ...DEFAULT_JOINT_ANCHOR },
      };
    }
    return {
      ...j,
      scale: j.scale ?? 1,
      anchor: j.anchor ? getJointAnchor(j) : { ...DEFAULT_JOINT_ANCHOR },
    };
  });
}

export function toggleSectionAnchors(
  pose: DummiePose,
  section: DummieAnchorSection,
  anchored: boolean
): DummiePose {
  const nextJoints = pose.joints.map((j) => {
    if (getJointAnchorSection(j) !== section) return j;
    return {
      ...j,
      anchor: anchored
        ? { anchored: true, linkPosition: true, linkRotation: true, linkScale: true }
        : { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
    };
  });
  return {
    ...pose,
    joints: nextJoints,
    sectionAnchors: computeSectionAnchorsFromJoints(nextJoints),
  };
}

export function updateJointAnchor(
  pose: DummiePose,
  jointId: string,
  patch: Partial<DummieJointAnchor>
): DummiePose {
  const nextJoints = pose.joints.map((j) => {
    if (j.id !== jointId) return j;
    const prev = getJointAnchor(j);
    let next: DummieJointAnchor = { ...prev, ...patch };
    if (patch.anchored === true && !next.linkPosition && !next.linkRotation && !next.linkScale) {
      next = { anchored: true, linkPosition: true, linkRotation: true, linkScale: true };
    } else if (patch.anchored === false) {
      next = { anchored: false, linkPosition: false, linkRotation: false, linkScale: false };
    } else if (patch.anchored === undefined) {
      next.anchored = Boolean(next.linkPosition || next.linkRotation || next.linkScale);
    }
    return { ...j, anchor: next };
  });
  return {
    ...pose,
    joints: nextJoints,
    sectionAnchors: computeSectionAnchorsFromJoints(nextJoints),
  };
}

export interface ChainScopeOption {
  scope: DummieChainMoveScope;
  label: string;
}

/**
 * Generates contextual chain move scope labels based on the currently selected articulation.
 */
export function getChainScopeOptionsForJoint(
  jointId: string | null,
  joints: DummieJoint[]
): ChainScopeOption[] {
  const joint = joints.find((j) => j.id === jointId);
  if (!joint) {
    return [
      { scope: 'piece', label: 'Solo pieza' },
      { scope: 'branch', label: 'Rama completa' },
      { scope: 'upper_body', label: 'Mitad superior' },
      { scope: 'full_body', label: 'Cuerpo completo' },
    ];
  }

  const shortName = joint.label.split('/')[0].trim();
  const sec = getJointAnchorSection(joint);
  let branchLabel = 'Rama completa';
  let halfScope: DummieChainMoveScope = 'upper_body';
  let halfLabel = 'Mitad superior';

  if (sec === 'arm_left') branchLabel = 'Brazo izq. completo';
  else if (sec === 'arm_right') branchLabel = 'Brazo der. completo';
  else if (sec === 'head_neck') branchLabel = 'Cabeza y cuello';
  else if (sec === 'torso') branchLabel = 'Columna y torso';
  else if (sec === 'leg_left') {
    branchLabel = 'Pierna izq. completa';
    halfScope = 'lower_body';
    halfLabel = 'Mitad inferior';
  } else if (sec === 'leg_right') {
    branchLabel = 'Pierna der. completa';
    halfScope = 'lower_body';
    halfLabel = 'Mitad inferior';
  } else if (sec === 'tail') {
    branchLabel = 'Cola completa';
    halfScope = 'lower_body';
    halfLabel = 'Mitad inferior';
  }

  return [
    { scope: 'piece', label: `Solo ${shortName}` },
    { scope: 'branch', label: branchLabel },
    { scope: halfScope, label: halfLabel },
    { scope: 'full_body', label: 'Cuerpo completo' },
  ];
}

function collectAnchoredDescendants(
  rootId: string,
  joints: DummieJoint[],
  requireLink: 'position' | 'rotation' | 'scale'
): Set<string> {
  const childrenByParent = new Map<string, DummieJoint[]>();
  for (const j of joints) {
    if (!j.parentId) continue;
    const list = childrenByParent.get(j.parentId) || [];
    list.push(j);
    childrenByParent.set(j.parentId, list);
  }

  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const kids = childrenByParent.get(curr) || [];
    for (const k of kids) {
      if (k.locked || visited.has(k.id)) continue;
      const a = getJointAnchor(k);
      if (!a.anchored) continue;
      if (requireLink === 'position' && !a.linkPosition) continue;
      if (requireLink === 'rotation' && !a.linkRotation) continue;
      if (requireLink === 'scale' && !a.linkScale) continue;
      visited.add(k.id);
      queue.push(k.id);
    }
  }
  return visited;
}

function collectSameSectionAncestors(
  joint: DummieJoint,
  joints: DummieJoint[]
): Set<string> {
  const out = new Set<string>();
  const targetSec = getJointAnchorSection(joint);
  const byId = new Map(joints.map((j) => [j.id, j]));
  let curr: DummieJoint | undefined = joint;
  while (curr && curr.parentId) {
    const parent = byId.get(curr.parentId);
    if (!parent || parent.locked) break;
    const currAnchor = getJointAnchor(curr);
    if (!currAnchor.anchored || !currAnchor.linkPosition) break;
    // Propagate along same limb/spine branch (e.g. moving wrist drags elbow/shoulder or neck drags chest/abdomen/pelvis when in branch scope)
    const pSec = getJointAnchorSection(parent);
    if (pSec === targetSec || (targetSec === 'head_neck' && pSec === 'torso')) {
      const pAnchor = getJointAnchor(parent);
      if (pAnchor.anchored && pAnchor.linkPosition) {
        out.add(parent.id);
        curr = parent;
        continue;
      }
    }
    break;
  }
  return out;
}

function collectAffectedJointsByScope(
  pose: DummiePose,
  jointId: string,
  scope: DummieChainMoveScope,
  requireLink: 'position' | 'rotation' | 'scale'
): Map<string, number> {
  // Returns map of jointId -> weight (1 = full propagation, 0.5..0.85 = natural parent follow-through)
  const weights = new Map<string, number>();
  const target = pose.joints.find((j) => j.id === jointId);
  if (!target || target.locked) return weights;
  weights.set(target.id, 1);

  const targetAnchor = getJointAnchor(target);
  if (scope === 'piece' || !targetAnchor.anchored) {
    return weights;
  }

  // Always propagate to anchored descendants
  const descendants = collectAnchoredDescendants(target.id, pose.joints, requireLink);
  descendants.forEach((id) => weights.set(id, 1));

  if (scope === 'branch') {
    // Also follow-through softly up the same anchored chain if dragging an extremity/neck
    const ancestors = collectSameSectionAncestors(target, pose.joints);
    let falloff = 0.65;
    ancestors.forEach((id) => {
      if (!weights.has(id)) {
        weights.set(id, falloff);
        // Include descendants of dragged torso/branch ancestors (except other locked/independent parts)
        const subKids = collectAnchoredDescendants(id, pose.joints, requireLink);
        subKids.forEach((kidId) => {
          if (!weights.has(kidId)) weights.set(kidId, falloff);
        });
        falloff = Math.max(0.25, falloff * 0.6);
      }
    });
  } else if (scope === 'upper_body') {
    for (const j of pose.joints) {
      if (j.locked || weights.has(j.id)) continue;
      const a = getJointAnchor(j);
      const sec = getJointAnchorSection(j);
      if (
        a.anchored &&
        ((requireLink === 'position' && a.linkPosition) ||
          (requireLink === 'rotation' && a.linkRotation) ||
          (requireLink === 'scale' && a.linkScale)) &&
        (sec === 'head_neck' || sec === 'arm_left' || sec === 'arm_right' || (sec === 'torso' && j.id !== 'pelvis'))
      ) {
        weights.set(j.id, 1);
      }
    }
  } else if (scope === 'lower_body') {
    for (const j of pose.joints) {
      if (j.locked || weights.has(j.id)) continue;
      const a = getJointAnchor(j);
      const sec = getJointAnchorSection(j);
      if (
        a.anchored &&
        ((requireLink === 'position' && a.linkPosition) ||
          (requireLink === 'rotation' && a.linkRotation) ||
          (requireLink === 'scale' && a.linkScale)) &&
        (sec === 'leg_left' || sec === 'leg_right' || sec === 'tail' || j.id === 'pelvis')
      ) {
        weights.set(j.id, 1);
      }
    }
  } else if (scope === 'full_body') {
    for (const j of pose.joints) {
      if (j.locked || weights.has(j.id)) continue;
      const a = getJointAnchor(j);
      if (
        a.anchored &&
        ((requireLink === 'position' && a.linkPosition) ||
          (requireLink === 'rotation' && a.linkRotation) ||
          (requireLink === 'scale' && a.linkScale))
      ) {
        weights.set(j.id, 1);
      }
    }
  }

  return weights;
}

/**
 * Moves a Dummie joint respecting Anchor state, Partial Link flags, Chain Move Scope,
 * Symmetry, and Alt-key temporary unlinking (without modifying saved anchor config!).
 */
export function moveDummieJointWithAnchors(
  pose: DummiePose,
  jointId: string,
  nextX: number,
  nextY: number,
  options: { altBypass?: boolean; scope?: DummieChainMoveScope } = {}
): DummiePose {
  const target = pose.joints.find((j) => j.id === jointId);
  if (!target || target.locked) return pose;

  const clampedX = Math.max(0.03, Math.min(0.97, nextX));
  const clampedY = Math.max(0.03, Math.min(0.97, nextY));
  const dx = clampedX - target.x;
  const dy = clampedY - target.y;

  const effectiveScope: DummieChainMoveScope = options.altBypass
    ? 'piece'
    : options.scope || pose.chainMoveScope || 'branch';

  const affectedWeights = collectAffectedJointsByScope(pose, jointId, effectiveScope, 'position');

  // Optional auto-symmetry for mirrored joints
  const mirrorWeights = new Map<string, number>();
  if (pose.modifiers.autoSymmetry) {
    const byId = new Map(pose.joints.map((j) => [j.id, j]));
    affectedWeights.forEach((w, id) => {
      const src = byId.get(id);
      if (src?.mirrorId && !affectedWeights.has(src.mirrorId)) {
        const mir = byId.get(src.mirrorId);
        if (mir && !mir.locked) {
          mirrorWeights.set(mir.id, w);
        }
      }
    });
  }

  return {
    ...pose,
    joints: pose.joints.map((j) => {
      if (j.id === jointId) {
        return { ...j, x: clampedX, y: clampedY };
      }
      const w = affectedWeights.get(j.id);
      if (w !== undefined) {
        return {
          ...j,
          x: Math.max(0.03, Math.min(0.97, j.x + dx * w)),
          y: Math.max(0.03, Math.min(0.97, j.y + dy * w)),
        };
      }
      const mw = mirrorWeights.get(j.id);
      if (mw !== undefined) {
        return {
          ...j,
          x: Math.max(0.03, Math.min(0.97, j.x - dx * mw)),
          y: Math.max(0.03, Math.min(0.97, j.y + dy * mw)),
        };
      }
      return j;
    }),
  };
}

/**
 * Applies rotation (rx, ry, rz), depth, or local scale changes to a joint, propagating
 * rotation/scale to anchored descendants according to partial anchor flags.
 */
export function transformDummieJointWithAnchors(
  pose: DummiePose,
  jointId: string,
  patch: Partial<{ rx: number; ry: number; rz: number; depth: number; scale: number; locked: boolean }>,
  options: { altBypass?: boolean; scope?: DummieChainMoveScope } = {}
): DummiePose {
  const target = pose.joints.find((j) => j.id === jointId);
  if (!target) return pose;

  const dRx = patch.rx !== undefined ? patch.rx - (target.rx ?? 0) : 0;
  const dRy = patch.ry !== undefined ? patch.ry - (target.ry ?? 0) : 0;
  const dRz = patch.rz !== undefined ? patch.rz - (target.rz ?? 0) : 0;
  const dScale = patch.scale !== undefined ? patch.scale / Math.max(0.2, target.scale ?? 1) : 1;

  const isBypass = Boolean(options.altBypass);
  const scope = options.scope || pose.chainMoveScope || 'branch';
  const rotTargets =
    !isBypass && (dRx !== 0 || dRy !== 0 || dRz !== 0)
      ? collectAffectedJointsByScope(pose, jointId, scope === 'piece' ? 'piece' : 'branch', 'rotation')
      : new Map<string, number>();
  const scaleTargets =
    !isBypass && Math.abs(dScale - 1) > 0.001
      ? collectAffectedJointsByScope(pose, jointId, scope === 'piece' ? 'piece' : 'branch', 'scale')
      : new Map<string, number>();

  const radZ = (dRz * Math.PI) / 180;
  const cosZ = Math.cos(radZ);
  const sinZ = Math.sin(radZ);

  return {
    ...pose,
    joints: pose.joints.map((j) => {
      if (j.id === jointId) {
        return { ...j, ...patch };
      }
      let next = j;
      if (rotTargets.has(j.id)) {
        const anchor = getJointAnchor(j);
        let nx = next.x;
        let ny = next.y;
        // Swing anchored child coordinates around parent when rolling Z
        if (dRz !== 0 && anchor.linkPosition) {
          const rx0 = next.x - target.x;
          const ry0 = next.y - target.y;
          nx = Math.max(0.03, Math.min(0.97, target.x + rx0 * cosZ - ry0 * sinZ));
          ny = Math.max(0.03, Math.min(0.97, target.y + rx0 * sinZ + ry0 * cosZ));
        }
        next = {
          ...next,
          x: nx,
          y: ny,
          rx: Math.max(-75, Math.min(75, (next.rx ?? 0) + dRx)),
          ry: Math.max(-90, Math.min(90, (next.ry ?? 0) + dRy)),
          rz: Math.max(-180, Math.min(180, (next.rz ?? 0) + dRz)),
        };
      }
      if (scaleTargets.has(j.id)) {
        next = {
          ...next,
          scale: Math.max(0.5, Math.min(1.8, Number(((next.scale ?? 1) * dScale).toFixed(2)))),
        };
      }
      return next;
    }),
  };
}

// =========================================================
// RIG VIEW HIERARCHY TREE BUILDER
// =========================================================
export interface DummieRigTreeNode {
  joint: DummieJoint;
  depth: number;
  section: DummieAnchorSection;
  visualState: DummieAnchorVisualState;
  children: DummieRigTreeNode[];
}

export function buildDummieRigTree(joints: DummieJoint[]): DummieRigTreeNode[] {
  const byParent = new Map<string | null, DummieJoint[]>();
  for (const j of joints) {
    const pid = j.parentId && joints.some((p) => p.id === j.parentId) ? j.parentId : null;
    const list = byParent.get(pid) || [];
    list.push(j);
    byParent.set(pid, list);
  }

  const buildNode = (j: DummieJoint, depth: number, seen: Set<string>): DummieRigTreeNode => {
    seen.add(j.id);
    const kids = (byParent.get(j.id) || [])
      .filter((k) => !seen.has(k.id))
      .map((k) => buildNode(k, depth + 1, seen));
    return {
      joint: j,
      depth,
      section: getJointAnchorSection(j),
      visualState: getJointAnchorVisualState(j),
      children: kids,
    };
  };

  const seen = new Set<string>();
  const roots = byParent.get(null) || (joints[0] ? [joints[0]] : []);
  return roots.map((r) => buildNode(r, 0, seen));
}

// =========================================================
// ANCHOR PROFILES (5 BUILT-INS + CUSTOM PERSISTENCE)
// =========================================================
export const BUILTIN_ANCHOR_PROFILES: DummieAnchorProfile[] = [
  {
    id: 'profile-human-standard',
    name: 'Humano estándar',
    rigType: 'male',
    description: 'Cadena completa anclada en torso, cabeza y extremidades para posado anatómico natural.',
    builtIn: true,
    sectionAnchors: {
      head_neck: true,
      arm_left: true,
      arm_right: true,
      torso: true,
      leg_left: true,
      leg_right: true,
      tail: true,
    },
    jointAnchors: {},
  },
  {
    id: 'profile-quadruped',
    name: 'Animal cuadrúpedo',
    rigType: 'quadruped',
    description: 'Columna, cuello y cola anclados; patas con rotación libre para apoyo natural en suelo.',
    builtIn: true,
    sectionAnchors: {
      head_neck: true,
      arm_left: true,
      arm_right: true,
      torso: true,
      leg_left: true,
      leg_right: true,
      tail: true,
    },
    jointAnchors: {
      wrist_l: { anchored: true, linkPosition: true, linkRotation: false, linkScale: true },
      wrist_r: { anchored: true, linkPosition: true, linkRotation: false, linkScale: true },
      ankle_l: { anchored: true, linkPosition: true, linkRotation: false, linkScale: true },
      ankle_r: { anchored: true, linkPosition: true, linkRotation: false, linkScale: true },
    },
  },
  {
    id: 'profile-dragon',
    name: 'Dragón',
    rigType: 'dragon',
    description: 'Cadena vertebral y cola vinculadas; alas con escala independiente para envergadura variable.',
    builtIn: true,
    sectionAnchors: {
      head_neck: true,
      arm_left: true,
      arm_right: true,
      torso: true,
      leg_left: true,
      leg_right: true,
      tail: true,
    },
    jointAnchors: {
      wing_l: { anchored: true, linkPosition: true, linkRotation: true, linkScale: false },
      wing_r: { anchored: true, linkPosition: true, linkRotation: true, linkScale: false },
      tail_tip: { anchored: true, linkPosition: true, linkRotation: true, linkScale: false },
    },
  },
  {
    id: 'profile-chibi',
    name: 'Chibi',
    rigType: 'chibi',
    description: 'Cabeza y tronco firmes; manos y pies independientes para gestos súper deformados.',
    builtIn: true,
    sectionAnchors: {
      head_neck: true,
      arm_left: true,
      arm_right: true,
      torso: true,
      leg_left: true,
      leg_right: true,
      tail: false,
    },
    jointAnchors: {
      wrist_l: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
      wrist_r: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
      ankle_l: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
      ankle_r: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
    },
  },
  {
    id: 'profile-custom-creature',
    name: 'Criatura personalizada',
    rigType: 'custom',
    description: 'Núcleo corporal anclado con extremidades y apéndices flexibles/parciales.',
    builtIn: true,
    sectionAnchors: {
      head_neck: true,
      arm_left: true,
      arm_right: true,
      torso: true,
      leg_left: false,
      leg_right: false,
      tail: false,
    },
    jointAnchors: {
      elbow_l: { anchored: true, linkPosition: true, linkRotation: false, linkScale: false },
      elbow_r: { anchored: true, linkPosition: true, linkRotation: false, linkScale: false },
      tail_mid: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
      tail_tip: { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
    },
  },
];

export function getDefaultAnchorProfileIdForRig(rigType: DummieRigType): string {
  if (rigType === 'quadruped') return 'profile-quadruped';
  if (rigType === 'dragon') return 'profile-dragon';
  if (rigType === 'chibi') return 'profile-chibi';
  if (rigType === 'custom') return 'profile-custom-creature';
  return 'profile-human-standard';
}

export function loadSavedAnchorProfiles(): DummieAnchorProfile[] {
  try {
    const raw = localStorage.getItem(DUMMIE_ANCHOR_PROFILES_STORAGE_KEY);
    if (!raw) return [...BUILTIN_ANCHOR_PROFILES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...BUILTIN_ANCHOR_PROFILES];
    return [...parsed, ...BUILTIN_ANCHOR_PROFILES];
  } catch {
    return [...BUILTIN_ANCHOR_PROFILES];
  }
}

export function saveCustomAnchorProfile(profile: DummieAnchorProfile): DummieAnchorProfile[] {
  try {
    const raw = localStorage.getItem(DUMMIE_ANCHOR_PROFILES_STORAGE_KEY);
    const existing: DummieAnchorProfile[] = raw ? JSON.parse(raw) : [];
    const next = [
      { ...profile, builtIn: false, createdAt: new Date().toISOString() },
      ...existing.filter((p) => p.id !== profile.id && p.name !== profile.name),
    ];
    localStorage.setItem(DUMMIE_ANCHOR_PROFILES_STORAGE_KEY, JSON.stringify(next));
    return [...next, ...BUILTIN_ANCHOR_PROFILES];
  } catch {
    return [...BUILTIN_ANCHOR_PROFILES];
  }
}

export function deleteCustomAnchorProfile(id: string): DummieAnchorProfile[] {
  try {
    const raw = localStorage.getItem(DUMMIE_ANCHOR_PROFILES_STORAGE_KEY);
    const existing: DummieAnchorProfile[] = raw ? JSON.parse(raw) : [];
    const next = existing.filter((p) => p.id !== id);
    localStorage.setItem(DUMMIE_ANCHOR_PROFILES_STORAGE_KEY, JSON.stringify(next));
    return [...next, ...BUILTIN_ANCHOR_PROFILES];
  } catch {
    return [...BUILTIN_ANCHOR_PROFILES];
  }
}

export function applyAnchorProfileToPose(
  pose: DummiePose,
  profile: DummieAnchorProfile
): DummiePose {
  const nextJoints = pose.joints.map((j) => {
    const explicit = profile.jointAnchors[j.id];
    if (explicit) {
      return { ...j, anchor: { ...explicit } };
    }
    const sec = getJointAnchorSection(j);
    const secEnabled = profile.sectionAnchors[sec] ?? true;
    return {
      ...j,
      anchor: secEnabled
        ? { anchored: true, linkPosition: true, linkRotation: true, linkScale: true }
        : { anchored: false, linkPosition: false, linkRotation: false, linkScale: false },
    };
  });
  return {
    ...pose,
    joints: nextJoints,
    sectionAnchors: computeSectionAnchorsFromJoints(nextJoints),
    activeAnchorProfileId: profile.id,
  };
}

