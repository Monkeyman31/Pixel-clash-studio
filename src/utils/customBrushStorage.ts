import { BrushSettings, BrushShape, BrushTextureType } from '../types';

export interface CustomBrushPreset {
  id: string;
  name: string;
  desc: string;
  settings: Partial<BrushSettings>;
  enableDither?: boolean;
  previewDataUrl?: string;
  importedAt: number;
}

const STORAGE_KEY = 'pixelclash_custom_brushes_v1';

export function loadCustomBrushPresets(): CustomBrushPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomBrushPresets(presets: CustomBrushPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, 48)));
  } catch {
    // ignore storage quota
  }
}

export async function parseBrushFromFile(file: File): Promise<CustomBrushPreset> {
  const lower = file.name.toLowerCase();
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Pincel Importado';

  // 1. JSON / .pcsbrush preset file
  if (lower.endsWith('.json') || lower.endsWith('.pcsbrush')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const settings: Partial<BrushSettings> = parsed.settings || parsed;
    return {
      id: `custom-brush-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: parsed.name || baseName,
      desc: parsed.desc || 'Pincel importado (.pcsbrush)',
      settings: {
        size: Math.max(1, Math.min(32, Number(settings.size) || 4)),
        shape: (settings.shape as BrushShape) || 'circle',
        spacing: Math.max(1, Math.min(8, Number(settings.spacing) || 1)),
        hardness: Math.max(0.05, Math.min(1, Number(settings.hardness ?? 1))),
        opacity: Math.max(0.05, Math.min(1, Number(settings.opacity ?? 1))),
        flow: Math.max(0.05, Math.min(1, Number(settings.flow ?? 1))),
        texture: (settings.texture as BrushTextureType) || 'none',
        textureStrength: Number(settings.textureStrength ?? 50),
        stabilizer: Number(settings.stabilizer ?? 0),
        pixelPerfect: Boolean(settings.pixelPerfect),
        airbrushMode: Boolean(settings.airbrushMode),
        smearEnabled: Boolean(settings.smearEnabled),
        celShadeEnabled: Boolean(settings.celShadeEnabled),
      },
      enableDither: Boolean(parsed.enableDither),
      importedAt: Date.now(),
    };
  }

  // 2. Image brush tip (.png, .jpg, .webp) — analyze silhouette & texture into an authentic brush preset
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen del pincel.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen de pincel inválida.'));
      img.onload = () => {
        const sampleSize = 16;
        const c = document.createElement('canvas');
        c.width = sampleSize;
        c.height = sampleSize;
        const ctx = c.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la punta del pincel.'));
          return;
        }
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

        let opaqueCount = 0;
        let cornerOpaque = 0;
        let semiTransparent = 0;
        let diagonalBias = 0;

        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const idx = (y * sampleSize + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 20) {
              opaqueCount++;
              if (alpha < 220) semiTransparent++;
              if ((x < 3 || x >= sampleSize - 3) && (y < 3 || y >= sampleSize - 3)) {
                cornerOpaque++;
              }
              if (Math.abs(x - y) <= 2) diagonalBias++;
            }
          }
        }

        const total = sampleSize * sampleSize;
        const fillRatio = opaqueCount / total;
        const softnessRatio = opaqueCount > 0 ? semiTransparent / opaqueCount : 0;

        let shape: BrushShape = 'circle';
        if (fillRatio < 0.25) shape = 'spray';
        else if (cornerOpaque > 18) shape = 'square';
        else if (diagonalBias / Math.max(1, opaqueCount) > 0.45 && fillRatio < 0.55) shape = 'slash_right';
        else if (fillRatio < 0.55) shape = 'diamond';

        const texture: BrushTextureType =
          fillRatio < 0.4 ? 'dots' : softnessRatio > 0.35 ? 'noise' : fillRatio < 0.72 ? 'paper' : 'none';
        const derivedSize = Math.max(2, Math.min(24, Math.round(Math.max(img.naturalWidth, img.naturalHeight) / 4)));
        const hardness = Number(Math.max(0.25, Math.min(1, 1 - softnessRatio * 0.75)).toFixed(2));

        resolve({
          id: `custom-brush-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: baseName.slice(0, 24),
          desc: `Importado (${img.naturalWidth}×${img.naturalHeight}px · ${shape})`,
          previewDataUrl: dataUrl,
          settings: {
            size: derivedSize,
            shape,
            spacing: shape === 'spray' ? 2 : 1,
            hardness,
            opacity: hardness < 0.7 ? 0.85 : 1,
            flow: hardness < 0.7 ? 0.7 : 1,
            texture,
            textureStrength: texture === 'none' ? 0 : 45,
            airbrushMode: shape === 'spray',
            pixelPerfect: derivedSize <= 2 && hardness >= 0.9,
            smearEnabled: false,
            celShadeEnabled: false,
          },
          importedAt: Date.now(),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
