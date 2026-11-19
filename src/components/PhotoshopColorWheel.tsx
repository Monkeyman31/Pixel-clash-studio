import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Plus, Circle, Square, Triangle, SlidersHorizontal, Sparkles, RotateCcw, Check } from 'lucide-react';
import { StudioSlider } from './StudioSlider';

export type ColorPickerMode = 'wheel' | 'square' | 'triangle' | 'sliders';
export type HarmonyMode = 'shift' | 'complementary' | 'analogous' | 'triad' | 'split' | 'monochrome' | 'contrast';

interface PhotoshopColorWheelProps {
  color: string; // Hex (e.g. #ff3344)
  alpha: number; // 0 to 1
  onChangeColor: (hex: string) => void;
  onChangeAlpha: (alpha: number) => void;
  presetColors?: string[];
  onApplyPalette?: (colors: string[]) => void;
}

const PICKER_MODE_KEY = 'pixelclash_color_picker_mode_v1';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = clamp(parseInt(clean.substring(0, 2), 16) || 0, 0, 255);
  const g = clamp(parseInt(clean.substring(2, 4), 16) || 0, 0, 255);
  const b = clamp(parseInt(clean.substring(4, 6), 16) || 0, 0, 255);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const h = clamp(Math.round(n), 0, 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r: r255, g: g255, b: b255 } = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const val = clamp(v, 0, 1);

  let r = 0;
  let g = 0;
  let b = 0;
  const i = Math.floor((hue / 60) % 6);
  const f = hue / 60 - Math.floor(hue / 60);
  const p = val * (1 - sat);
  const q = val * (1 - f * sat);
  const t = val * (1 - (1 - f) * sat);

  switch (i) {
    case 0: r = val; g = t; b = p; break;
    case 1: r = q; g = val; b = p; break;
    case 2: r = p; g = val; b = t; break;
    case 3: r = p; g = q; b = val; break;
    case 4: r = t; g = p; b = val; break;
    case 5: r = val; g = p; b = q; break;
  }

  return rgbToHex(r * 255, g * 255, b * 255);
}

function hsvToHsl(h: number, s: number, v: number): { h: number; s: number; l: number } {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl, l };
}

function hslToHsv(h: number, s: number, l: number): { h: number; s: number; v: number } {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv, v };
}

export const PhotoshopColorWheel: React.FC<PhotoshopColorWheelProps> = ({
  color,
  alpha,
  onChangeColor,
  onChangeAlpha,
  presetColors = [],
  onApplyPalette,
}) => {
  const [pickerMode, setPickerMode] = useState<ColorPickerMode>(() => {
    try {
      const saved = localStorage.getItem(PICKER_MODE_KEY) as ColorPickerMode | null;
      if (saved && ['wheel', 'square', 'triangle', 'sliders'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'wheel';
  });

  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => hexToHsv(color));
  const [sliderSpace, setSliderSpace] = useState<'rgb' | 'hsl'>('rgb');
  const [hexDraft, setHexDraft] = useState<string>(color);
  const [recentColors, setRecentColors] = useState<string[]>([
    '#ffffff', '#10121a', '#eb4f46', '#f2ae4b', '#5ed2ff', '#54b069', '#aa47bd',
  ]);
  // Dynamic Palette Variability Controls (Hue, Saturation, Contrast, Brightness & Harmony)
  const [showPaletteStudio, setShowPaletteStudio] = useState<boolean>(false);
  const [palHueShift, setPalHueShift] = useState<number>(0);
  const [palSatShift, setPalSatShift] = useState<number>(0);
  const [palContrast, setPalContrast] = useState<number>(0);
  const [palLightShift, setPalLightShift] = useState<number>(0);
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>('shift');

  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const satValCanvasRef = useRef<HTMLCanvasElement>(null);
  const squareCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueBarCanvasRef = useRef<HTMLCanvasElement>(null);
  const triCanvasRef = useRef<HTMLCanvasElement>(null);

  const isDraggingHue = useRef<boolean>(false);
  const isDraggingSatVal = useRef<boolean>(false);
  const isDraggingTriangle = useRef<boolean>(false);

  const handleSelectPickerMode = (mode: ColorPickerMode) => {
    setPickerMode(mode);
    try {
      localStorage.setItem(PICKER_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setHexDraft(color);
    if (color.startsWith('#') && color.length >= 4) {
      const newHsv = hexToHsv(color);
      setHsv((prev) => {
        if (newHsv.s === 0) return { ...newHsv, h: prev.h };
        return newHsv;
      });
    }
  }, [color]);

  // 1. Draw Circular Hue Wheel (Shared by 'wheel' and 'triangle')
  useEffect(() => {
    if (pickerMode !== 'wheel' && pickerMode !== 'triangle') return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const outerRadius = center - 2;
    const innerRadius = outerRadius - 16;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;

      ctx.beginPath();
      ctx.arc(center, center, outerRadius, startAngle, endAngle, false);
      ctx.arc(center, center, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    const rad = (hsv.h * Math.PI) / 180;
    const markerRadius = (outerRadius + innerRadius) / 2;
    const mx = center + Math.cos(rad) * markerRadius;
    const my = center + Math.sin(rad) * markerRadius;

    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv.h, pickerMode]);

  // 2. Draw Sat/Val Inner Box (Mode: 'wheel')
  useEffect(() => {
    if (pickerMode !== 'wheel') return;
    const canvas = satValCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
    ctx.fillRect(0, 0, width, height);

    const whiteGrad = ctx.createLinearGradient(0, 0, width, 0);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, width, height);

    const blackGrad = ctx.createLinearGradient(0, 0, 0, height);
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    blackGrad.addColorStop(1, '#000000');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, width, height);

    const px = hsv.s * width;
    const py = (1 - hsv.v) * height;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv, pickerMode]);

  // 3. Draw Classic Rectangular HSB Square + Hue Strip (Mode: 'square')
  useEffect(() => {
    if (pickerMode !== 'square') return;
    const sqCanvas = squareCanvasRef.current;
    if (sqCanvas) {
      const ctx = sqCanvas.getContext('2d');
      if (ctx) {
        const w = sqCanvas.width;
        const h = sqCanvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
        ctx.fillRect(0, 0, w, h);

        const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
        whiteGrad.addColorStop(0, '#ffffff');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, w, h);

        const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, '#000000');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, w, h);

        const px = hsv.s * w;
        const py = (1 - hsv.v) * h;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const barCanvas = hueBarCanvasRef.current;
    if (barCanvas) {
      const ctx = barCanvas.getContext('2d');
      if (ctx) {
        const w = barCanvas.width;
        const h = barCanvas.height;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        for (let i = 0; i <= 6; i++) {
          grad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const hx = (hsv.h / 360) * w;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - 2, 0, 4, h);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx - 2, 0.5, 4, h - 1);
      }
    }
  }, [hsv, pickerMode]);

  // Helper: Fixed Equilateral Triangle vertices inside center of wheel (Mode: 'triangle')
  // Fixed orientation so Pure Hue stays at top apex, White at bottom-left, Black at bottom-right (never rotates on Hue change)
  const getTriangleVertices = (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 22;
    const radHue = -Math.PI / 2; // Top apex (Pure Hue)
    const radWhite = -Math.PI / 2 + (4 * Math.PI) / 3; // Bottom-left apex (White)
    const radBlack = -Math.PI / 2 + (2 * Math.PI) / 3; // Bottom-right apex (Black)

    return {
      pHue: { x: cx + Math.cos(radHue) * r, y: cy + Math.sin(radHue) * r },
      pWhite: { x: cx + Math.cos(radWhite) * r, y: cy + Math.sin(radWhite) * r },
      pBlack: { x: cx + Math.cos(radBlack) * r, y: cy + Math.sin(radBlack) * r },
    };
  };

  // 4. Draw Inscribed Equilateral SV Triangle (Mode: 'triangle')
  useEffect(() => {
    if (pickerMode !== 'triangle') return;
    const canvas = triCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    const { pHue, pWhite, pBlack } = getTriangleVertices(size);
    const pureRgb = hexToRgb(hsvToHex(hsv.h, 1, 1));

    const img = ctx.createImageData(size, size);
    const data = img.data;

    const v0x = pWhite.x - pBlack.x;
    const v0y = pWhite.y - pBlack.y;
    const v1x = pHue.x - pBlack.x;
    const v1y = pHue.y - pBlack.y;
    const denom = v0x * v1y - v1x * v0y;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = x - pBlack.x;
        const py = y - pBlack.y;
        const wWhite = (px * v1y - v1x * py) / denom;
        const wHue = (v0x * py - px * v0y) / denom;
        const wBlack = 1 - wWhite - wHue;

        if (wWhite >= -0.01 && wHue >= -0.01 && wBlack >= -0.01) {
          const cw = clamp(wWhite, 0, 1);
          const ch = clamp(wHue, 0, 1);
          const r = Math.round(cw * 255 + ch * pureRgb.r);
          const g = Math.round(cw * 255 + ch * pureRgb.g);
          const b = Math.round(cw * 255 + ch * pureRgb.b);
          const idx = (y * size + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // Subtle triangle border
    ctx.beginPath();
    ctx.moveTo(pHue.x, pHue.y);
    ctx.lineTo(pWhite.x, pWhite.y);
    ctx.lineTo(pBlack.x, pBlack.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Marker position from S & V weights:
    // Color = V * ((1 - S) * White + S * Hue) => wHue = V*S, wWhite = V*(1-S), wBlack = 1-V
    const wHue = hsv.v * hsv.s;
    const wWhite = hsv.v * (1 - hsv.s);
    const wBlack = 1 - hsv.v;
    const mx = wHue * pHue.x + wWhite * pWhite.x + wBlack * pBlack.x;
    const my = wHue * pHue.y + wWhite * pWhite.y + wBlack * pBlack.y;

    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv, pickerMode]);

  // Handlers
  const handleWheelPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    const newHsv = { ...hsv, h: angle };
    setHsv(newHsv);
    onChangeColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const handleSatValPointer = (e: React.PointerEvent<HTMLCanvasElement>, targetRef: React.RefObject<HTMLCanvasElement | null>) => {
    const canvas = targetRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);

    const s = x / rect.width;
    const v = 1 - y / rect.height;
    const newHsv = { ...hsv, s, v };
    setHsv(newHsv);
    onChangeColor(hsvToHex(newHsv.h, s, v));
  };

  const handleHueBarPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = hueBarCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const h = (x / rect.width) * 360;
    const newHsv = { ...hsv, h };
    setHsv(newHsv);
    onChangeColor(hsvToHex(h, newHsv.s, newHsv.v));
  };

  const handleTrianglePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = triCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const size = canvas.width;
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;

    const { pHue, pWhite, pBlack } = getTriangleVertices(size);
    const v0x = pWhite.x - pBlack.x;
    const v0y = pWhite.y - pBlack.y;
    const v1x = pHue.x - pBlack.x;
    const v1y = pHue.y - pBlack.y;
    const denom = v0x * v1y - v1x * v0y;

    let wWhite = (x - pBlack.x) * v1y - v1x * (y - pBlack.y);
    wWhite /= denom;
    let wHue = v0x * (y - pBlack.y) - (x - pBlack.x) * v0y;
    wHue /= denom;
    let wBlack = 1 - wWhite - wHue;

    // Clamp barycentric weights cleanly back onto the triangle
    wWhite = Math.max(0, wWhite);
    wHue = Math.max(0, wHue);
    wBlack = Math.max(0, wBlack);
    const sum = wWhite + wHue + wBlack || 1;
    wWhite /= sum;
    wHue /= sum;
    wBlack /= sum;

    const v = clamp(wWhite + wHue, 0, 1);
    const s = v > 0.0001 ? clamp(wHue / v, 0, 1) : 0;
    const newHsv = { ...hsv, s, v };
    setHsv(newHsv);
    onChangeColor(hsvToHex(newHsv.h, s, v));
  };

  const handleAddRecentColor = (col: string) => {
    if (!recentColors.includes(col)) {
      setRecentColors((prev) => [col, ...prev.slice(0, 13)]);
    }
  };

  const rgb = hexToRgb(color);
  const hsl = hsvToHsl(hsv.h, hsv.s, hsv.v);

  // Hue-shifted shading ramp (2 shadows, base, 2 highlights) useful for fighting sprite shading
  const rampColors = [
    hsvToHex((hsv.h + 20) % 360, clamp(hsv.s + 0.14, 0, 1), clamp(hsv.v - 0.34, 0.08, 1)),
    hsvToHex((hsv.h + 10) % 360, clamp(hsv.s + 0.07, 0, 1), clamp(hsv.v - 0.17, 0.12, 1)),
    color,
    hsvToHex((hsv.h - 10 + 360) % 360, clamp(hsv.s - 0.08, 0, 1), clamp(hsv.v + 0.16, 0, 1)),
    hsvToHex((hsv.h - 18 + 360) % 360, clamp(hsv.s - 0.18, 0, 1), clamp(hsv.v + 0.32, 0, 1)),
  ];

  // Live Palette Variation Generator (Hue, Saturation, Contrast, Luminance + Color Harmonies)
  const variedPalette = useMemo(() => {
    const transformHex = (hex: string): string => {
      const cHsv = hexToHsv(hex);
      const cHsl = hsvToHsl(cHsv.h, cHsv.s, cHsv.v);
      const nextH = (cHsl.h + palHueShift + 360) % 360;
      const nextS = clamp(cHsl.s + palSatShift / 100, 0, 1);
      // Apply contrast around 0.5 midpoint + brightness shift
      const factor = palContrast >= 0 ? 1 + (palContrast / 100) * 1.6 : 1 + (palContrast / 100) * 0.75;
      const nextL = clamp((cHsl.l - 0.5) * factor + 0.5 + palLightShift / 100, 0.02, 0.98);
      const outHsv = hslToHsv(nextH, nextS, nextL);
      return hsvToHex(outHsv.h, outHsv.s, outHsv.v);
    };

    if (harmonyMode === 'shift') {
      const source = presetColors.length > 0 ? presetColors : recentColors;
      return source.map(transformHex);
    }

    const baseH = (hsv.h + palHueShift + 360) % 360;
    const baseS = clamp(hsv.s + palSatShift / 100, 0.15, 1);
    const contrastSpread = 1 + (palContrast / 100) * 0.6;
    const buildRamp = (hDeg: number, sat: number) => {
      const vMid = clamp(hsv.v + palLightShift / 100, 0.25, 0.9);
      return [
        hsvToHex((hDeg + 18) % 360, clamp(sat + 0.12, 0, 1), clamp(vMid - 0.38 * contrastSpread, 0.06, 0.95)),
        hsvToHex((hDeg + 8) % 360, clamp(sat + 0.05, 0, 1), clamp(vMid - 0.18 * contrastSpread, 0.12, 0.95)),
        hsvToHex(hDeg, sat, vMid),
        hsvToHex((hDeg - 8 + 360) % 360, clamp(sat - 0.1, 0, 1), clamp(vMid + 0.18 * contrastSpread, 0.1, 0.98)),
        hsvToHex((hDeg - 16 + 360) % 360, clamp(sat - 0.25, 0, 1), clamp(vMid + 0.36 * contrastSpread, 0.2, 1)),
      ];
    };

    const neutralRamp = ['#0b0c12', '#262938', '#585f78', '#a0a8c2', '#f4f6fc'].map(transformHex);
    if (harmonyMode === 'complementary') {
      return [...neutralRamp, ...buildRamp(baseH, baseS), ...buildRamp((baseH + 180) % 360, baseS)];
    }
    if (harmonyMode === 'analogous') {
      return [
        ...neutralRamp,
        ...buildRamp((baseH - 30 + 360) % 360, baseS),
        ...buildRamp(baseH, baseS),
        ...buildRamp((baseH + 30) % 360, baseS),
      ];
    }
    if (harmonyMode === 'triad') {
      return [
        ...neutralRamp,
        ...buildRamp(baseH, baseS),
        ...buildRamp((baseH + 120) % 360, baseS),
        ...buildRamp((baseH + 240) % 360, baseS),
      ];
    }
    if (harmonyMode === 'split') {
      return [
        ...neutralRamp,
        ...buildRamp(baseH, baseS),
        ...buildRamp((baseH + 150) % 360, baseS),
        ...buildRamp((baseH + 210) % 360, baseS),
      ];
    }
    if (harmonyMode === 'contrast') {
      return [
        '#050508', '#151824', '#f8fafc',
        ...buildRamp(baseH, 0.95),
        ...buildRamp((baseH + 180) % 360, 0.95),
        ...buildRamp((baseH + 90) % 360, 0.85),
      ];
    }
    // Monochrome
    return [0.1, 0.22, 0.38, 0.54, 0.7, 0.84, 0.96].map((vVal, idx) =>
      hsvToHex(
        (baseH + (3 - idx) * 5 + 360) % 360,
        clamp(baseS * (1 - idx * 0.08), 0.08, 1),
        clamp(vVal + palLightShift / 100, 0.05, 1)
      )
    );
  }, [presetColors, recentColors, hsv, palHueShift, palSatShift, palContrast, palLightShift, harmonyMode]);

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Selector de Tipo de Selector de Color */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-lg border"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        {[
          { id: 'wheel' as ColorPickerMode, label: 'Rueda', icon: Circle, title: 'Rueda de Color HSV con cuadro interior' },
          { id: 'square' as ColorPickerMode, label: 'Cuadro', icon: Square, title: 'Cuadro HSB Clásico (estilo Photoshop)' },
          { id: 'triangle' as ColorPickerMode, label: 'Triáng.', icon: Triangle, title: 'Triángulo SV dentro de anillo (estilo Aseprite / Krita)' },
          { id: 'sliders' as ColorPickerMode, label: 'Barras', icon: SlidersHorizontal, title: 'Deslizadores RGB / HSL de precisión + Rampa' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pickerMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPickerMode(item.id)}
              title={item.title}
              className="py-1 px-1 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                color: isActive ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODO 1: RUEDA HSV + CUADRO */}
      {pickerMode === 'wheel' && (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <canvas
            ref={wheelCanvasRef}
            width={192}
            height={192}
            onPointerDown={(e) => {
              isDraggingHue.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              handleWheelPointer(e);
            }}
            onPointerMove={(e) => {
              if (isDraggingHue.current) handleWheelPointer(e);
            }}
            onPointerUp={() => {
              isDraggingHue.current = false;
              handleAddRecentColor(color);
            }}
            className="absolute inset-0 cursor-crosshair"
          />

          <div
            className="w-24 h-24 rounded shadow-lg overflow-hidden border z-10"
            style={{ borderColor: 'var(--studio-border-strong)' }}
          >
            <canvas
              ref={satValCanvasRef}
              width={96}
              height={96}
              onPointerDown={(e) => {
                isDraggingSatVal.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleSatValPointer(e, satValCanvasRef);
              }}
              onPointerMove={(e) => {
                if (isDraggingSatVal.current) handleSatValPointer(e, satValCanvasRef);
              }}
              onPointerUp={() => {
                isDraggingSatVal.current = false;
                handleAddRecentColor(color);
              }}
              className="w-full h-full cursor-crosshair block"
            />
          </div>
        </div>
      )}

      {/* MODO 2: CUADRO HSB CLÁSICO + BARRA DE MATIZ */}
      {pickerMode === 'square' && (
        <div className="flex flex-col gap-2">
          <div
            className="w-full h-36 rounded-lg overflow-hidden border shadow-inner"
            style={{ borderColor: 'var(--studio-border-strong)' }}
          >
            <canvas
              ref={squareCanvasRef}
              width={256}
              height={144}
              onPointerDown={(e) => {
                isDraggingSatVal.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleSatValPointer(e, squareCanvasRef);
              }}
              onPointerMove={(e) => {
                if (isDraggingSatVal.current) handleSatValPointer(e, squareCanvasRef);
              }}
              onPointerUp={() => {
                isDraggingSatVal.current = false;
                handleAddRecentColor(color);
              }}
              className="w-full h-full cursor-crosshair block"
            />
          </div>
          <div
            className="w-full h-4 rounded-md overflow-hidden border"
            style={{ borderColor: 'var(--studio-border-strong)' }}
          >
            <canvas
              ref={hueBarCanvasRef}
              width={256}
              height={16}
              onPointerDown={(e) => {
                isDraggingHue.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleHueBarPointer(e);
              }}
              onPointerMove={(e) => {
                if (isDraggingHue.current) handleHueBarPointer(e);
              }}
              onPointerUp={() => {
                isDraggingHue.current = false;
                handleAddRecentColor(color);
              }}
              className="w-full h-full cursor-ew-resize block"
            />
          </div>
        </div>
      )}

      {/* MODO 3: TRIÁNGULO SV + ANILLO HSV */}
      {pickerMode === 'triangle' && (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <canvas
            ref={wheelCanvasRef}
            width={192}
            height={192}
            onPointerDown={(e) => {
              isDraggingHue.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              handleWheelPointer(e);
            }}
            onPointerMove={(e) => {
              if (isDraggingHue.current) handleWheelPointer(e);
            }}
            onPointerUp={() => {
              isDraggingHue.current = false;
              handleAddRecentColor(color);
            }}
            className="absolute inset-0 cursor-crosshair"
          />
          <canvas
            ref={triCanvasRef}
            width={192}
            height={192}
            onPointerDown={(e) => {
              // Check if click is inside inner radius (inside triangle area); otherwise let hue wheel handle
              const rect = e.currentTarget.getBoundingClientRect();
              const dx = e.clientX - (rect.left + rect.width / 2);
              const dy = e.clientY - (rect.top + rect.height / 2);
              const dist = Math.hypot(dx, dy);
              if (dist <= rect.width / 2 - 18) {
                isDraggingTriangle.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleTrianglePointer(e);
              } else {
                isDraggingHue.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleWheelPointer(e);
              }
            }}
            onPointerMove={(e) => {
              if (isDraggingTriangle.current) handleTrianglePointer(e);
              else if (isDraggingHue.current) handleWheelPointer(e);
            }}
            onPointerUp={() => {
              isDraggingTriangle.current = false;
              isDraggingHue.current = false;
              handleAddRecentColor(color);
            }}
            className="absolute inset-0 cursor-crosshair z-10"
          />
        </div>
      )}

      {/* MODO 4: DESLIZADORES RGB / HSL DE PRECISIÓN */}
      {pickerMode === 'sliders' && (
        <div
          className="flex flex-col gap-2.5 p-2.5 rounded-xl border"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
              Espacio de Color
            </span>
            <div
              className="flex items-center p-0.5 rounded border text-[10px] font-mono"
              style={{
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setSliderSpace('rgb')}
                className="px-2 py-0.5 rounded"
                style={{
                  backgroundColor: sliderSpace === 'rgb' ? 'var(--studio-accent)' : 'transparent',
                  color: sliderSpace === 'rgb' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  fontWeight: sliderSpace === 'rgb' ? 700 : 400,
                }}
              >
                RGB
              </button>
              <button
                type="button"
                onClick={() => setSliderSpace('hsl')}
                className="px-2 py-0.5 rounded"
                style={{
                  backgroundColor: sliderSpace === 'hsl' ? 'var(--studio-accent)' : 'transparent',
                  color: sliderSpace === 'hsl' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  fontWeight: sliderSpace === 'hsl' ? 700 : 400,
                }}
              >
                HSL
              </button>
            </div>
          </div>

          {sliderSpace === 'rgb' ? (
            <div className="flex flex-col gap-2">
              {[
                {
                  label: 'R',
                  val: rgb.r,
                  grad: `linear-gradient(to right, rgb(0,${rgb.g},${rgb.b}), rgb(255,${rgb.g},${rgb.b}))`,
                  onChange: (v: number) => onChangeColor(rgbToHex(v, rgb.g, rgb.b)),
                },
                {
                  label: 'G',
                  val: rgb.g,
                  grad: `linear-gradient(to right, rgb(${rgb.r},0,${rgb.b}), rgb(${rgb.r},255,${rgb.b}))`,
                  onChange: (v: number) => onChangeColor(rgbToHex(rgb.r, v, rgb.b)),
                },
                {
                  label: 'B',
                  val: rgb.b,
                  grad: `linear-gradient(to right, rgb(${rgb.r},${rgb.g},0), rgb(${rgb.r},${rgb.g},255))`,
                  onChange: (v: number) => onChangeColor(rgbToHex(rgb.r, rgb.g, v)),
                },
              ].map((ch) => (
                <StudioSlider
                  key={ch.label}
                  variant="inline"
                  label={ch.label}
                  labelWidthClass="w-4"
                  valueWidthClass="w-8"
                  value={ch.val}
                  min={0}
                  max={255}
                  step={1}
                  trackBackground={ch.grad}
                  hideFill={true}
                  onChange={ch.onChange}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[
                {
                  label: 'H',
                  max: 360,
                  val: Math.round(hsl.h),
                  unit: '°',
                  grad: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                  onChange: (v: number) => {
                    const nextHsv = hslToHsv(v, hsl.s, hsl.l);
                    setHsv(nextHsv);
                    onChangeColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
                  },
                },
                {
                  label: 'S',
                  max: 100,
                  val: Math.round(hsl.s * 100),
                  unit: '%',
                  grad: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${Math.round(hsl.l * 100)}%), hsl(${hsl.h}, 100%, ${Math.round(hsl.l * 100)}%))`,
                  onChange: (v: number) => {
                    const nextHsv = hslToHsv(hsl.h, v / 100, hsl.l);
                    setHsv(nextHsv);
                    onChangeColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
                  },
                },
                {
                  label: 'L',
                  max: 100,
                  val: Math.round(hsl.l * 100),
                  unit: '%',
                  grad: `linear-gradient(to right, #000, hsl(${hsl.h}, ${Math.round(hsl.s * 100)}%, 50%), #fff)`,
                  onChange: (v: number) => {
                    const nextHsv = hslToHsv(hsl.h, hsl.s, v / 100);
                    setHsv(nextHsv);
                    onChangeColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
                  },
                },
              ].map((ch) => (
                <StudioSlider
                  key={ch.label}
                  variant="inline"
                  label={ch.label}
                  labelWidthClass="w-4"
                  valueWidthClass="w-10"
                  value={ch.val}
                  min={0}
                  max={ch.max}
                  step={1}
                  unit={ch.unit}
                  trackBackground={ch.grad}
                  hideFill={true}
                  onChange={ch.onChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rampa Pixel-Art Automática (Sombra Fría ➔ Base ➔ Brillo Cálido) */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
          Rampa de Sombreado (Hue-Shift)
        </span>
        <div className="grid grid-cols-5 gap-1">
          {rampColors.map((rc, i) => (
            <button
              key={`${rc}-${i}`}
              type="button"
              onClick={() => onChangeColor(rc)}
              title={`Tono ${i === 2 ? 'Base' : i < 2 ? 'Sombra' : 'Luz'}: ${rc}`}
              className={`h-4 rounded border transition-transform hover:scale-105 ${
                i === 2 ? 'ring-1 ring-white/70' : 'border-white/15'
              }`}
              style={{ backgroundColor: rc }}
            />
          ))}
        </div>
      </div>

      {/* Alpha (Opacity) Slider with Checkerboard */}
      <StudioSlider
        variant="panel"
        label="Alfa / Opacidad"
        value={Math.round(alpha * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        defaultValue={100}
        checkerboard={true}
        hideFill={true}
        trackBackground={`linear-gradient(to right, transparent, ${color})`}
        onChange={(v) => onChangeAlpha(Math.max(0, Math.min(1, v / 100)))}
      />

      {/* Color Hex & Alpha Preview Bar */}
      <div
        className="flex items-center gap-2 p-2 rounded-xl border"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg canvas-checkerboard overflow-hidden border relative shrink-0"
          style={{ borderColor: 'var(--studio-border-strong)' }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundColor: color,
              opacity: alpha,
            }}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
              HEX
            </span>
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => {
                const v = e.target.value;
                setHexDraft(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  onChangeColor(v);
                }
              }}
              onBlur={() => setHexDraft(color)}
              className="border rounded px-1.5 py-0.5 text-xs font-mono w-20 focus:outline-none uppercase"
              style={{
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />
          </div>
          <span className="text-[9px] font-mono mt-0.5 tabular-nums truncate" style={{ color: 'var(--studio-text-muted)' }}>
            RGBA: {rgb.r}, {rgb.g}, {rgb.b}, {Math.round(alpha * 100)}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleAddRecentColor(color)}
          title="Guardar color en muestras rápidas"
          className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Paleta Activa / Variabilidad Dinámica (Tono, Saturación, Contraste & Armonías) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
            Paleta del Personaje ({presetColors.length})
          </span>
          <button
            type="button"
            onClick={() => setShowPaletteStudio((v) => !v)}
            className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
            style={{
              backgroundColor: showPaletteStudio ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
              color: showPaletteStudio ? 'var(--studio-accent-text)' : 'var(--studio-accent)',
              borderColor: showPaletteStudio ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span>{showPaletteStudio ? 'Cerrar Lab' : 'Variar Paleta'}</span>
          </button>
        </div>

        {showPaletteStudio && (
          <div
            className="p-2.5 rounded-xl border flex flex-col gap-2 text-[10px] font-mono"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--studio-accent)' }}>
                Laboratorio de Variabilidad
              </span>
              <button
                type="button"
                onClick={() => {
                  setPalHueShift(0);
                  setPalSatShift(0);
                  setPalContrast(0);
                  setPalLightShift(0);
                  setHarmonyMode('shift');
                }}
                className="flex items-center gap-1 text-[9px] hover:opacity-80"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Armonías de Color */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'shift' as HarmonyMode, label: 'Paleta' },
                { id: 'complementary' as HarmonyMode, label: 'Complem.' },
                { id: 'analogous' as HarmonyMode, label: 'Análoga' },
                { id: 'triad' as HarmonyMode, label: 'Tríada' },
                { id: 'split' as HarmonyMode, label: 'Split' },
                { id: 'contrast' as HarmonyMode, label: 'Contraste' },
                { id: 'monochrome' as HarmonyMode, label: 'Monocr.' },
              ].map((hm) => (
                <button
                  key={hm.id}
                  type="button"
                  onClick={() => setHarmonyMode(hm.id)}
                  className="py-1 px-1 rounded border text-[9px] truncate transition-colors"
                  style={{
                    backgroundColor: harmonyMode === hm.id ? 'var(--studio-accent)' : 'var(--studio-bg-panel)',
                    color: harmonyMode === hm.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: harmonyMode === hm.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                    fontWeight: harmonyMode === hm.id ? 700 : 500,
                  }}
                >
                  {hm.label}
                </button>
              ))}
            </div>

            {/* Tono / Saturación / Contraste / Brillo */}
            <div className="flex flex-col gap-1.5">
              <StudioSlider
                variant="inline"
                label="Tono"
                labelWidthClass="w-16"
                valueWidthClass="w-11"
                value={palHueShift}
                min={-180}
                max={180}
                step={1}
                unit="°"
                defaultValue={0}
                formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
                onChange={setPalHueShift}
              />

              <StudioSlider
                variant="inline"
                label="Saturac."
                labelWidthClass="w-16"
                valueWidthClass="w-11"
                value={palSatShift}
                min={-100}
                max={100}
                step={1}
                unit="%"
                defaultValue={0}
                formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
                onChange={setPalSatShift}
              />

              <StudioSlider
                variant="inline"
                label="Contraste"
                labelWidthClass="w-16"
                valueWidthClass="w-11"
                value={palContrast}
                min={-80}
                max={100}
                step={1}
                unit="%"
                defaultValue={0}
                formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
                onChange={setPalContrast}
              />

              <StudioSlider
                variant="inline"
                label="Brillo"
                labelWidthClass="w-16"
                valueWidthClass="w-11"
                value={palLightShift}
                min={-45}
                max={45}
                step={1}
                unit="%"
                defaultValue={0}
                formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
                onChange={setPalLightShift}
              />
            </div>

            {/* Live Varied Palette Swatch Preview */}
            <div className="grid grid-cols-8 gap-1 p-1.5 rounded-lg border" style={{ backgroundColor: 'var(--studio-bg-panel)', borderColor: 'var(--studio-border)' }}>
              {variedPalette.slice(0, 32).map((col, idx) => (
                <button
                  key={`var-${col}-${idx}`}
                  type="button"
                  onClick={() => onChangeColor(col)}
                  title={`Usar color ${col}`}
                  className="h-4 rounded border border-white/15 hover:scale-110 transition-transform"
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>

            {onApplyPalette && (
              <button
                type="button"
                onClick={() => onApplyPalette(variedPalette)}
                className="w-full py-1.5 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--studio-accent)',
                  color: 'var(--studio-accent-text)',
                }}
              >
                <Check className="w-3 h-3" />
                <span>Aplicar Variación a Paleta Activa</span>
              </button>
            )}
          </div>
        )}

        {presetColors.length > 0 && (
          <div
            className="grid grid-cols-8 gap-1 p-2 rounded-xl border max-h-24 overflow-y-auto"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {presetColors.map((col, idx) => (
              <button
                key={`preset-${col}-${idx}`}
                type="button"
                onClick={() => onChangeColor(col)}
                title={col}
                className={`h-5 rounded border transition-transform hover:scale-110 ${
                  col.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-amber-400 border-white' : 'border-white/10'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Muestrario Rápido */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
          Muestrario Rápido
        </span>
        <div
          className="grid grid-cols-7 gap-1.5 p-2 rounded-xl border"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {recentColors.map((col, idx) => (
            <button
              key={`${col}-${idx}`}
              type="button"
              onClick={() => onChangeColor(col)}
              title={col}
              className="h-6 rounded border border-white/10 hover:scale-105 transition-transform"
              style={{ backgroundColor: col }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
