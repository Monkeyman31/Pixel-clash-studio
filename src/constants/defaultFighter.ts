import { Frame, Hitbox, Layer } from '../types';
import { createEmptyGrid } from '../utils/pixelMath';

export function createDefaultFighterFrames(width: number = 48, height: number = 48): Frame[] {
  // Palette references:
  const SKIN_LIGHT = '#ffde6a';
  const SKIN_MID = '#f2ae4b';
  const SKIN_SHADOW = '#c77e38';
  const GI_WHITE = '#ffffff';
  const GI_SHADOW = '#858ea6';
  const GI_DARK = '#36394f';
  const BELT_BLACK = '#10121a';
  const HEADBAND_RED = '#eb4f46';
  const HAIR_DARK = '#1e202e';
  const VFX_CYAN = '#5ed2ff';
  const VFX_WHITE = '#ffffff';
  const VFX_CORE = '#2399eb';

  // Helper to place pixels safely
  const fillPixels = (grid: (string | null)[][], coords: [number, number, string][]) => {
    coords.forEach(([x, y, color]) => {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        grid[y][x] = color;
      }
    });
  };

  // -------------------------------------------------------------
  // FRAME 1: Combat Stance / Anticipation (Neutral / Startup)
  // -------------------------------------------------------------
  const gridF1 = createEmptyGrid(width, height);
  const f1Pixels: [number, number, string][] = [
    // Headband
    [21, 12, HEADBAND_RED], [22, 12, HEADBAND_RED], [23, 12, HEADBAND_RED], [24, 12, HEADBAND_RED], [25, 12, HEADBAND_RED],
    [26, 12, HEADBAND_RED], [27, 13, HEADBAND_RED], [28, 14, HEADBAND_RED],
    // Hair
    [22, 11, HAIR_DARK], [23, 10, HAIR_DARK], [24, 10, HAIR_DARK], [25, 11, HAIR_DARK],
    // Face
    [22, 13, SKIN_LIGHT], [23, 13, SKIN_LIGHT], [24, 13, SKIN_LIGHT], [25, 13, SKIN_MID],
    [22, 14, SKIN_LIGHT], [23, 14, SKIN_LIGHT], [24, 14, SKIN_LIGHT], [25, 14, SKIN_SHADOW],
    [23, 15, SKIN_SHADOW], [24, 15, SKIN_SHADOW],
    // Torso / Gi
    [21, 16, GI_WHITE], [22, 16, GI_WHITE], [23, 16, SKIN_LIGHT], [24, 16, GI_WHITE], [25, 16, GI_SHADOW],
    [20, 17, GI_WHITE], [21, 17, GI_WHITE], [22, 17, GI_WHITE], [23, 17, SKIN_MID], [24, 17, GI_SHADOW], [25, 17, GI_DARK],
    [20, 18, GI_WHITE], [21, 18, GI_WHITE], [22, 18, GI_WHITE], [23, 18, GI_WHITE], [24, 18, GI_SHADOW], [25, 18, GI_DARK],
    // Black Belt
    [20, 19, BELT_BLACK], [21, 19, BELT_BLACK], [22, 19, BELT_BLACK], [23, 19, BELT_BLACK], [24, 19, BELT_BLACK],
    [22, 20, BELT_BLACK], [22, 21, BELT_BLACK],
    // Left Arm Guard (Back)
    [18, 15, GI_WHITE], [18, 16, SKIN_LIGHT], [18, 17, SKIN_MID],
    // Right Arm (Lead Fist Guard)
    [26, 16, GI_WHITE], [27, 15, GI_WHITE], [28, 14, SKIN_LIGHT], [29, 14, SKIN_MID], [28, 15, SKIN_SHADOW],
    // Legs / Pants
    [20, 20, GI_WHITE], [21, 20, GI_WHITE], [23, 20, GI_SHADOW], [24, 20, GI_DARK],
    [19, 21, GI_WHITE], [20, 21, GI_WHITE], [24, 21, GI_SHADOW], [25, 21, GI_DARK],
    [18, 22, GI_WHITE], [19, 22, GI_WHITE], [25, 22, GI_SHADOW], [26, 22, GI_DARK],
    [17, 23, GI_SHADOW], [18, 23, GI_DARK], [26, 23, GI_SHADOW], [27, 23, GI_DARK],
    // Feet / Barefoot
    [16, 24, SKIN_LIGHT], [17, 24, SKIN_MID], [18, 24, SKIN_SHADOW],
    [26, 24, SKIN_LIGHT], [27, 24, SKIN_MID], [28, 24, SKIN_SHADOW]
  ];
  fillPixels(gridF1, f1Pixels);

  const f1Hitboxes: Hitbox[] = [
    { id: 'hb-1-body', type: 'hurtbox', x: 16, y: 10, w: 14, h: 16, name: 'Main Body Hurtbox' }
  ];

  // -------------------------------------------------------------
  // FRAME 2: Windup / Step Forward (Startup 4F)
  // -------------------------------------------------------------
  const gridF2 = createEmptyGrid(width, height);
  const f2Pixels: [number, number, string][] = [
    // Headband flowing
    [22, 13, HEADBAND_RED], [23, 13, HEADBAND_RED], [24, 13, HEADBAND_RED], [25, 13, HEADBAND_RED], [26, 13, HEADBAND_RED],
    [27, 14, HEADBAND_RED], [28, 15, HEADBAND_RED], [29, 15, HEADBAND_RED],
    // Hair
    [23, 12, HAIR_DARK], [24, 11, HAIR_DARK], [25, 11, HAIR_DARK], [26, 12, HAIR_DARK],
    // Face (focused squint)
    [23, 14, SKIN_LIGHT], [24, 14, SKIN_LIGHT], [25, 14, SKIN_LIGHT], [26, 14, SKIN_SHADOW],
    [23, 15, SKIN_LIGHT], [24, 15, SKIN_MID], [25, 15, SKIN_SHADOW],
    // Torso coiled back
    [21, 17, GI_WHITE], [22, 17, GI_WHITE], [23, 17, SKIN_LIGHT], [24, 17, GI_WHITE], [25, 17, GI_SHADOW],
    [21, 18, GI_WHITE], [22, 18, GI_WHITE], [23, 18, GI_WHITE], [24, 18, GI_SHADOW], [25, 18, GI_DARK],
    // Arm wound back
    [17, 16, SKIN_LIGHT], [18, 16, SKIN_MID], [19, 17, GI_WHITE],
    [20, 19, BELT_BLACK], [21, 19, BELT_BLACK], [22, 19, BELT_BLACK], [23, 19, BELT_BLACK],
    // Lead arm cocked
    [26, 16, GI_WHITE], [27, 16, SKIN_LIGHT], [28, 16, SKIN_MID],
    // Lower body shifted forward
    [21, 20, GI_WHITE], [22, 20, GI_WHITE], [24, 20, GI_SHADOW],
    [20, 21, GI_WHITE], [21, 21, GI_WHITE], [25, 21, GI_SHADOW], [26, 21, GI_DARK],
    [19, 22, GI_WHITE], [27, 22, GI_SHADOW], [28, 22, GI_DARK],
    // Feet
    [18, 24, SKIN_LIGHT], [19, 24, SKIN_SHADOW],
    [28, 24, SKIN_LIGHT], [29, 24, SKIN_MID], [30, 24, SKIN_SHADOW]
  ];
  fillPixels(gridF2, f2Pixels);

  const f2Hitboxes: Hitbox[] = [
    { id: 'hb-2-body', type: 'hurtbox', x: 18, y: 11, w: 14, h: 15, name: 'Body Hurtbox' }
  ];

  // -------------------------------------------------------------
  // FRAME 3: Explosive Straight Thrust / Strike (Active 3F)
  // -------------------------------------------------------------
  const gridF3 = createEmptyGrid(width, height);
  const f3Pixels: [number, number, string][] = [
    // Headband flying
    [24, 12, HEADBAND_RED], [25, 12, HEADBAND_RED], [26, 12, HEADBAND_RED], [27, 12, HEADBAND_RED],
    [28, 12, HEADBAND_RED], [29, 13, HEADBAND_RED], [30, 13, HEADBAND_RED],
    // Hair
    [24, 11, HAIR_DARK], [25, 10, HAIR_DARK], [26, 10, HAIR_DARK], [27, 11, HAIR_DARK],
    // Face shout
    [25, 13, SKIN_LIGHT], [26, 13, SKIN_LIGHT], [27, 13, SKIN_LIGHT],
    [25, 14, SKIN_LIGHT], [26, 14, SKIN_SHADOW], [27, 14, SKIN_SHADOW],
    // Torso leaned forward
    [23, 16, GI_WHITE], [24, 16, GI_WHITE], [25, 16, SKIN_LIGHT], [26, 16, GI_WHITE], [27, 16, GI_SHADOW],
    [23, 17, GI_WHITE], [24, 17, GI_WHITE], [25, 17, GI_WHITE], [26, 17, GI_SHADOW],
    [22, 18, BELT_BLACK], [23, 18, BELT_BLACK], [24, 18, BELT_BLACK], [25, 18, BELT_BLACK],
    // Extended Strike Arm (Smear line & Fist)
    [28, 16, GI_WHITE], [29, 16, GI_WHITE], [30, 16, GI_WHITE],
    [31, 16, SKIN_LIGHT], [32, 16, SKIN_LIGHT], [33, 16, SKIN_LIGHT],
    [34, 15, SKIN_LIGHT], [34, 16, SKIN_LIGHT], [34, 17, SKIN_MID], // Fist Knuckles
    [35, 15, SKIN_LIGHT], [35, 16, SKIN_MID], [35, 17, SKIN_SHADOW],
    // Legs wide lunging stance
    [22, 19, GI_WHITE], [23, 19, GI_WHITE], [27, 19, GI_SHADOW],
    [20, 20, GI_WHITE], [21, 20, GI_WHITE], [28, 20, GI_SHADOW], [29, 20, GI_DARK],
    [18, 21, GI_WHITE], [19, 21, GI_WHITE], [30, 21, GI_SHADOW], [31, 21, GI_DARK],
    [16, 23, SKIN_LIGHT], [17, 23, SKIN_SHADOW],
    [31, 23, SKIN_LIGHT], [32, 23, SKIN_MID], [33, 23, SKIN_SHADOW]
  ];
  fillPixels(gridF3, f3Pixels);

  const f3Hitboxes: Hitbox[] = [
    { id: 'hb-3-body', type: 'hurtbox', x: 20, y: 11, w: 12, h: 14, name: 'Lunging Body' },
    { id: 'hb-3-fist', type: 'hitbox', x: 32, y: 14, w: 6, h: 5, name: 'Heavy Fist Hitbox' }
  ];

  // -------------------------------------------------------------
  // FRAME 4: Ki Energy Follow-Through (Recovery 6F with VFX)
  // -------------------------------------------------------------
  const gridF4 = createEmptyGrid(width, height);
  const f4Pixels: [number, number, string][] = [
    // Headband
    [23, 12, HEADBAND_RED], [24, 12, HEADBAND_RED], [25, 12, HEADBAND_RED], [26, 12, HEADBAND_RED], [27, 13, HEADBAND_RED],
    // Hair
    [23, 11, HAIR_DARK], [24, 10, HAIR_DARK], [25, 10, HAIR_DARK], [26, 11, HAIR_DARK],
    // Face
    [24, 13, SKIN_LIGHT], [25, 13, SKIN_LIGHT], [26, 13, SKIN_LIGHT],
    [24, 14, SKIN_LIGHT], [25, 14, SKIN_MID], [26, 14, SKIN_SHADOW],
    // Torso settling back
    [22, 16, GI_WHITE], [23, 16, GI_WHITE], [24, 16, SKIN_LIGHT], [25, 16, GI_WHITE], [26, 16, GI_SHADOW],
    [22, 17, GI_WHITE], [23, 17, GI_WHITE], [24, 17, GI_WHITE], [25, 17, GI_SHADOW],
    [22, 18, BELT_BLACK], [23, 18, BELT_BLACK], [24, 18, BELT_BLACK], [25, 18, BELT_BLACK],
    // Arm retracting
    [27, 16, GI_WHITE], [28, 16, SKIN_LIGHT], [29, 16, SKIN_MID],
    // Legs settling
    [21, 19, GI_WHITE], [22, 19, GI_WHITE], [25, 19, GI_SHADOW],
    [20, 20, GI_WHITE], [21, 20, GI_WHITE], [26, 20, GI_SHADOW], [27, 20, GI_DARK],
    [18, 22, GI_WHITE], [28, 22, GI_SHADOW],
    [17, 24, SKIN_LIGHT], [18, 24, SKIN_SHADOW],
    [28, 24, SKIN_LIGHT], [29, 24, SKIN_SHADOW]
  ];
  fillPixels(gridF4, f4Pixels);

  // VFX Layer for Frame 4 (Burst energy spark in front of the fist)
  const gridF4VFX = createEmptyGrid(width, height);
  const f4VfxPixels: [number, number, string][] = [
    // Impact cross / spark
    [33, 16, VFX_CORE], [34, 16, VFX_WHITE], [35, 16, VFX_WHITE], [36, 16, VFX_CYAN],
    [34, 15, VFX_CYAN], [35, 15, VFX_WHITE], [35, 14, VFX_CORE],
    [34, 17, VFX_CYAN], [35, 17, VFX_WHITE], [35, 18, VFX_CORE],
    [32, 14, VFX_CYAN], [37, 14, VFX_CYAN], [32, 18, VFX_CYAN], [37, 18, VFX_CYAN]
  ];
  fillPixels(gridF4VFX, f4VfxPixels);

  const f4Hitboxes: Hitbox[] = [
    { id: 'hb-4-body', type: 'hurtbox', x: 19, y: 11, w: 12, h: 14, name: 'Recovering Body' }
  ];

  return [
    {
      id: 'frame-1',
      name: 'Startup 1 (Anticipation)',
      durationTicks: 4,
      phase: 'startup',
      hitboxes: f1Hitboxes,
      layers: [
        { id: 'l-f1-char', name: 'Fighter Base', visible: true, locked: false, opacity: 1, pixels: gridF1 },
        { id: 'l-f1-vfx', name: 'Ki VFX', visible: true, locked: false, opacity: 1, pixels: createEmptyGrid(width, height) }
      ]
    },
    {
      id: 'frame-2',
      name: 'Startup 2 (Coil & Lunge)',
      durationTicks: 3,
      phase: 'startup',
      hitboxes: f2Hitboxes,
      layers: [
        { id: 'l-f2-char', name: 'Fighter Base', visible: true, locked: false, opacity: 1, pixels: gridF2 },
        { id: 'l-f2-vfx', name: 'Ki VFX', visible: true, locked: false, opacity: 1, pixels: createEmptyGrid(width, height) }
      ]
    },
    {
      id: 'frame-3',
      name: 'Active Strike (Fist Extended)',
      durationTicks: 4,
      phase: 'active',
      hitboxes: f3Hitboxes,
      layers: [
        { id: 'l-f3-char', name: 'Fighter Base', visible: true, locked: false, opacity: 1, pixels: gridF3 },
        { id: 'l-f3-vfx', name: 'Ki VFX', visible: true, locked: false, opacity: 1, pixels: createEmptyGrid(width, height) }
      ]
    },
    {
      id: 'frame-4',
      name: 'Recovery (Follow-through & Spark)',
      durationTicks: 6,
      phase: 'recovery',
      hitboxes: f4Hitboxes,
      layers: [
        { id: 'l-f4-char', name: 'Fighter Base', visible: true, locked: false, opacity: 1, pixels: gridF4 },
        { id: 'l-f4-vfx', name: 'Ki VFX', visible: true, locked: false, opacity: 1, pixels: gridF4VFX }
      ]
    }
  ];
}
