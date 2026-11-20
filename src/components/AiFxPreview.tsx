import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Sparkles, Flame, Layers } from 'lucide-react';
import { AiExternalProfileId } from '../types';

export interface FxPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  prompt: string;
  frames: { x: number; y: number; color: string }[][];
}

export type AiStyleMode = 'inherit' | '8bit' | 'snes' | 'guiltygear' | AiExternalProfileId;

// 4-frame retro fighting game animated FX sprites (normalized in 32x32 space)
export const FX_PRESETS: FxPreset[] = [
  {
    id: 'hadoken_blue',
    name: 'Hadoken Fuego Azul',
    category: 'Proyectil',
    color: '#38bdf8',
    prompt: 'Bola de fuego Hadoken azul con chispas de energía y estela de viento',
    frames: [
      // Frame 1: Hand-level spark core
      [
        { x: 14, y: 15, color: '#ffffff' }, { x: 15, y: 15, color: '#ffffff' },
        { x: 14, y: 16, color: '#ffffff' }, { x: 15, y: 16, color: '#ffffff' },
        { x: 13, y: 15, color: '#5ed2ff' }, { x: 16, y: 15, color: '#5ed2ff' },
        { x: 14, y: 14, color: '#5ed2ff' }, { x: 15, y: 14, color: '#5ed2ff' },
        { x: 14, y: 17, color: '#5ed2ff' }, { x: 15, y: 17, color: '#5ed2ff' },
        { x: 12, y: 16, color: '#0284c7' }, { x: 17, y: 15, color: '#0284c7' },
      ],
      // Frame 2: Expanding Ki Orb
      [
        { x: 15, y: 14, color: '#ffffff' }, { x: 16, y: 14, color: '#ffffff' },
        { x: 15, y: 15, color: '#ffffff' }, { x: 16, y: 15, color: '#ffffff' },
        { x: 15, y: 16, color: '#ffffff' }, { x: 16, y: 16, color: '#ffffff' },
        { x: 14, y: 14, color: '#5ed2ff' }, { x: 17, y: 14, color: '#5ed2ff' },
        { x: 14, y: 15, color: '#5ed2ff' }, { x: 17, y: 15, color: '#5ed2ff' },
        { x: 14, y: 16, color: '#5ed2ff' }, { x: 17, y: 16, color: '#5ed2ff' },
        { x: 15, y: 13, color: '#5ed2ff' }, { x: 16, y: 13, color: '#5ed2ff' },
        { x: 15, y: 17, color: '#5ed2ff' }, { x: 16, y: 17, color: '#5ed2ff' },
        { x: 13, y: 15, color: '#0284c7' }, { x: 18, y: 15, color: '#0284c7' },
        { x: 12, y: 14, color: '#38bdf8' }, { x: 19, y: 16, color: '#38bdf8' },
      ],
      // Frame 3: Thrusting Hadoken fireball with trailing flame teeth
      [
        { x: 18, y: 14, color: '#ffffff' }, { x: 19, y: 14, color: '#ffffff' },
        { x: 18, y: 15, color: '#ffffff' }, { x: 19, y: 15, color: '#ffffff' },
        { x: 20, y: 14, color: '#ffffff' }, { x: 20, y: 15, color: '#ffffff' },
        { x: 21, y: 14, color: '#5ed2ff' }, { x: 21, y: 15, color: '#5ed2ff' },
        { x: 17, y: 13, color: '#5ed2ff' }, { x: 18, y: 13, color: '#5ed2ff' }, { x: 19, y: 13, color: '#5ed2ff' },
        { x: 17, y: 16, color: '#5ed2ff' }, { x: 18, y: 16, color: '#5ed2ff' }, { x: 19, y: 16, color: '#5ed2ff' },
        { x: 15, y: 12, color: '#0284c7' }, { x: 14, y: 13, color: '#38bdf8' },
        { x: 15, y: 15, color: '#5ed2ff' }, { x: 13, y: 15, color: '#0284c7' },
        { x: 15, y: 17, color: '#0284c7' }, { x: 14, y: 18, color: '#38bdf8' },
        { x: 22, y: 14, color: '#38bdf8' }, { x: 23, y: 15, color: '#bae6fd' },
      ],
      // Frame 4: Max burst & flare displacement
      [
        { x: 22, y: 14, color: '#ffffff' }, { x: 23, y: 14, color: '#ffffff' },
        { x: 22, y: 15, color: '#ffffff' }, { x: 23, y: 15, color: '#ffffff' },
        { x: 24, y: 14, color: '#5ed2ff' }, { x: 24, y: 15, color: '#5ed2ff' },
        { x: 25, y: 14, color: '#bae6fd' }, { x: 25, y: 15, color: '#bae6fd' },
        { x: 20, y: 13, color: '#5ed2ff' }, { x: 21, y: 13, color: '#5ed2ff' },
        { x: 20, y: 16, color: '#5ed2ff' }, { x: 21, y: 16, color: '#5ed2ff' },
        { x: 18, y: 12, color: '#0284c7' }, { x: 17, y: 11, color: '#38bdf8' },
        { x: 18, y: 17, color: '#0284c7' }, { x: 17, y: 18, color: '#38bdf8' },
        { x: 16, y: 14, color: '#0369a1' }, { x: 15, y: 15, color: '#0284c7' },
      ],
    ],
  },
  {
    id: 'ki_aura',
    name: 'Aura Ki Explosiva',
    category: 'Buff / Carga',
    color: '#eab308',
    prompt: 'Aura dorada de Ki hirviente con picos ascendentes de energía super Saiyan',
    frames: [
      // Frame 1: Low ground shimmer
      [
        { x: 13, y: 22, color: '#fef08a' }, { x: 14, y: 22, color: '#fef08a' }, { x: 17, y: 22, color: '#fef08a' }, { x: 18, y: 22, color: '#fef08a' },
        { x: 12, y: 21, color: '#eab308' }, { x: 15, y: 21, color: '#ca8a04' }, { x: 16, y: 21, color: '#ca8a04' }, { x: 19, y: 21, color: '#eab308' },
        { x: 11, y: 18, color: '#fef08a' }, { x: 20, y: 18, color: '#fef08a' },
      ],
      // Frame 2: Rising flame spikes
      [
        { x: 11, y: 15, color: '#fef08a' }, { x: 11, y: 16, color: '#eab308' }, { x: 12, y: 17, color: '#ca8a04' },
        { x: 20, y: 15, color: '#fef08a' }, { x: 20, y: 16, color: '#eab308' }, { x: 19, y: 17, color: '#ca8a04' },
        { x: 10, y: 19, color: '#eab308' }, { x: 21, y: 19, color: '#eab308' },
        { x: 12, y: 22, color: '#ffffff' }, { x: 19, y: 22, color: '#ffffff' },
        { x: 15, y: 10, color: '#fef08a' }, { x: 16, y: 10, color: '#fef08a' },
      ],
      // Frame 3: Full explosive surge
      [
        { x: 10, y: 13, color: '#ffffff' }, { x: 10, y: 14, color: '#fef08a' }, { x: 11, y: 15, color: '#eab308' },
        { x: 21, y: 13, color: '#ffffff' }, { x: 21, y: 14, color: '#fef08a' }, { x: 20, y: 15, color: '#eab308' },
        { x: 9, y: 17, color: '#eab308' }, { x: 22, y: 17, color: '#eab308' },
        { x: 14, y: 8, color: '#ffffff' }, { x: 15, y: 8, color: '#fef08a' }, { x: 16, y: 8, color: '#ffffff' },
        { x: 13, y: 23, color: '#eab308' }, { x: 18, y: 23, color: '#eab308' },
      ],
      // Frame 4: Turbulent corona
      [
        { x: 11, y: 11, color: '#ffffff' }, { x: 12, y: 12, color: '#fef08a' }, { x: 11, y: 14, color: '#eab308' },
        { x: 20, y: 11, color: '#ffffff' }, { x: 19, y: 12, color: '#fef08a' }, { x: 20, y: 14, color: '#eab308' },
        { x: 8, y: 18, color: '#fef08a' }, { x: 23, y: 18, color: '#fef08a' },
        { x: 15, y: 6, color: '#ffffff' }, { x: 16, y: 7, color: '#fef08a' },
        { x: 14, y: 22, color: '#fef08a' }, { x: 17, y: 22, color: '#fef08a' },
      ],
    ],
  },
  {
    id: 'shoryu_fire',
    name: 'Shoryuken Dragon Fire',
    category: 'Anti-Aéreo',
    color: '#f97316',
    prompt: 'Pilar ascendente de fuego con cabeza de dragón ígneo de Shoryuken',
    frames: [
      // Frame 1: Ground spark ignite
      [
        { x: 15, y: 23, color: '#ffffff' }, { x: 16, y: 23, color: '#ffffff' },
        { x: 14, y: 22, color: '#fdba74' }, { x: 17, y: 22, color: '#fdba74' },
        { x: 15, y: 21, color: '#f97316' }, { x: 16, y: 21, color: '#f97316' },
      ],
      // Frame 2: Rising flame spiral
      [
        { x: 15, y: 16, color: '#ffffff' }, { x: 16, y: 16, color: '#ffffff' },
        { x: 14, y: 17, color: '#fdba74' }, { x: 17, y: 17, color: '#fdba74' },
        { x: 13, y: 19, color: '#f97316' }, { x: 18, y: 19, color: '#f97316' },
        { x: 14, y: 21, color: '#c2410c' }, { x: 17, y: 21, color: '#c2410c' },
      ],
      // Frame 3: Apex dragon jaws
      [
        { x: 15, y: 9, color: '#ffffff' }, { x: 16, y: 9, color: '#ffffff' },
        { x: 14, y: 10, color: '#fdba74' }, { x: 17, y: 10, color: '#fdba74' },
        { x: 13, y: 11, color: '#f97316' }, { x: 18, y: 11, color: '#f97316' },
        { x: 12, y: 12, color: '#c2410c' }, { x: 19, y: 12, color: '#c2410c' },
        { x: 14, y: 14, color: '#ea580c' }, { x: 17, y: 14, color: '#ea580c' },
        { x: 15, y: 17, color: '#c2410c' }, { x: 16, y: 17, color: '#c2410c' },
      ],
      // Frame 4: Dispersing embers
      [
        { x: 14, y: 6, color: '#fdba74' }, { x: 17, y: 7, color: '#ffffff' },
        { x: 12, y: 9, color: '#f97316' }, { x: 19, y: 9, color: '#f97316' },
        { x: 15, y: 12, color: '#c2410c' }, { x: 16, y: 13, color: '#9a3412' },
      ],
    ],
  },
  {
    id: 'electric_sparks',
    name: 'Chispas de Impacto / Stun',
    category: 'Hit Spark',
    color: '#a855f7',
    prompt: 'Chispas eléctricas retro púrpuras de contragolpe con estallido geométrico',
    frames: [
      // Frame 1: Center flash point
      [
        { x: 16, y: 16, color: '#ffffff' },
        { x: 15, y: 16, color: '#d8b4fe' }, { x: 17, y: 16, color: '#d8b4fe' },
        { x: 16, y: 15, color: '#d8b4fe' }, { x: 16, y: 17, color: '#d8b4fe' },
      ],
      // Frame 2: 4-way lightning cross
      [
        { x: 16, y: 16, color: '#ffffff' },
        { x: 14, y: 16, color: '#a855f7' }, { x: 13, y: 16, color: '#c084fc' },
        { x: 18, y: 16, color: '#a855f7' }, { x: 19, y: 16, color: '#c084fc' },
        { x: 16, y: 14, color: '#a855f7' }, { x: 16, y: 13, color: '#c084fc' },
        { x: 16, y: 18, color: '#a855f7' }, { x: 16, y: 19, color: '#c084fc' },
        { x: 15, y: 15, color: '#ffffff' }, { x: 17, y: 17, color: '#ffffff' },
      ],
      // Frame 3: Diagonal lightning starburst
      [
        { x: 11, y: 11, color: '#c084fc' }, { x: 12, y: 12, color: '#ffffff' },
        { x: 21, y: 11, color: '#c084fc' }, { x: 20, y: 12, color: '#ffffff' },
        { x: 11, y: 21, color: '#c084fc' }, { x: 12, y: 20, color: '#ffffff' },
        { x: 21, y: 21, color: '#c084fc' }, { x: 20, y: 20, color: '#ffffff' },
        { x: 16, y: 16, color: '#ffffff' },
        { x: 16, y: 10, color: '#9333ea' }, { x: 16, y: 22, color: '#9333ea' },
      ],
      // Frame 4: Fading residual sparks
      [
        { x: 9, y: 9, color: '#7e22ce' }, { x: 23, y: 9, color: '#7e22ce' },
        { x: 9, y: 23, color: '#7e22ce' }, { x: 23, y: 23, color: '#7e22ce' },
        { x: 16, y: 8, color: '#a855f7' }, { x: 16, y: 24, color: '#a855f7' },
      ],
    ],
  },
  {
    id: 'sword_slash',
    name: 'Corte de Espada / Slash Arc',
    category: 'Energy Slash',
    color: '#22c55e',
    prompt: 'Corte de katana curvo en media luna con estela de viento esmeralda',
    frames: [
      // Frame 1: Starting slash origin
      [
        { x: 10, y: 22, color: '#ffffff' }, { x: 11, y: 21, color: '#86efac' },
        { x: 12, y: 20, color: '#22c55e' },
      ],
      // Frame 2: Mid-arc sweeping crescent
      [
        { x: 12, y: 16, color: '#ffffff' }, { x: 13, y: 15, color: '#ffffff' }, { x: 14, y: 14, color: '#ffffff' },
        { x: 11, y: 17, color: '#86efac' }, { x: 12, y: 15, color: '#86efac' }, { x: 13, y: 13, color: '#86efac' },
        { x: 10, y: 19, color: '#22c55e' }, { x: 15, y: 12, color: '#22c55e' },
      ],
      // Frame 3: Full sweeping crescent arc
      [
        { x: 15, y: 11, color: '#ffffff' }, { x: 16, y: 10, color: '#ffffff' }, { x: 17, y: 10, color: '#ffffff' }, { x: 18, y: 10, color: '#ffffff' },
        { x: 19, y: 11, color: '#86efac' }, { x: 20, y: 12, color: '#86efac' }, { x: 21, y: 14, color: '#86efac' },
        { x: 14, y: 12, color: '#86efac' }, { x: 13, y: 14, color: '#22c55e' }, { x: 22, y: 16, color: '#22c55e' },
        { x: 18, y: 9, color: '#bbf7d0' }, { x: 19, y: 10, color: '#ffffff' },
      ],
      // Frame 4: Trailing wind dissipation
      [
        { x: 21, y: 13, color: '#bbf7d0' }, { x: 22, y: 15, color: '#86efac' },
        { x: 23, y: 17, color: '#22c55e' }, { x: 24, y: 19, color: '#15803d' },
      ],
    ],
  },
];

// Helper to remap colors to chosen style
export function remapFxPixelsToStyle(
  pixels: { x: number; y: number; color: string }[],
  styleMode: AiStyleMode = 'inherit',
  characterPalette: string[] = []
): { x: number; y: number; color: string }[] {
  if (styleMode === 'inherit' && characterPalette.length >= 2) {
    const palette = characterPalette.slice(0, 12);
    return pixels.map((p, idx) => {
      const mappedColor = palette[idx % palette.length];
      return { ...p, color: mappedColor };
    });
  }

  if (styleMode === 'kof') {
    // KOF Palette: blazing fire, deep reds, warm embers
    const kofRamp = ['#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#b71c1c'];
    return pixels.map((p, idx) => ({ ...p, color: kofRamp[idx % kofRamp.length] }));
  }

  if (styleMode === 'cps2') {
    // Capcom CPS2: vibrant plasma cyan, magenta, electric yellow
    const cps2Ramp = ['#ffffff', '#00f0ff', '#ff00aa', '#ffea00', '#0077ff'];
    return pixels.map((p, idx) => ({ ...p, color: cps2Ramp[idx % cps2Ramp.length] }));
  }

  if (styleMode === '8bit') {
    // Retro NES 8-bit strict 4 colors
    const nesRamp = ['#ffffff', '#ff0000', '#ffaa00', '#000000'];
    return pixels.map((p, idx) => ({ ...p, color: nesRamp[idx % nesRamp.length] }));
  }

  if (styleMode === 'snes') {
    // 16-bit SNES: emerald and gold combat flares
    const snesRamp = ['#ffffff', '#4ade80', '#16a34a', '#facc15', '#065f46'];
    return pixels.map((p, idx) => ({ ...p, color: snesRamp[idx % snesRamp.length] }));
  }

  if (styleMode === 'guiltygear' || styleMode === 'guilty_gear') {
    const ggRamp = ['#ffffff', '#a855f7', '#ec4899', '#3b82f6', '#1e1b4b'];
    return pixels.map((p, idx) => ({ ...p, color: ggRamp[idx % ggRamp.length] }));
  }

  if (styleMode === 'sf_alpha') {
    const sfaRamp = ['#ffffff', '#38bdf8', '#2563eb', '#facc15', '#f43f5e'];
    return pixels.map((p, idx) => ({ ...p, color: sfaRamp[idx % sfaRamp.length] }));
  }

  if (styleMode === 'darkstalkers') {
    const dsRamp = ['#ffffff', '#c084fc', '#9333ea', '#10b981', '#2e1065'];
    return pixels.map((p, idx) => ({ ...p, color: dsRamp[idx % dsRamp.length] }));
  }

  if (styleMode === 'blazblue') {
    const bbRamp = ['#ffffff', '#22d3ee', '#0284c7', '#e0f2fe', '#0f172a'];
    return pixels.map((p, idx) => ({ ...p, color: bbRamp[idx % bbRamp.length] }));
  }

  if (styleMode === 'snk_neogeo') {
    const snkRamp = ['#ffffff', '#fb923c', '#ef4444', '#facc15', '#7f1d1d'];
    return pixels.map((p, idx) => ({ ...p, color: snkRamp[idx % snkRamp.length] }));
  }

  if (styleMode === 'pixel_fantasy') {
    const pfRamp = ['#ffffff', '#fde047', '#34d399', '#059669', '#064e3b'];
    return pixels.map((p, idx) => ({ ...p, color: pfRamp[idx % pfRamp.length] }));
  }

  if (styleMode === 'pixel_cyberpunk') {
    const pcRamp = ['#ffffff', '#22d3ee', '#f472b6', '#a855f7', '#0f172a'];
    return pixels.map((p, idx) => ({ ...p, color: pcRamp[idx % pcRamp.length] }));
  }

  return pixels;
}

interface AiFxPreviewProps {
  canvasWidth?: number;
  canvasHeight?: number;
  selectedPresetId: string;
  onSelectPreset: (preset: FxPreset) => void;
  styleMode?: AiStyleMode;
  characterPalette?: string[];
  performanceMode?: 'quality' | 'balanced' | 'performance';
  onInjectSequence?: (frames: { x: number; y: number; color: string }[][], preset: FxPreset) => void;
  onInjectSingleFrame?: (pixels: { x: number; y: number; color: string }[], preset: FxPreset) => void;
}

export const AiFxPreview: React.FC<AiFxPreviewProps> = React.memo(({
  selectedPresetId,
  onSelectPreset,
  styleMode = 'inherit',
  characterPalette = [],
  performanceMode = 'balanced',
  onInjectSequence,
  onInjectSingleFrame,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isOnScreen, setIsOnScreen] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = 5;

  const activePreset = useMemo(() => {
    return FX_PRESETS.find((p) => p.id === selectedPresetId) || FX_PRESETS[0];
  }, [selectedPresetId]);

  // Apply style remapping to all 4 frames
  const styledFrames = useMemo(() => {
    return activePreset.frames.map((framePixels) => {
      return remapFxPixelsToStyle(framePixels, styleMode, characterPalette);
    });
  }, [activePreset, styleMode, characterPalette]);

  // Pause animation automatically when scrolled out of viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsOnScreen(entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Frame animation ticker (throttled in Performance mode; pauses when off-screen/hidden)
  useEffect(() => {
    if (!isPlaying || !isOnScreen) return;
    const tickMs = performanceMode === 'performance' ? 240 : performanceMode === 'balanced' ? 110 : 90;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setCurrentFrameIndex((prev) => (prev + 1) % 4);
    }, tickMs);
    return () => clearInterval(interval);
  }, [isPlaying, isOnScreen, performanceMode]);

  // Draw current frame to preview canvas
  useEffect(() => {
    if (!isOnScreen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle center origin cross
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16 * scale, 0);
    ctx.lineTo(16 * scale, 32 * scale);
    ctx.moveTo(0, 16 * scale);
    ctx.lineTo(32 * scale, 16 * scale);
    ctx.stroke();

    // Draw active frame pixels with style applied
    const framePixels = styledFrames[currentFrameIndex] || [];
    framePixels.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
    });
  }, [styledFrames, currentFrameIndex, scale, isOnScreen]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2.5 bg-[#121624] p-3 rounded-xl border border-[#232c42]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Preview Animada de Efecto FX (Secuencia 4F)
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          Fotograma {currentFrameIndex + 1} de 4
        </span>
      </div>

      {/* Preset Selector Chips */}
      <div className="flex flex-wrap gap-1">
        {FX_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                setCurrentFrameIndex(0);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all border ${
                isSelected
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                  : 'bg-[#181d2e] border-[#29334a] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Animated Preview Canvas Box */}
      <div className="flex items-center justify-center gap-4 py-2 bg-[#0b0e15] rounded-xl border border-[#20273a] p-2.5">
        <div className="canvas-checkerboard rounded-lg border border-[#2f3950] overflow-hidden shadow-inner shrink-0">
          <canvas
            ref={canvasRef}
            width={32 * scale}
            height={32 * scale}
            className="pixel-canvas block"
          />
        </div>

        {/* Playback & Frame Scrubber */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-slate-400 font-mono">
            Categoría: <span className="text-white font-semibold">{activePreset.category}</span>
          </div>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-[#222b40] text-slate-200 hover:bg-[#2c3752]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span className="text-[11px]">{isPlaying ? 'Pausar' : 'Animar'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex((prev) => (prev === 0 ? 3 : prev - 1));
              }}
              title="Fotograma anterior"
              className="p-1 rounded bg-[#1c2233] hover:bg-[#28324a] text-slate-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex((prev) => (prev + 1) % 4);
              }}
              title="Fotograma siguiente"
              className="p-1 rounded bg-[#1c2233] hover:bg-[#28324a] text-slate-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 ml-1">
              F#{currentFrameIndex + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Direct Injections Actions */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        {onInjectSequence && (
          <button
            onClick={() => onInjectSequence(styledFrames, activePreset)}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Inyectar Secuencia Animada Completa (4 fotogramas)</span>
          </button>
        )}

        {onInjectSingleFrame && (
          <button
            onClick={() => onInjectSingleFrame(styledFrames[currentFrameIndex], activePreset)}
            className="w-full py-1.5 rounded-lg bg-[#1a2032] hover:bg-[#242d45] border border-[#2b354d] text-slate-300 hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Inyectar solo fotograma #{currentFrameIndex + 1} en capa activa</span>
          </button>
        )}
      </div>
    </div>
  );
});

