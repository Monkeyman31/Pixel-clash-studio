import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { StartupPreferences } from '../types';
import {
  SPLASH_LOADING_STAGES,
  STUDIO_LOADING_TIPS,
  loadCustomMascotBlob,
  probePublicMascotAsset,
} from '../utils/startupPreferences';
import { PixelClashLogoIcon } from './PixelClashLogoIcon';

// =============================================================================
// OFFICIAL PIXELCLASH STUDIO MASCOT RENDERER (Crisp Nearest-Neighbor)
// Displays the user's official pixel-art mascot riding the red bicycle with the
// rubber duck in the basket (./assets/aistudio/image_8586dab7.png), enhanced with
// crisp pixel-art cycling motion (subtle bounce, moving road dashes & wind streaks).
// =============================================================================
const OFFICIAL_MASCOT_URL = './assets/aistudio/image_8586dab7.png';

function drawOfficialMascotFrame(
  ctx: CanvasRenderingContext2D,
  mascotImg: HTMLImageElement | null,
  frameIndex: number,
  size: number
) {
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;

  // Pixel grid step for crisp ambient road dashes & speed streaks
  const px = Math.max(2, Math.floor(size / 36));
  const roadY = size - px * 4;

  // Ground shadow directly under bicycle wheels
  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  ctx.fillRect(px * 6, roadY - px, size - px * 12, px * 2);

  // Scrolling pixel-art asphalt road dashes moving left (bicycle rides right)
  ctx.fillStyle = '#242e47';
  ctx.fillRect(px * 2, roadY + px, size - px * 4, px);

  const dashSpacing = px * 8;
  const dashShift = (frameIndex * px * 2) % dashSpacing;
  ctx.fillStyle = '#475569';
  for (let dx = size - dashShift; dx > -px * 6; dx -= dashSpacing) {
    const clampedX = Math.max(px * 2, dx);
    const dashW = Math.min(px * 4, size - px * 2 - clampedX);
    if (dashW > 0) {
      ctx.fillRect(clampedX, roadY + px, dashW, px);
    }
  }

  // Subtle trailing wind streaks & amber sparks behind the rear wheel
  const streakOffset = (frameIndex % 4) * px * 2;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.fillRect(px * 2 + (streakOffset % (px * 6)), Math.round(size * 0.28), px * 4, px);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.fillRect(px * 1 + ((streakOffset + px * 3) % (px * 5)), Math.round(size * 0.56), px * 3, px);

  // Tiny wheel dust puff behind back tire
  const dustStep = frameIndex % 4;
  ctx.fillStyle = dustStep % 2 === 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(249, 115, 22, 0.4)';
  ctx.fillRect(px * (5 - dustStep), roadY - px * (1 + (dustStep % 2)), px, px);
  ctx.fillRect(px * (3 - Math.floor(dustStep / 2)), roadY - px * 2, px, px);

  if (mascotImg && mascotImg.naturalWidth > 0 && mascotImg.naturalHeight > 0) {
    // Crisp nearest-neighbor fit inside container with room for road
    const maxW = size - px * 4;
    const maxH = roadY - px * 2;
    const rawScale = Math.min(maxW / mascotImg.naturalWidth, maxH / mascotImg.naturalHeight);
    // Prefer integer scale when possible for ultra-crisp pixel edges
    const cleanScale = rawScale >= 1 ? Math.max(1, Math.floor(rawScale * 2) / 2) : rawScale;
    const drawW = Math.max(1, Math.round(mascotImg.naturalWidth * cleanScale));
    const drawH = Math.max(1, Math.round(mascotImg.naturalHeight * cleanScale));

    // Lively 4-step cycling cadence bob (0, -px, 0, +0)
    const bobPx = frameIndex % 4 === 1 || frameIndex % 4 === 2 ? -px : 0;
    const drawX = Math.floor((size - drawW) / 2);
    const drawY = Math.max(px, roadY - drawH + bobPx);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mascotImg, drawX, drawY, drawW, drawH);
  }
}

// =============================================================================
// REUSABLE MASCOT PREVIEW COMPONENT (Used by SplashLoadingScreen & HomeScreen)
// Supports:
//   1. Custom GIF / Animated WEBP uploaded by user (IndexedDB)
//   2. Custom Spritesheet PNG uploaded by user (IndexedDB)
//   3. Static /public/mascot.gif or /public/mascot.webp
//   4. Official PixelClash Studio pixel-art mascot (./assets/aistudio/image_8586dab7.png)
// =============================================================================
interface MascotPreviewCanvasProps {
  preferences: StartupPreferences;
  size?: number;
  refreshToken?: number;
}

export const MascotPreviewCanvas: React.FC<MascotPreviewCanvasProps> = ({
  preferences,
  size = 112,
  refreshToken = 0,
}) => {
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | null>(null);
  const [sheetImage, setSheetImage] = useState<HTMLImageElement | null>(null);
  const [officialMascotImg, setOfficialMascotImg] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preload official mascot asset once
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (active) setOfficialMascotImg(img);
    };
    img.src = OFFICIAL_MASCOT_URL;
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      setResolvedGifUrl(null);
      setSheetImage(null);

      if (
        preferences.mascotMode === 'custom_gif_webp' ||
        preferences.mascotMode === 'custom_spritesheet'
      ) {
        const stored = await loadCustomMascotBlob();
        if (!active) return;
        if (stored && stored.blob) {
          objectUrl = URL.createObjectURL(stored.blob);
          if (preferences.mascotMode === 'custom_gif_webp') {
            setResolvedGifUrl(objectUrl);
            return;
          }
          // Load spritesheet into Image element
          const img = new Image();
          img.onload = () => {
            if (active) setSheetImage(img);
          };
          img.src = objectUrl;
          return;
        }
      }

      // Check if user bundled public/mascot.gif or public/mascot.webp in repo/Tauri build
      const publicUrl = await probePublicMascotAsset();
      if (active && publicUrl) {
        setResolvedGifUrl(publicUrl);
      }
    };

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [preferences.mascotMode, preferences.mascotCustomName, refreshToken]);

  // Animate either custom spritesheet or official PixelClash Studio mascot
  useEffect(() => {
    if (resolvedGifUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameIdx = 0;

    if (preferences.mascotMode === 'custom_spritesheet' && sheetImage) {
      const cols = Math.max(1, preferences.mascotSheetCols || 4);
      const rows = Math.max(1, preferences.mascotSheetRows || 1);
      const total = cols * rows;
      const fps = Math.max(1, Math.min(60, preferences.mascotSheetFps || 10));
      const cellW = Math.max(1, Math.floor(sheetImage.naturalWidth / cols));
      const cellH = Math.max(1, Math.floor(sheetImage.naturalHeight / rows));

      const paintSheetFrame = () => {
        const idx = frameIdx % total;
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        ctx.clearRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = false;
        const scale = Math.min((size - 8) / cellW, (size - 8) / cellH);
        const dw = Math.max(1, Math.round(cellW * scale));
        const dh = Math.max(1, Math.round(cellH * scale));
        const dx = Math.floor((size - dw) / 2);
        const dy = Math.floor((size - dh) / 2);
        ctx.drawImage(sheetImage, c * cellW, r * cellH, cellW, cellH, dx, dy, dw, dh);
        frameIdx++;
      };

      paintSheetFrame();
      const timer = window.setInterval(paintSheetFrame, Math.round(1000 / fps));
      return () => window.clearInterval(timer);
    }

    // Default official PixelClash Studio mascot with crisp pixel-art cycling animation
    const paintOfficial = () => {
      drawOfficialMascotFrame(ctx, officialMascotImg, frameIdx, size);
      frameIdx = (frameIdx + 1) % 16;
    };

    paintOfficial();
    const timer = window.setInterval(paintOfficial, 115);
    return () => window.clearInterval(timer);
  }, [
    resolvedGifUrl,
    sheetImage,
    officialMascotImg,
    size,
    preferences.mascotMode,
    preferences.mascotSheetCols,
    preferences.mascotSheetRows,
    preferences.mascotSheetFps,
  ]);

  if (resolvedGifUrl) {
    return (
      <img
        src={resolvedGifUrl}
        alt="Mascota PixelClash Studio"
        style={{ width: size, height: size }}
        className="object-contain pixel-canvas select-none"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pixel-canvas select-none"
      style={{ width: size, height: size }}
    />
  );
};

// =============================================================================
// FULL-SCREEN STUDIO SPLASH / LOADING ANIMATION SCREEN
// Smart timing: enforces configurable minimum duration to prevent flicker,
// stays visible if real initialization takes longer, fades smoothly on finish.
// =============================================================================
interface SplashLoadingScreenProps {
  isOpen: boolean;
  preferences: StartupPreferences;
  versionLabel?: string;
  onInitTask?: () => Promise<void>;
  onComplete: () => void;
}

export const SplashLoadingScreen: React.FC<SplashLoadingScreenProps> = ({
  isOpen,
  preferences,
  versionLabel = 'v2.4',
  onInitTask,
  onComplete,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const [fadingOut, setFadingOut] = useState(false);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * STUDIO_LOADING_TIPS.length)
  );

  const onInitRef = useRef(onInitTask);
  const onCompleteRef = useRef(onComplete);
  onInitRef.current = onInitTask;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setFadingOut(false);
    setStageIndex(0);
    setProgress(10);

    const minDuration = Math.max(600, Math.min(5000, preferences.splashMinDurationMs || 1500));
    const startTs = performance.now();

    // Smooth visual progress ticker synchronized with initialization stages
    const tickId = window.setInterval(() => {
      if (cancelled) return;
      const elapsed = performance.now() - startTs;
      const ratio = Math.min(0.94, elapsed / Math.max(1, minDuration));
      setProgress(Math.max(10, Math.round(ratio * 100)));
      if (ratio < 0.34) {
        setStageIndex(0);
      } else if (ratio < 0.72) {
        setStageIndex(1);
      } else {
        setStageIndex(2);
      }
    }, 55);

    const minTimerPromise = new Promise<void>((resolve) => {
      window.setTimeout(resolve, minDuration);
    });

    const realInitPromise = (async () => {
      try {
        if (onInitRef.current) {
          await onInitRef.current();
        }
      } catch {
        // Never stall splash on non-critical init probe failure
      }
    })();

    Promise.all([minTimerPromise, realInitPromise]).then(() => {
      if (cancelled) return;
      window.clearInterval(tickId);
      setStageIndex(SPLASH_LOADING_STAGES.length - 1);
      setProgress(100);
      setFadingOut(true);
      window.setTimeout(() => {
        if (!cancelled) {
          onCompleteRef.current();
        }
      }, 280);
    });

    return () => {
      cancelled = true;
      window.clearInterval(tickId);
    };
  }, [isOpen, preferences.splashMinDurationMs]);

  if (!isOpen) return null;

  const currentTip = STUDIO_LOADING_TIPS[tipIndex % STUDIO_LOADING_TIPS.length];
  const stageText = SPLASH_LOADING_STAGES[stageIndex] || SPLASH_LOADING_STAGES[0];

  return (
    <div
      className={`fixed inset-0 z-[220] bg-[#090c14] text-slate-100 flex items-center justify-center p-6 transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-md border border-[#22293d] bg-[#0f1320] rounded-xl shadow-2xl overflow-hidden">
        {/* Hairline brand accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-sky-400 to-amber-400" />

        <div className="p-7 flex flex-col items-center text-center gap-5">
          {/* Brand Logo + Version */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2.5">
              <PixelClashLogoIcon size={30} className="shadow-md" />
              <h1 className="text-lg font-extrabold tracking-tight text-slate-100">
                PixelClash Studio
              </h1>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {versionLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Suite profesional de Pixel Art, Spritesheets y Animación 2D
            </p>
          </div>

          {/* Animated Mascot Container */}
          <div className="w-32 h-32 rounded-lg border border-[#232b42] bg-[#0a0d16] flex items-center justify-center overflow-hidden">
            <MascotPreviewCanvas preferences={preferences} size={112} />
          </div>

          {/* Dynamic Loading Stage & Crisp Progress Bar */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-slate-300">{stageText}</span>
              <span className="text-amber-400 font-semibold">{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-sm bg-[#181e30] overflow-hidden border border-[#222a40]">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Optional Tips & Shortcuts */}
          {preferences.showSplashTips && currentTip && (
            <button
              type="button"
              onClick={() => setTipIndex((i) => (i + 1) % STUDIO_LOADING_TIPS.length)}
              title="Haz clic para ver otro consejo"
              className="w-full text-left p-3 rounded-lg border border-[#1f273c] bg-[#0b0e18] hover:border-[#2e3854] transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {currentTip.category}
                </span>
                <span className="text-slate-500">Siguiente consejo</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {currentTip.text}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
