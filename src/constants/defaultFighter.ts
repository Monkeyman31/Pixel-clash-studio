import { Frame, Hitbox, Layer, LayerKeyframe } from '../types';
import { createEmptyGrid } from '../utils/pixelMath';

/**
 * Generates a detailed 64x64 classic arcade fighting-game demo character ("Kaito Blaze")
 * inspired by Neo Geo / King of Fighters / Garou / Street Fighter Alpha / Guilty Gear.
 *
 * Organized into multi-layer project tracks (`trackId`) inside clean folders:
 *   - Sombra Suelo (`folder-fx`)
 *   - Contorno Base (`folder-character`) — 1px tinted silhouette outline
 *   - Cuerpo y Sombreado (`folder-character`) — 4-tone muscular anatomy & expressive face
 *   - Vestimenta y Accesorios (`folder-character`) — Popped-collar crimson haori, gold clasps, sash, gauntlets & boots
 *   - Cabello y Cinta (`folder-character`) — Multi-spike cobalt hair & animated headband tails (with keyframes)
 *   - FX / Energía y Golpes (`folder-fx`) — Action VFX (empty on neutral/idle frames to show ○/● states)
 *   - Aura Ki (Pico) (`folder-fx`) — Peak-frame aura layer present only on Heavy/Special frames (tests project-wide layer visibility)
 *
 * Includes 8 fluid animations (32 frames total):
 *   1. Idle (4 frames)
 *   2. Walk (6 frames)
 *   3. Run (4 frames)
 *   4. Jump (4 frames)
 *   5. Agachado (3 frames)
 *   6. Ataque ligero (3 frames)
 *   7. Ataque fuerte (4 frames)
 *   8. Especial simple (4 frames)
 */
export function createDefaultFighterFrames(width: number = 64, height: number = 64): Frame[] {
  const C = {
    OUTLINE: '#130d20',
    SHADOW_GROUND: '#090b16',

    HAIR_DEEP: '#1e1b4b',
    HAIR_DARK: '#312e81',
    HAIR_MID: '#4f46e5',
    HAIR_LIGHT: '#818cf8',

    SKIN_HIGH: '#ffe7be',
    SKIN_MID: '#f4bc7d',
    SKIN_SHAD: '#cf8249',
    SKIN_DEEP: '#8d4726',

    EYE_WHITE: '#f8fafc',
    EYE_PUPIL: '#1e1b4b',

    JACKET_HIGH: '#f43f5e',
    JACKET_MID: '#dc2626',
    JACKET_SHAD: '#991b1b',
    JACKET_DEEP: '#4c0519',

    PANTS_HIGH: '#475569',
    PANTS_MID: '#2a3346',
    PANTS_SHAD: '#171d2b',
    PANTS_DEEP: '#0b0e17',

    GOLD_HIGH: '#fef08a',
    GOLD_MID: '#f59e0b',
    GOLD_SHAD: '#b45309',

    WRAP_HIGH: '#f8fafc',
    WRAP_MID: '#cbd5e1',
    WRAP_SHAD: '#64748b',

    BOOT_HIGH: '#64748b',
    BOOT_MID: '#272f42',
    BOOT_SHAD: '#111521',

    VFX_CORE: '#ffffff',
    VFX_CYAN: '#67e8f9',
    VFX_BLUE: '#0ea5e9',
    VFX_DEEP: '#0369a1',
    VFX_GOLD: '#fde047',
    VFX_SPARK: '#f97316',
    VFX_CRIMSON: '#fb7185',
    DUST_LIGHT: '#cbd5e1',
    DUST_MID: '#64748b',
  } as const;

  const baseScaleX = width / 64;
  const baseScaleY = height / 64;

  const newLayerGrid = () => createEmptyGrid(width, height);

  const setPx = (grid: (string | null)[][], x: number, y: number, color: string) => {
    const px = Math.round(x * baseScaleX);
    const py = Math.round(y * baseScaleY);
    if (py >= 0 && py < height && px >= 0 && px < width) {
      grid[py][px] = color;
    }
  };

  const drawRect = (
    grid: (string | null)[][],
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPx(grid, x + dx, y + dy, color);
      }
    }
  };

  const drawEllipse = (
    grid: (string | null)[][],
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string
  ) => {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const nx = dx / Math.max(0.5, rx);
        const ny = dy / Math.max(0.5, ry);
        if (nx * nx + ny * ny <= 1.05) {
          setPx(grid, Math.round(cx + dx), Math.round(cy + dy), color);
        }
      }
    }
  };

  const drawCapsule = (
    grid: (string | null)[][],
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    color: string,
    shadColor?: string,
    highColor?: string
  ) => {
    const steps = Math.max(4, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          if (dx * dx + dy * dy <= r * r + 0.25) {
            let col = color;
            if (highColor && dx <= -r * 0.25 && dy <= -r * 0.2) col = highColor;
            else if (shadColor && (dx >= r * 0.35 || dy >= r * 0.35)) col = shadColor;
            setPx(grid, Math.round(cx + dx), Math.round(cy + dy), col);
          }
        }
      }
    }
  };

  interface FighterPoseSpec {
    ox?: number;
    oy?: number;
    leanX?: number;
    crouchDrop?: number; // lowers torso/head while keeping feet grounded
    headYOffset?: number;
    headTilt?: number;
    backShoulder?: [number, number];
    backElbow?: [number, number];
    backHand?: [number, number];
    frontShoulder?: [number, number];
    frontElbow?: [number, number];
    frontHand?: [number, number];
    backHip?: [number, number];
    backKnee?: [number, number];
    backFoot?: [number, number];
    frontHip?: [number, number];
    frontKnee?: [number, number];
    frontFoot?: [number, number];
    bandWave?: number;
    sashFlow?: number;
    mouthOpen?: boolean;
    hitFlash?: boolean;
    armExtSmear?: boolean;
    shadowScale?: number;
  }

  interface RenderedCharacterLayers {
    shadowGrid: (string | null)[][];
    outlineGrid: (string | null)[][];
    bodyGrid: (string | null)[][];
    outfitGrid: (string | null)[][];
    hairGrid: (string | null)[][];
  }

  const renderFighterLayers = (spec: FighterPoseSpec): RenderedCharacterLayers => {
    const shadowGrid = newLayerGrid();
    const outlineGrid = newLayerGrid();
    const bodyGrid = newLayerGrid();
    const outfitGrid = newLayerGrid();
    const hairGrid = newLayerGrid();

    const ox = (spec.ox ?? 31) + (spec.leanX ?? 0) * 0.25;
    const oy = spec.oy ?? 0;
    const lean = spec.leanX ?? 0;
    const crouch = spec.crouchDrop ?? 0;
    const groundBaseY = 53 + oy;

    // 0. Ground Shadow (scales smaller when airborne)
    const shScale = spec.shadowScale ?? 1;
    drawEllipse(shadowGrid, Math.round(ox), 54, Math.max(5, 11 * shScale), Math.max(1.5, 2.3 * shScale), C.SHADOW_GROUND);

    // 1. Back Leg (Pants + Shin Wrap + Heavy Boot)
    const bHip = spec.backHip ?? [ox - 4, groundBaseY - 19 + crouch * 0.75];
    const bKnee = spec.backKnee ?? [ox - 7, groundBaseY - 10 + crouch * 0.4];
    const bFoot = spec.backFoot ?? [ox - 9, groundBaseY - 2];

    drawCapsule(outfitGrid, bHip[0], bHip[1], bKnee[0], bKnee[1], 3.3, C.PANTS_SHAD, C.PANTS_DEEP, C.PANTS_MID);
    drawCapsule(outfitGrid, bKnee[0], bKnee[1], bFoot[0], bFoot[1], 2.7, C.PANTS_DEEP, C.PANTS_DEEP, C.PANTS_SHAD);
    // Back shin wrap & buckled boot
    drawCapsule(outfitGrid, (bKnee[0] + bFoot[0]) * 0.5, (bKnee[1] + bFoot[1]) * 0.5, bFoot[0], bFoot[1], 2.3, C.BOOT_MID, C.BOOT_SHAD, C.BOOT_HIGH);
    drawRect(outfitGrid, Math.round(bFoot[0] - 2), Math.round(bFoot[1]), 6, 3, C.BOOT_MID);
    drawRect(outfitGrid, Math.round(bFoot[0] - 2), Math.round(bFoot[1] + 2), 6, 1, C.BOOT_SHAD);
    setPx(outfitGrid, Math.round(bFoot[0]), Math.round(bFoot[1]), C.GOLD_MID);

    // 2. Back Arm (Shaded Skin + Forearm Wrap + Knuckle Gauntlet)
    const waistY = groundBaseY - 21 + crouch;
    const chestY = groundBaseY - 30 + crouch;
    const torsoCx = ox + lean * 0.45;

    const bSh = spec.backShoulder ?? [ox - 5 + lean * 0.5, chestY + 1];
    const bEl = spec.backElbow ?? [ox - 9 + lean * 0.3, chestY + 6];
    const bHa = spec.backHand ?? [ox - 4 + lean * 0.5, chestY + 7];
    drawCapsule(bodyGrid, bSh[0], bSh[1], bEl[0], bEl[1], 2.2, C.SKIN_SHAD, C.SKIN_DEEP, C.SKIN_MID);
    drawCapsule(outfitGrid, bEl[0], bEl[1], bHa[0], bHa[1], 2.2, C.JACKET_SHAD, C.JACKET_DEEP, C.JACKET_MID);
    drawEllipse(outfitGrid, bHa[0], bHa[1], 2.3, 2.0, C.JACKET_MID);
    setPx(outfitGrid, Math.round(bHa[0]), Math.round(bHa[1] - 1), C.GOLD_MID);

    // 3. Flowing Crimson Sash Tails (Behind waist)
    const sf = spec.sashFlow ?? 0;
    drawCapsule(outfitGrid, ox - 3, waistY + 1, ox - 10 - sf, waistY + 7, 1.3, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);
    drawCapsule(outfitGrid, ox - 2, waistY + 2, ox - 7 - sf * 0.6, waistY + 9, 1.0, C.JACKET_SHAD, C.JACKET_DEEP);

    // 4. Front Leg (Baggy Martial Combat Trousers + Knee Strap + Armored Boot)
    const fHip = spec.frontHip ?? [ox + 2, groundBaseY - 19 + crouch * 0.75];
    const fKnee = spec.frontKnee ?? [ox + 6, groundBaseY - 10 + crouch * 0.4];
    const fFoot = spec.frontFoot ?? [ox + 8, groundBaseY - 2];

    drawCapsule(outfitGrid, fHip[0], fHip[1], fKnee[0], fKnee[1], 3.5, C.PANTS_MID, C.PANTS_SHAD, C.PANTS_HIGH);
    drawCapsule(outfitGrid, fKnee[0], fKnee[1], fFoot[0], fFoot[1], 2.9, C.PANTS_MID, C.PANTS_SHAD, C.PANTS_HIGH);
    // Knee tie + gold clasp
    drawRect(outfitGrid, Math.round(fKnee[0] - 2), Math.round(fKnee[1] - 1), 5, 2, C.JACKET_MID);
    setPx(outfitGrid, Math.round(fKnee[0] + 1), Math.round(fKnee[1] - 1), C.GOLD_MID);
    // Front shin wrap & heavy boot
    drawCapsule(outfitGrid, (fKnee[0] + fFoot[0]) * 0.5, (fKnee[1] + fFoot[1]) * 0.5, fFoot[0], fFoot[1], 2.5, C.BOOT_MID, C.BOOT_SHAD, C.BOOT_HIGH);
    drawRect(outfitGrid, Math.round(fFoot[0] - 2), Math.round(fFoot[1]), 7, 3, C.BOOT_MID);
    drawRect(outfitGrid, Math.round(fFoot[0] - 2), Math.round(fFoot[1] + 2), 7, 1, C.BOOT_SHAD);
    drawRect(outfitGrid, Math.round(fFoot[0] + 1), Math.round(fFoot[1]), 3, 1, C.BOOT_HIGH);
    setPx(outfitGrid, Math.round(fFoot[0]), Math.round(fFoot[1]), C.GOLD_HIGH);

    // 5. Torso Body + Open Neo Geo Sleeveless Jacket / Haori + Gold Clasps + Belt
    // Muscular chest/abs under torso layer
    drawCapsule(bodyGrid, ox, waistY, torsoCx, chestY, 4.9, C.SKIN_MID, C.SKIN_SHAD, C.SKIN_HIGH);
    drawRect(bodyGrid, Math.round(torsoCx - 1), Math.round(chestY + 1), 3, 7, C.SKIN_MID);
    setPx(bodyGrid, Math.round(torsoCx - 1), Math.round(chestY + 2), C.SKIN_HIGH);
    setPx(bodyGrid, Math.round(torsoCx + 1), Math.round(chestY + 4), C.SKIN_SHAD);
    // Diagonal chest scar (memorable fighter detail!)
    setPx(bodyGrid, Math.round(torsoCx), Math.round(chestY + 2), C.SKIN_DEEP);
    setPx(bodyGrid, Math.round(torsoCx + 1), Math.round(chestY + 3), C.SKIN_SHAD);

    // Coat lower tails
    drawCapsule(outfitGrid, ox - 4, waistY, ox - 6, waistY + 5, 2.3, C.JACKET_SHAD, C.JACKET_DEEP, C.JACKET_MID);
    drawCapsule(outfitGrid, ox + 3, waistY, ox + 5, waistY + 5, 2.2, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);

    // Open sleeveless crimson martial jacket panels (reveals muscular center torso)
    drawCapsule(outfitGrid, torsoCx - 4, chestY + 1, ox - 3, waistY - 1, 2.9, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);
    drawCapsule(outfitGrid, torsoCx + 3, chestY + 1, ox + 3, waistY - 1, 2.7, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);

    // Upturned popped Garou/KOF-style jacket collar
    drawRect(outfitGrid, Math.round(torsoCx - 5), Math.round(chestY - 4), 3, 4, C.JACKET_SHAD);
    drawRect(outfitGrid, Math.round(torsoCx - 5), Math.round(chestY - 4), 2, 2, C.JACKET_HIGH);
    drawRect(outfitGrid, Math.round(torsoCx + 2), Math.round(chestY - 4), 3, 4, C.JACKET_MID);
    drawRect(outfitGrid, Math.round(torsoCx + 3), Math.round(chestY - 4), 2, 2, C.JACKET_HIGH);

    // Gold shoulder clasps & lapel studs
    drawRect(outfitGrid, Math.round(torsoCx - 6), Math.round(chestY - 1), 3, 2, C.GOLD_MID);
    setPx(outfitGrid, Math.round(torsoCx - 5), Math.round(chestY - 1), C.GOLD_HIGH);
    drawRect(outfitGrid, Math.round(torsoCx + 3), Math.round(chestY - 1), 4, 2, C.GOLD_MID);
    setPx(outfitGrid, Math.round(torsoCx + 4), Math.round(chestY - 1), C.GOLD_HIGH);

    // Heavy Belt + Gold Buckle + White Sash Accent
    drawRect(outfitGrid, Math.round(ox - 5), Math.round(waistY - 1), 11, 3, C.PANTS_DEEP);
    drawRect(outfitGrid, Math.round(ox - 5), Math.round(waistY), 11, 1, C.JACKET_MID);
    drawRect(outfitGrid, Math.round(ox), Math.round(waistY - 1), 3, 3, C.GOLD_MID);
    setPx(outfitGrid, Math.round(ox + 1), Math.round(waistY), C.GOLD_HIGH);

    // 6. Head, Expressive Face, Spiky Hair & Flowing Bandana
    const hx = Math.round(torsoCx + 1 + (spec.headTilt ?? 0));
    const hy = Math.round(chestY - 7 + (spec.headYOffset ?? 0));

    // Neck & jaw
    drawRect(bodyGrid, hx - 2, hy + 3, 4, 3, C.SKIN_SHAD);
    setPx(bodyGrid, hx - 1, hy + 3, C.SKIN_MID);

    drawEllipse(bodyGrid, hx, hy, 4.2, 4.4, C.SKIN_MID);
    drawEllipse(bodyGrid, hx - 1, hy - 1, 2.5, 2.4, C.SKIN_HIGH);
    drawRect(bodyGrid, hx - 2, hy + 3, 5, 1, C.SKIN_SHAD);
    setPx(bodyGrid, hx + 2, hy + 2, C.SKIN_DEEP);

    // Sharp arcade eye & determined brow
    setPx(bodyGrid, hx + 1, hy, C.EYE_WHITE);
    setPx(bodyGrid, hx + 2, hy, C.EYE_PUPIL);
    setPx(bodyGrid, hx + 3, hy, C.EYE_WHITE);
    setPx(bodyGrid, hx + 1, hy - 1, C.OUTLINE);
    setPx(bodyGrid, hx + 2, hy - 1, C.OUTLINE);
    if (spec.mouthOpen) {
      drawRect(bodyGrid, hx + 1, hy + 2, 2, 1, C.SKIN_DEEP);
    } else {
      setPx(bodyGrid, hx + 2, hy + 2, C.SKIN_SHAD);
    }

    // Cabello y Cinta Layer: Crimson Headband + Twin Flowing Tails + Multi-Spike Hair
    drawRect(hairGrid, hx - 4, hy - 3, 9, 2, C.JACKET_MID);
    drawRect(hairGrid, hx - 3, hy - 3, 5, 1, C.JACKET_HIGH);
    setPx(hairGrid, hx + 3, hy - 2, C.JACKET_SHAD);
    const bw = spec.bandWave ?? 0;
    drawCapsule(hairGrid, hx - 4, hy - 2, hx - 11, hy - 1 + bw, 1.0, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);
    drawCapsule(hairGrid, hx - 5, hy - 1, hx - 13, hy + 2 + bw * 1.25, 0.9, C.JACKET_SHAD, C.JACKET_DEEP);

    // Detailed Multi-Spike Indigo Hair Crown + Side Lock
    drawEllipse(hairGrid, hx - 1, hy - 5, 4.8, 2.4, C.HAIR_DEEP);
    drawCapsule(hairGrid, hx - 4, hy - 4, hx - 8, hy - 9, 1.3, C.HAIR_MID, C.HAIR_DARK, C.HAIR_LIGHT);
    drawCapsule(hairGrid, hx - 1, hy - 5, hx - 3, hy - 11, 1.4, C.HAIR_MID, C.HAIR_DARK, C.HAIR_LIGHT);
    drawCapsule(hairGrid, hx + 2, hy - 5, hx + 4, hy - 10, 1.3, C.HAIR_MID, C.HAIR_DARK, C.HAIR_LIGHT);
    drawCapsule(hairGrid, hx + 3, hy - 4, hx + 7, hy - 7, 1.0, C.HAIR_DARK, C.HAIR_DEEP);
    // Side bang lock
    drawCapsule(hairGrid, hx - 3, hy - 2, hx - 5, hy + 2, 1.0, C.HAIR_DARK, C.HAIR_DEEP, C.HAIR_MID);
    setPx(hairGrid, hx - 2, hy - 9, C.HAIR_LIGHT);
    setPx(hairGrid, hx + 3, hy - 8, C.HAIR_LIGHT);

    // 7. Front Arm (Muscular Arm + Wrist Bandages + Spiked Crimson/Gold Gauntlet)
    const fSh = spec.frontShoulder ?? [torsoCx + 3, chestY + 2];
    const fEl = spec.frontElbow ?? [torsoCx + 6, chestY + 7];
    const fHa = spec.frontHand ?? [torsoCx + 11, chestY + 4];
    drawCapsule(bodyGrid, fSh[0], fSh[1], fEl[0], fEl[1], 2.5, C.SKIN_MID, C.SKIN_SHAD, C.SKIN_HIGH);
    // Wrist tape wrap
    drawCapsule(outfitGrid, fEl[0], fEl[1], (fEl[0] + fHa[0]) * 0.5, (fEl[1] + fHa[1]) * 0.5, 2.3, C.WRAP_MID, C.WRAP_SHAD, C.WRAP_HIGH);
    // Crimson/Gold battle gauntlet & fist
    drawCapsule(outfitGrid, (fEl[0] + fHa[0]) * 0.5, (fEl[1] + fHa[1]) * 0.5, fHa[0], fHa[1], 2.4, C.JACKET_MID, C.JACKET_SHAD, C.JACKET_HIGH);
    drawEllipse(outfitGrid, fHa[0], fHa[1], 2.6, 2.3, C.JACKET_HIGH);
    setPx(outfitGrid, Math.round(fHa[0] - 1), Math.round(fHa[1] + 1), C.JACKET_SHAD);
    setPx(outfitGrid, Math.round(fHa[0] - 2), Math.round(fHa[1]), C.GOLD_MID);
    setPx(outfitGrid, Math.round(fHa[0] + 1), Math.round(fHa[1] - 1), C.GOLD_HIGH);

    if (spec.armExtSmear) {
      drawRect(outfitGrid, Math.round(fEl[0]), Math.round(fHa[1]), 6, 1, C.VFX_CYAN);
      setPx(outfitGrid, Math.round(fHa[0] + 3), Math.round(fHa[1]), C.VFX_CORE);
    }

    // 8. Compute clean 1px dark tinted pixel-art outline around the combined character silhouette
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const occupied = bodyGrid[y][x] || outfitGrid[y][x] || hairGrid[y][x];
        if (occupied) continue;
        const hasNeighbor =
          bodyGrid[y - 1][x] || outfitGrid[y - 1][x] || hairGrid[y - 1][x] ||
          bodyGrid[y + 1][x] || outfitGrid[y + 1][x] || hairGrid[y + 1][x] ||
          bodyGrid[y][x - 1] || outfitGrid[y][x - 1] || hairGrid[y][x - 1] ||
          bodyGrid[y][x + 1] || outfitGrid[y][x + 1] || hairGrid[y][x + 1];
        if (hasNeighbor) {
          outlineGrid[y][x] = C.OUTLINE;
        }
      }
    }

    return { shadowGrid, outlineGrid, bodyGrid, outfitGrid, hairGrid };
  };

  const makeHitboxes = (
    bodyX: number,
    bodyY: number,
    bodyW: number,
    bodyH: number,
    strike?: { x: number; y: number; w: number; h: number; name: string }
  ): Hitbox[] => {
    const list: Hitbox[] = [
      {
        id: `hb-body-${Math.round(bodyX)}-${Math.round(bodyY)}`,
        type: 'hurtbox',
        x: Math.round(bodyX * baseScaleX),
        y: Math.round(bodyY * baseScaleY),
        w: Math.max(4, Math.round(bodyW * baseScaleX)),
        h: Math.max(4, Math.round(bodyH * baseScaleY)),
        name: 'Body Hurtbox',
      },
    ];
    if (strike) {
      list.push({
        id: `hb-atk-${Math.round(strike.x)}-${Math.round(strike.y)}`,
        type: 'hitbox',
        x: Math.round(strike.x * baseScaleX),
        y: Math.round(strike.y * baseScaleY),
        w: Math.max(3, Math.round(strike.w * baseScaleX)),
        h: Math.max(3, Math.round(strike.h * baseScaleY)),
        name: strike.name,
      });
    }
    return list;
  };

  const makeFrame = (
    idx: number,
    name: string,
    durationTicks: number,
    phase: Frame['phase'],
    charLayers: RenderedCharacterLayers,
    vfxGrid: (string | null)[][],
    hitboxes: Hitbox[],
    groupId: string,
    opts?: {
      hairKeyframe?: LayerKeyframe;
      auraPeakGrid?: (string | null)[][];
    }
  ): Frame => {
    const layers: Layer[] = [
      {
        id: `l-demo-${idx}-shadow`,
        trackId: 'demo-shadow',
        name: 'Sombra Suelo',
        groupId: 'folder-fx',
        visible: true,
        locked: false,
        opacity: 0.45,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        colorTag: '#64748b',
        pixels: charLayers.shadowGrid,
      },
      {
        id: `l-demo-${idx}-outline`,
        trackId: 'demo-outline',
        name: 'Contorno Base',
        groupId: 'folder-character',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        colorTag: '#8b5cf6',
        pixels: charLayers.outlineGrid,
      },
      {
        id: `l-demo-${idx}-body`,
        trackId: 'demo-body',
        name: 'Cuerpo y Sombreado',
        groupId: 'folder-character',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        colorTag: '#f59e0b',
        pixels: charLayers.bodyGrid,
      },
      {
        id: `l-demo-${idx}-outfit`,
        trackId: 'demo-outfit',
        name: 'Vestimenta y Accesorios',
        groupId: 'folder-character',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        colorTag: '#ef4444',
        pixels: charLayers.outfitGrid,
      },
      {
        id: `l-demo-${idx}-hair`,
        trackId: 'demo-hair',
        name: 'Cabello y Cinta',
        groupId: 'folder-character',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        colorTag: '#3b82f6',
        keyframes: opts?.hairKeyframe ? [opts.hairKeyframe] : undefined,
        pixels: charLayers.hairGrid,
      },
      {
        id: `l-demo-${idx}-vfx`,
        trackId: 'demo-fx',
        name: 'FX / Energía y Golpes',
        groupId: 'folder-fx',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'animation',
        colorTag: '#06b6d4',
        pixels: vfxGrid,
      },
    ];

    if (opts?.auraPeakGrid) {
      layers.push({
        id: `l-demo-${idx}-aura-peak`,
        trackId: 'demo-aura-peak',
        name: 'Aura Ki (Pico)',
        groupId: 'folder-fx',
        visible: true,
        locked: false,
        opacity: 0.92,
        fillOpacity: 1,
        blendMode: 'screen',
        layerType: 'ai',
        colorTag: '#ec4899',
        pixels: opts.auraPeakGrid,
      });
    }

    return {
      id: `frame-demo-${idx}`,
      name,
      durationTicks,
      durationMs: Math.round((durationTicks / 60) * 1000),
      phase,
      groupId,
      hitboxes,
      layers,
    };
  };

  const frames: Frame[] = [];

  // =========================================================================
  // 1. IDLE (Frames 0..3) — Fluid Martial Guard Breathing Cycle
  // =========================================================================
  const idleSpecs: FighterPoseSpec[] = [
    { oy: 0, bandWave: 0, sashFlow: 0, frontHand: [43, 27], backHand: [36, 26] },
    { oy: 1, bandWave: 1, sashFlow: 1, frontHand: [43, 28], backHand: [36, 27] },
    { oy: 1, bandWave: 2, sashFlow: 2, frontHand: [42, 28], backHand: [35, 27] },
    { oy: 0, bandWave: -1, sashFlow: 1, frontHand: [42, 26], backHand: [35, 25] },
  ];
  idleSpecs.forEach((sp, i) => {
    const fIdx = frames.length;
    frames.push(
      makeFrame(
        fIdx + 1,
        `Idle ${i + 1}`,
        5,
        'neutral',
        renderFighterLayers(sp),
        newLayerGrid(),
        makeHitboxes(21, 13, 22, 41),
        'group-idle',
        i === 0
          ? { hairKeyframe: { frameIndex: fIdx, offsetX: 0, offsetY: 0, scale: 1, opacity: 1, easing: 'ease-in-out' } }
          : undefined
      )
    );
  });

  // =========================================================================
  // 2. WALK (Frames 4..9) — 6-Frame Smooth Stride Cycle
  // =========================================================================
  const walkSpecs: FighterPoseSpec[] = [
    {
      leanX: 2, oy: 0, bandWave: 1, sashFlow: 2,
      backHip: [27, 34], backKnee: [22, 43], backFoot: [19, 51],
      frontHip: [33, 34], frontKnee: [39, 42], frontFoot: [42, 51],
      frontHand: [44, 27], backHand: [26, 28],
    },
    {
      leanX: 3, oy: 1, bandWave: 2, sashFlow: 3,
      backHip: [28, 35], backKnee: [25, 44], backFoot: [23, 51],
      frontHip: [33, 35], frontKnee: [37, 42], frontFoot: [39, 51],
      frontHand: [43, 28], backHand: [28, 28],
    },
    {
      leanX: 3, oy: -1, bandWave: 2, sashFlow: 3,
      backHip: [29, 33], backKnee: [31, 41], backFoot: [30, 50],
      frontHip: [33, 33], frontKnee: [35, 41], frontFoot: [35, 51],
      frontHand: [41, 26], backHand: [31, 27],
    },
    {
      leanX: 2, oy: 0, bandWave: 1, sashFlow: 2,
      backHip: [28, 34], backKnee: [35, 43], backFoot: [39, 51],
      frontHip: [32, 34], frontKnee: [25, 43], frontFoot: [22, 51],
      frontHand: [39, 28], backHand: [35, 25],
    },
    {
      leanX: 3, oy: 1, bandWave: 0, sashFlow: 2,
      backHip: [29, 35], backKnee: [34, 44], backFoot: [37, 51],
      frontHip: [32, 35], frontKnee: [27, 43], frontFoot: [25, 51],
      frontHand: [41, 28], backHand: [33, 26],
    },
    {
      leanX: 2, oy: -1, bandWave: -1, sashFlow: 1,
      backHip: [28, 33], backKnee: [28, 42], backFoot: [27, 51],
      frontHip: [33, 33], frontKnee: [34, 41], frontFoot: [33, 49],
      frontHand: [43, 27], backHand: [29, 27],
    },
  ];
  walkSpecs.forEach((sp, i) => {
    const fIdx = frames.length;
    frames.push(
      makeFrame(
        fIdx + 1,
        `Walk ${i + 1}`,
        4,
        'neutral',
        renderFighterLayers(sp),
        newLayerGrid(),
        makeHitboxes(20, 12, 23, 42),
        'group-walk'
      )
    );
  });

  // =========================================================================
  // 3. RUN (Frames 10..13) — 4-Frame Aggressive Forward Dash
  // =========================================================================
  const runSpecs: FighterPoseSpec[] = [
    {
      leanX: 8, oy: 1, headTilt: 2, bandWave: 3, sashFlow: 6,
      frontShoulder: [36, 25], frontElbow: [31, 31], frontHand: [39, 32],
      backShoulder: [28, 25], backElbow: [22, 29], backHand: [18, 26],
      backHip: [27, 35], backKnee: [20, 42], backFoot: [15, 49],
      frontHip: [35, 35], frontKnee: [43, 41], frontFoot: [46, 51],
    },
    {
      leanX: 9, oy: -1, headTilt: 2, bandWave: 4, sashFlow: 7,
      frontShoulder: [37, 23], frontElbow: [42, 28], frontHand: [46, 25],
      backShoulder: [28, 24], backElbow: [21, 30], backHand: [25, 33],
      backHip: [28, 34], backKnee: [33, 41], backFoot: [29, 50],
      frontHip: [34, 34], frontKnee: [30, 42], frontFoot: [24, 49],
    },
    {
      leanX: 8, oy: 1, headTilt: 2, bandWave: 3, sashFlow: 6,
      frontShoulder: [36, 25], frontElbow: [43, 29], frontHand: [48, 24],
      backShoulder: [28, 25], backElbow: [22, 31], backHand: [19, 30],
      backHip: [28, 35], backKnee: [36, 41], backFoot: [41, 51],
      frontHip: [34, 35], frontKnee: [24, 42], frontFoot: [17, 48],
    },
    {
      leanX: 9, oy: -1, headTilt: 2, bandWave: 4, sashFlow: 7,
      frontShoulder: [37, 23], frontElbow: [32, 29], frontHand: [40, 29],
      backShoulder: [28, 24], backElbow: [24, 29], backHand: [29, 27],
      backHip: [28, 34], backKnee: [27, 41], backFoot: [24, 51],
      frontHip: [35, 34], frontKnee: [40, 40], frontFoot: [42, 49],
    },
  ];
  runSpecs.forEach((sp, i) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    drawEllipse(vfx, 14 + i * 2, 51, 3.2, 1.5, C.DUST_MID);
    drawEllipse(vfx, 13 + i * 2, 50, 2.0, 1.0, C.DUST_LIGHT);
    setPx(vfx, 11 + i, 49, C.VFX_CORE);
    frames.push(
      makeFrame(
        fIdx + 1,
        `Run ${i + 1}`,
        3,
        'neutral',
        renderFighterLayers(sp),
        vfx,
        makeHitboxes(18, 12, 26, 41),
        'group-run',
        i === 0
          ? { hairKeyframe: { frameIndex: fIdx, offsetX: 1, offsetY: 0, scale: 1, opacity: 1, easing: 'ease-out' } }
          : undefined
      )
    );
  });

  // =========================================================================
  // 4. JUMP (Frames 14..17) — Takeoff Coil -> Rise -> Apex Tuck -> Landing
  // =========================================================================
  const jumpSpecs: { name: string; phase: Frame['phase']; spec: FighterPoseSpec; airRing?: boolean; dust?: boolean; hurtY: number }[] = [
    {
      name: 'Jump Takeoff',
      phase: 'startup',
      hurtY: 18,
      dust: true,
      spec: {
        leanX: 2, oy: 0, crouchDrop: 6, bandWave: -2, sashFlow: 1, shadowScale: 1.15,
        frontShoulder: [35, 29], frontElbow: [40, 33], frontHand: [43, 29],
        backHand: [24, 33],
        backHip: [27, 39], backKnee: [22, 46], backFoot: [23, 52],
        frontHip: [34, 39], frontKnee: [41, 45], frontFoot: [39, 52],
      },
    },
    {
      name: 'Jump Rising',
      phase: 'neutral',
      hurtY: 8,
      airRing: true,
      spec: {
        leanX: 3, oy: -6, bandWave: 4, sashFlow: 4, shadowScale: 0.75,
        frontShoulder: [36, 19], frontElbow: [41, 15], frontHand: [45, 11],
        backShoulder: [27, 20], backElbow: [22, 25], backHand: [20, 21],
        backHip: [28, 29], backKnee: [25, 38], backFoot: [23, 47],
        frontHip: [34, 28], frontKnee: [41, 33], frontFoot: [38, 42],
      },
    },
    {
      name: 'Jump Apex',
      phase: 'neutral',
      hurtY: 3,
      airRing: true,
      spec: {
        leanX: 4, oy: -11, bandWave: 5, sashFlow: 5, shadowScale: 0.55,
        frontShoulder: [36, 14], frontElbow: [42, 11], frontHand: [46, 8],
        backShoulder: [27, 15], backElbow: [22, 20], backHand: [19, 16],
        backHip: [28, 24], backKnee: [23, 32], backFoot: [21, 40],
        frontHip: [34, 23], frontKnee: [42, 26], frontFoot: [39, 34],
      },
    },
    {
      name: 'Jump Landing',
      phase: 'recovery',
      hurtY: 16,
      dust: true,
      spec: {
        leanX: 2, oy: 0, crouchDrop: 5, bandWave: -2, sashFlow: 2, shadowScale: 1.15,
        frontShoulder: [35, 28], frontElbow: [39, 32], frontHand: [43, 28],
        backHand: [25, 32],
        backHip: [27, 38], backKnee: [21, 45], backFoot: [22, 52],
        frontHip: [34, 38], frontKnee: [42, 44], frontFoot: [40, 52],
      },
    },
  ];
  jumpSpecs.forEach((item, i) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    if (item.airRing) {
      const ry = i === 1 ? 47 : 43;
      drawRect(vfx, 23, ry, 16, 1, C.VFX_CYAN);
      setPx(vfx, 21, ry - 1, C.VFX_BLUE);
      setPx(vfx, 40, ry - 1, C.VFX_BLUE);
      setPx(vfx, 31, ry, C.VFX_CORE);
    }
    if (item.dust) {
      drawEllipse(vfx, 20, 52, 3, 1.2, C.DUST_MID);
      drawEllipse(vfx, 42, 52, 3, 1.2, C.DUST_MID);
    }
    frames.push(
      makeFrame(
        fIdx + 1,
        item.name,
        4,
        item.phase,
        renderFighterLayers(item.spec),
        vfx,
        makeHitboxes(19, item.hurtY, 24, 36),
        'group-jump',
        i === 2
          ? { hairKeyframe: { frameIndex: fIdx, offsetX: 0, offsetY: -2, scale: 1, opacity: 1, easing: 'ease-in-out' } }
          : undefined
      )
    );
  });

  // =========================================================================
  // 5. AGACHADO (Frames 18..20) — Low Crouching Guard (Lowered Hurtbox!)
  // =========================================================================
  const crouchSpecs: { name: string; spec: FighterPoseSpec }[] = [
    {
      name: 'Agachado Entrada',
      spec: {
        leanX: 1, crouchDrop: 8, bandWave: -1, sashFlow: 2, shadowScale: 1.15,
        frontShoulder: [34, 31], frontElbow: [40, 35], frontHand: [44, 31],
        backShoulder: [27, 31], backElbow: [23, 35], backHand: [33, 33],
        backHip: [26, 40], backKnee: [20, 45], backFoot: [21, 52],
        frontHip: [34, 40], frontKnee: [42, 44], frontFoot: [40, 52],
      },
    },
    {
      name: 'Agachado Guardia',
      spec: {
        leanX: 2, crouchDrop: 11, bandWave: 0, sashFlow: 3, shadowScale: 1.2,
        frontShoulder: [35, 34], frontElbow: [41, 37], frontHand: [45, 33],
        backShoulder: [27, 34], backElbow: [23, 38], backHand: [34, 35],
        backHip: [25, 42], backKnee: [19, 46], backFoot: [21, 52],
        frontHip: [35, 42], frontKnee: [43, 45], frontFoot: [41, 52],
      },
    },
    {
      name: 'Agachado Respira',
      spec: {
        leanX: 2, crouchDrop: 10, bandWave: 1, sashFlow: 3, shadowScale: 1.18,
        frontShoulder: [35, 33], frontElbow: [41, 36], frontHand: [45, 32],
        backShoulder: [27, 33], backElbow: [23, 37], backHand: [34, 34],
        backHip: [25, 41], backKnee: [19, 46], backFoot: [21, 52],
        frontHip: [35, 41], frontKnee: [43, 45], frontFoot: [41, 52],
      },
    },
  ];
  crouchSpecs.forEach((item, i) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    if (i === 0) {
      drawEllipse(vfx, 21, 52, 2.5, 1.0, C.DUST_MID);
      drawEllipse(vfx, 41, 52, 2.5, 1.0, C.DUST_MID);
    }
    frames.push(
      makeFrame(
        fIdx + 1,
        item.name,
        5,
        'neutral',
        renderFighterLayers(item.spec),
        vfx,
        makeHitboxes(19, 24, 26, 29),
        'group-crouch',
        i === 1
          ? { hairKeyframe: { frameIndex: fIdx, offsetX: 0, offsetY: 2, scale: 1, opacity: 1, easing: 'ease-out' } }
          : undefined
      )
    );
  });

  // =========================================================================
  // 6. ATAQUE LIGERO (Frames 21..23) — Snappy Jab (Startup -> Active -> Recovery)
  // =========================================================================
  const lightSpecs: { name: string; ticks: number; phase: Frame['phase']; spec: FighterPoseSpec; hit?: { x: number; y: number; w: number; h: number; name: string }; smear?: boolean }[] = [
    {
      name: 'Ligero Inicio',
      ticks: 3,
      phase: 'startup',
      spec: {
        leanX: -2, bandWave: 1,
        frontShoulder: [33, 24], frontElbow: [28, 28], frontHand: [33, 27],
        backHand: [39, 25],
      },
    },
    {
      name: 'Ligero Impacto',
      ticks: 4,
      phase: 'active',
      smear: true,
      hit: { x: 43, y: 20, w: 13, h: 7, name: 'Golpe Ligero Hitbox' },
      spec: {
        leanX: 5, mouthOpen: true, bandWave: 3, sashFlow: 4, armExtSmear: true,
        frontShoulder: [36, 23], frontElbow: [43, 23], frontHand: [51, 23],
        backShoulder: [28, 24], backElbow: [24, 28], backHand: [28, 26],
        frontHip: [35, 34], frontKnee: [41, 42], frontFoot: [43, 51],
      },
    },
    {
      name: 'Ligero Recogida',
      ticks: 4,
      phase: 'recovery',
      spec: {
        leanX: 2, bandWave: 1, sashFlow: 2,
        frontShoulder: [35, 24], frontElbow: [39, 26], frontHand: [45, 25],
        backHand: [34, 26],
      },
    },
  ];
  lightSpecs.forEach((item, i) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    if (item.smear) {
      drawRect(vfx, 44, 23, 10, 1, C.VFX_CORE);
      drawRect(vfx, 48, 22, 6, 1, C.VFX_CYAN);
      setPx(vfx, 55, 22, C.VFX_BLUE);
      setPx(vfx, 55, 24, C.VFX_BLUE);
    }
    frames.push(
      makeFrame(
        fIdx + 1,
        item.name,
        item.ticks,
        item.phase,
        renderFighterLayers(item.spec),
        vfx,
        makeHitboxes(20, 12, 24, 41, item.hit),
        'group-light',
        i === 1
          ? { hairKeyframe: { frameIndex: fIdx, offsetX: 1, offsetY: 0, scale: 1, opacity: 1, easing: 'linear' } }
          : undefined
      )
    );
  });

  // =========================================================================
  // 7. ATAQUE FUERTE (Frames 24..27) — Heavy Rising Dragon Uppercut / Crescent
  // =========================================================================
  const heavySpecs: { name: string; ticks: number; phase: Frame['phase']; spec: FighterPoseSpec; vfxType: 'none' | 'impact' | 'follow' | 'recover'; hit?: { x: number; y: number; w: number; h: number; name: string }; auraPeak?: boolean }[] = [
    {
      name: 'Fuerte Carga',
      ticks: 4,
      phase: 'startup',
      vfxType: 'none',
      spec: {
        leanX: -4, crouchDrop: 3, headTilt: -1, bandWave: -1,
        frontShoulder: [31, 28], frontElbow: [24, 32], frontHand: [21, 30],
        backHand: [36, 29],
        backHip: [25, 36], backKnee: [20, 44], backFoot: [19, 52],
        frontHip: [31, 36], frontKnee: [36, 44], frontFoot: [38, 52],
      },
    },
    {
      name: 'Fuerte Impacto',
      ticks: 5,
      phase: 'active',
      vfxType: 'impact',
      auraPeak: true,
      hit: { x: 42, y: 11, w: 15, h: 16, name: 'Golpe Fuerte Hitbox' },
      spec: {
        leanX: 8, oy: -1, mouthOpen: true, headTilt: 2, bandWave: 4, sashFlow: 6, armExtSmear: true,
        frontShoulder: [38, 22], frontElbow: [45, 20], frontHand: [52, 16],
        backShoulder: [28, 24], backElbow: [23, 29], backHand: [26, 26],
        backHip: [27, 34], backKnee: [21, 43], backFoot: [17, 51],
        frontHip: [36, 34], frontKnee: [44, 42], frontFoot: [47, 51],
      },
    },
    {
      name: 'Fuerte Estela',
      ticks: 4,
      phase: 'recovery',
      vfxType: 'follow',
      spec: {
        leanX: 5, oy: 0, bandWave: 3, sashFlow: 4,
        frontShoulder: [36, 23], frontElbow: [42, 24], frontHand: [47, 21],
        backHand: [33, 26],
      },
    },
    {
      name: 'Fuerte Guardia',
      ticks: 4,
      phase: 'recovery',
      vfxType: 'recover',
      spec: {
        leanX: 2, oy: 0, bandWave: 1, sashFlow: 2,
        frontShoulder: [35, 24], frontElbow: [39, 27], frontHand: [43, 25],
        backHand: [35, 26],
      },
    },
  ];
  heavySpecs.forEach((item) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    let auraPeakGrid: (string | null)[][] | undefined;

    if (item.vfxType === 'impact') {
      drawCapsule(vfx, 44, 28, 55, 12, 2.4, C.VFX_GOLD, C.VFX_SPARK, C.VFX_CORE);
      drawCapsule(vfx, 47, 25, 56, 13, 1.3, C.VFX_CORE);
      setPx(vfx, 57, 11, C.VFX_GOLD);
      setPx(vfx, 58, 16, C.VFX_SPARK);
      setPx(vfx, 53, 9, C.VFX_CORE);

      auraPeakGrid = newLayerGrid();
      drawCapsule(auraPeakGrid, 22, 48, 24, 15, 2.0, C.VFX_SPARK);
      drawCapsule(auraPeakGrid, 41, 48, 43, 18, 1.8, C.VFX_GOLD);
      setPx(auraPeakGrid, 25, 11, C.VFX_GOLD);
      setPx(auraPeakGrid, 42, 13, C.VFX_CORE);
    } else if (item.vfxType === 'follow') {
      setPx(vfx, 50, 18, C.VFX_GOLD);
      setPx(vfx, 53, 16, C.VFX_SPARK);
      setPx(vfx, 49, 24, C.VFX_CYAN);
    }

    frames.push(
      makeFrame(
        fIdx + 1,
        item.name,
        item.ticks,
        item.phase,
        renderFighterLayers(item.spec),
        vfx,
        makeHitboxes(20, 12, 24, 41, item.hit),
        'group-heavy',
        {
          hairKeyframe: item.vfxType === 'impact'
            ? { frameIndex: fIdx, offsetX: 2, offsetY: -1, scale: 1, opacity: 1, easing: 'ease-out' }
            : undefined,
          auraPeakGrid,
        }
      )
    );
  });

  // =========================================================================
  // 8. ESPECIAL SIMPLE (Frames 28..31) — Blazing Hadou-Flame Ki Wave
  // =========================================================================
  const specialSpecs: {
    name: string;
    ticks: number;
    phase: Frame['phase'];
    spec: FighterPoseSpec;
    vfxStage: 'charge' | 'surge' | 'blast' | 'fade';
    hit?: { x: number; y: number; w: number; h: number; name: string };
    auraPeak?: boolean;
  }[] = [
    {
      name: 'Especial Carga Ki',
      ticks: 4,
      phase: 'startup',
      vfxStage: 'charge',
      auraPeak: true,
      spec: {
        leanX: -3, crouchDrop: 3, bandWave: -2, sashFlow: 2,
        frontShoulder: [31, 27], frontElbow: [26, 31], frontHand: [26, 27],
        backShoulder: [27, 27], backElbow: [23, 30], backHand: [24, 26],
      },
    },
    {
      name: 'Especial Impulso',
      ticks: 3,
      phase: 'startup',
      vfxStage: 'surge',
      auraPeak: true,
      spec: {
        leanX: 3, oy: 1, mouthOpen: true, bandWave: 2, sashFlow: 4,
        frontShoulder: [34, 25], frontElbow: [36, 26], frontHand: [40, 25],
        backShoulder: [29, 25], backElbow: [33, 27], backHand: [39, 26],
      },
    },
    {
      name: 'Especial Onda Ki',
      ticks: 5,
      phase: 'active',
      vfxStage: 'blast',
      hit: { x: 46, y: 17, w: 17, h: 14, name: 'Onda Ki Especial Hitbox' },
      spec: {
        leanX: 6, oy: 1, mouthOpen: true, bandWave: 4, sashFlow: 6,
        frontShoulder: [36, 24], frontElbow: [41, 24], frontHand: [46, 24],
        backShoulder: [29, 24], backElbow: [36, 26], backHand: [45, 25],
        frontHip: [35, 34], frontKnee: [42, 43], frontFoot: [44, 51],
      },
    },
    {
      name: 'Especial Recogida',
      ticks: 5,
      phase: 'recovery',
      vfxStage: 'fade',
      spec: {
        leanX: 3, oy: 0, bandWave: 2, sashFlow: 2,
        frontHand: [44, 25], backHand: [39, 26],
      },
    },
  ];
  specialSpecs.forEach((item) => {
    const fIdx = frames.length;
    const vfx = newLayerGrid();
    let auraPeakGrid: (string | null)[][] | undefined;

    if (item.vfxStage === 'charge') {
      drawEllipse(vfx, 25, 26, 4.4, 4.4, C.VFX_DEEP);
      drawEllipse(vfx, 25, 26, 3.1, 3.1, C.VFX_BLUE);
      drawEllipse(vfx, 25, 26, 1.9, 1.9, C.VFX_CYAN);
      drawEllipse(vfx, 25, 26, 1.0, 1.0, C.VFX_CORE);
      setPx(vfx, 20, 22, C.VFX_CYAN);
      setPx(vfx, 29, 22, C.VFX_CYAN);
      setPx(vfx, 21, 30, C.VFX_BLUE);

      auraPeakGrid = newLayerGrid();
      drawEllipse(auraPeakGrid, 28, 34, 9, 14, C.VFX_DEEP);
      drawCapsule(auraPeakGrid, 21, 47, 23, 18, 1.6, C.VFX_CYAN);
      drawCapsule(auraPeakGrid, 37, 47, 36, 19, 1.6, C.VFX_CYAN);
    } else if (item.vfxStage === 'surge') {
      drawEllipse(vfx, 40, 25, 4.2, 4.0, C.VFX_BLUE);
      drawEllipse(vfx, 40, 25, 2.5, 2.4, C.VFX_CYAN);
      drawEllipse(vfx, 41, 25, 1.2, 1.2, C.VFX_CORE);

      auraPeakGrid = newLayerGrid();
      drawCapsule(auraPeakGrid, 20, 46, 26, 16, 1.8, C.VFX_BLUE);
      setPx(auraPeakGrid, 27, 13, C.VFX_CYAN);
      setPx(auraPeakGrid, 44, 21, C.VFX_CORE);
    } else if (item.vfxStage === 'blast') {
      drawCapsule(vfx, 45, 24, 55, 24, 4.6, C.VFX_DEEP);
      drawCapsule(vfx, 46, 24, 56, 24, 3.7, C.VFX_BLUE);
      drawEllipse(vfx, 56, 24, 5.0, 4.6, C.VFX_CYAN);
      drawEllipse(vfx, 57, 24, 2.9, 2.7, C.VFX_CORE);
      drawRect(vfx, 59, 21, 2, 1, C.VFX_CYAN);
      setPx(vfx, 61, 24, C.VFX_CORE);
      setPx(vfx, 59, 27, C.VFX_CYAN);
      setPx(vfx, 49, 19, C.VFX_CYAN);
      setPx(vfx, 49, 29, C.VFX_CYAN);
    } else {
      setPx(vfx, 49, 23, C.VFX_CYAN);
      setPx(vfx, 52, 24, C.VFX_BLUE);
      setPx(vfx, 50, 26, C.VFX_CYAN);
      setPx(vfx, 47, 25, C.VFX_CORE);
    }

    frames.push(
      makeFrame(
        fIdx + 1,
        item.name,
        item.ticks,
        item.phase,
        renderFighterLayers(item.spec),
        vfx,
        makeHitboxes(20, 13, 24, 40, item.hit),
        'group-special',
        {
          hairKeyframe: item.vfxStage === 'blast'
            ? { frameIndex: fIdx, offsetX: 1, offsetY: 0, scale: 1, opacity: 1, easing: 'ease-out' }
            : undefined,
          auraPeakGrid,
        }
      )
    );
  });

  return frames;
}
